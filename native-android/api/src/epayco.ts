import { createHash, timingSafeEqual } from "node:crypto";
import { config } from "./config.ts";

/**
 * Integración con ePayco (checkout estándar).
 *
 * Flujo:
 *   1. POST /api/pedidos crea el pedido y un `pago` pendiente con nuestra
 *      `referencia` (la `invoice` de ePayco).
 *   2. La app abre en una Custom Tab GET /api/pagos/epayco/checkout/:referencia,
 *      una página mínima que lanza el checkout.js de ePayco con esos datos.
 *   3. ePayco llama a la URL de CONFIRMACIÓN (servidor a servidor). Esa es la
 *      única fuente de verdad: se verifica la firma y el monto, y se actualiza
 *      el pago. La URL de RESPUESTA solo enseña "vuelve a la app".
 *   4. La app consulta el estado del pedido.
 *
 * La firma de la confirmación es
 *   sha256(p_cust_id_cliente ^ p_key ^ x_ref_payco ^ x_transaction_id ^ x_amount ^ x_currency_code)
 * con `^` como separador literal. Confírmala en la documentación de ePayco
 * al activar la cuenta de producción.
 */

export interface ConfirmacionEpayco {
  x_ref_payco?: string;
  x_transaction_id?: string;
  x_amount?: string;
  x_currency_code?: string;
  x_signature?: string;
  x_cod_response?: string;
  x_id_invoice?: string;
  x_franchise?: string;
  [clave: string]: unknown;
}

export function firmaValida(d: ConfirmacionEpayco): boolean {
  const { custId, pKey } = config.epayco;
  if (!custId || !pKey || !d.x_signature) return false;
  const esperada = createHash("sha256")
    .update([custId, pKey, d.x_ref_payco, d.x_transaction_id, d.x_amount, d.x_currency_code].join("^"))
    .digest("hex");
  const recibida = String(d.x_signature).toLowerCase();
  return recibida.length === esperada.length && timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada));
}

/**
 * x_cod_response de ePayco -> estado_pago.
 * 1 Aceptada · 2 Rechazada · 3 Pendiente · 4 Fallida · 6 Reversada ·
 * 7 Retenida · 8 Iniciada · 9 Expirada · 10 Abandonada · 11 Cancelada · 12 Antifraude
 */
export function estadoDesdeEpayco(codigo: string | undefined) {
  switch (codigo) {
    case "1": return "aprobado" as const;
    case "2": case "11": case "12": return "rechazado" as const;
    case "4": case "9": case "10": return "fallido" as const;
    case "6": return "reversado" as const;
    default: return "pendiente" as const;
  }
}

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Marco común de las páginas que ve el comprador: la misma línea gráfica que la app. */
export function paginaSimple(titulo: string, cuerpo: string, script = "") {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)} · iwantmyphone</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;color:#111;
       font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-weight:300;letter-spacing:.01em}
  main{max-width:420px;padding:32px 20px;text-align:center}
  .marca{font-size:12px;letter-spacing:.42em;text-transform:uppercase;padding-bottom:28px;border-bottom:1px solid #e8e8e8}
  .marca b{color:#a52b34;font-weight:400}
  h1{font-weight:300;font-size:24px;margin:32px 0 12px}
  p{color:#4a4a4a;line-height:1.6;margin:0 0 12px}
  .label{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8f8f8f}
  button{margin-top:24px;padding:16px 40px;border:1px solid #2f5bff;background:#fff;color:#2f5bff;font:inherit;
         font-size:11px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer}
  button:active{background:#2f5bff;color:#fff}
</style></head>
<body><main><div class="marca"><b>&#9829;</b> iWantMyPhone</div>${cuerpo}</main>${script}</body></html>`;
}

export interface DatosCheckout {
  referencia: string;
  descripcion: string;
  monto: number;
  moneda: string;
  cliente: { nombre: string; email: string; documento: string | null; telefono: string; direccion: string };
}

/** Página que abre el checkout de ePayco. Solo lleva la llave PÚBLICA. */
export function paginaCheckout(d: DatosCheckout) {
  const datos = {
    name: "iwantmyphone",
    description: d.descripcion,
    invoice: d.referencia,
    currency: d.moneda.toLowerCase(),
    amount: d.monto.toFixed(2),
    tax_base: "0",
    tax: "0",
    country: "co",
    lang: "es",
    external: "false",
    confirmation: `${config.publicUrl}/api/pagos/epayco/confirmacion`,
    response: `${config.publicUrl}/api/pagos/epayco/respuesta`,
    name_billing: d.cliente.nombre,
    email_billing: d.cliente.email,
    mobilephone_billing: d.cliente.telefono,
    address_billing: d.cliente.direccion,
    ...(d.cliente.documento ? { type_doc_billing: "cc", number_doc_billing: d.cliente.documento } : {}),
  };
  // JSON dentro de <script>: se escapa "<" para que nadie cierre la etiqueta.
  const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

  const cuerpo = `
    <h1>Pago seguro</h1>
    <p class="label">Pedido ${escapar(d.referencia)}</p>
    <p>${escapar(d.descripcion)}</p>
    <p class="label">Total ${escapar(d.moneda)} ${d.monto.toFixed(2)}</p>
    <button id="pagar" type="button">Pagar con ePayco</button>`;

  const script = `
<script src="https://checkout.epayco.co/checkout.js"></script>
<script>
  var handler = ePayco.checkout.configure({ key: ${json(config.epayco.publicKey)}, test: ${config.epayco.test} });
  var datos = ${json(datos)};
  function abrir() { handler.open(datos); }
  document.getElementById("pagar").addEventListener("click", abrir);
  window.addEventListener("load", abrir);
</script>`;

  return paginaSimple("Pago seguro", cuerpo, script);
}
