import express, { Router, type Request, type Response } from "express";
import { epaycoConfigurado } from "../config.ts";
import { query, queryOne, transaccion } from "../db.ts";
import { estadoDesdeEpayco, firmaValida, paginaCheckout, paginaSimple, type ConfirmacionEpayco } from "../epayco.ts";

/**
 * Endpoints de ePayco. No usan el sobre JSON: los dos primeros son páginas
 * para el navegador del comprador y la confirmación es para el servidor de
 * ePayco, que solo necesita un 200.
 */
export const pagosRouter = Router();

/**
 * GET /api/pagos/epayco/checkout/:referencia — la página que la app abre en
 * una Custom Tab. La referencia es aleatoria y no adivinable, así que la URL
 * funciona como permiso: no hace falta enviar el token de sesión al navegador.
 */
pagosRouter.get("/epayco/checkout/:referencia", async (req, res) => {
  const referencia = String(req.params.referencia);
  const pago = await queryOne<{
    estado: string; monto: number; moneda: string; numero: number; pedido_estado: string; num_productos: number;
    cliente_nombre: string; cliente_email: string; cliente_documento: string | null; cliente_telefono: string; direccion_entrega: string;
  }>(
    `SELECT pg.estado, pg.monto, pg.moneda, p.numero, p.estado AS pedido_estado,
            (SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id) AS num_productos,
            p.cliente_nombre, p.cliente_email, p.cliente_documento, p.cliente_telefono,
            p.direccion_entrega || ', ' || p.ciudad_entrega AS direccion_entrega
     FROM pagos pg JOIN pedidos p ON p.id = pg.pedido_id
     WHERE pg.referencia = $1`,
    [referencia],
  );

  res.type("html");
  if (!pago) {
    res.status(404).send(paginaSimple("Pago no encontrado", "<h1>Pago no encontrado</h1><p>El enlace no es válido. Vuelve a la app.</p>"));
    return;
  }
  if (!epaycoConfigurado) {
    res.status(503).send(paginaSimple("Pasarela no disponible", "<h1>Pasarela no disponible</h1><p>Inténtalo más tarde.</p>"));
    return;
  }
  if (pago.estado !== "pendiente" || pago.pedido_estado === "cancelado") {
    res.send(
      paginaSimple(
        "Pago ya procesado",
        `<h1>Este pago ya se procesó</h1><p class="label">Estado: ${pago.estado}</p><p>Vuelve a la app para ver tu pedido.</p>`,
      ),
    );
    return;
  }

  res.send(
    paginaCheckout({
      referencia,
      descripcion: `Pedido #${pago.numero} · ${pago.num_productos} producto${pago.num_productos === 1 ? "" : "s"}`,
      monto: pago.monto,
      moneda: pago.moneda,
      cliente: {
        nombre: pago.cliente_nombre,
        email: pago.cliente_email,
        documento: pago.cliente_documento,
        telefono: pago.cliente_telefono,
        direccion: pago.direccion_entrega,
      },
    }),
  );
});

/**
 * Confirmación servidor a servidor de ePayco (GET o POST, form o JSON).
 * ÚNICA fuente de verdad del estado del pago:
 *   1. firma válida (si no, 400),
 *   2. la referencia existe (si no, 404),
 *   3. el monto y la moneda coinciden con los del pago (si no, se guarda la
 *      respuesta para auditoría y el pago NO se aprueba),
 *   4. idempotente: un pago aprobado solo cambia si llega un reverso.
 */
async function confirmacion(req: Request, res: Response) {
  const datos = { ...(req.query as Record<string, unknown>), ...((req.body ?? {}) as Record<string, unknown>) } as ConfirmacionEpayco;

  if (!firmaValida(datos)) {
    console.warn("[epayco] confirmación con firma inválida", { ref: datos.x_ref_payco, invoice: datos.x_id_invoice });
    res.status(400).type("text").send("firma invalida");
    return;
  }

  const referencia = String(datos.x_id_invoice ?? "");
  const resultado = await transaccion(async (cx) => {
    const pago = await queryOne<{ id: string; pedido_id: string; estado: string; monto: number; moneda: string }>(
      "SELECT id, pedido_id, estado, monto, moneda FROM pagos WHERE referencia = $1 FOR UPDATE",
      [referencia],
      cx,
    );
    if (!pago) return "no-encontrado" as const;

    const montoOk = Math.round(Number(datos.x_amount) * 100) === Math.round(pago.monto * 100);
    const monedaOk = String(datos.x_currency_code ?? "").toUpperCase() === pago.moneda.toUpperCase();
    let nuevo = estadoDesdeEpayco(datos.x_cod_response);

    if (!montoOk || !monedaOk) {
      console.error("[epayco] monto o moneda no coinciden: el pago no se aprueba", { referencia, x_amount: datos.x_amount, x_currency_code: datos.x_currency_code });
      nuevo = pago.estado === "aprobado" ? "aprobado" : "fallido";
    }
    if (pago.estado === "aprobado" && nuevo !== "reversado") nuevo = "aprobado";

    // Otro intento del mismo pedido ya está aprobado: cobro doble, a revisar a mano.
    if (nuevo === "aprobado" && pago.estado !== "aprobado") {
      const otro = await queryOne("SELECT 1 FROM pagos WHERE pedido_id = $1 AND estado = 'aprobado' AND id <> $2", [pago.pedido_id, pago.id], cx);
      if (otro) {
        console.error("[epayco] pedido ya pagado con otro intento: REVISAR REEMBOLSO", { referencia });
        nuevo = "fallido";
      }
    }

    await query(
      `UPDATE pagos SET estado = $2, referencia_pasarela = COALESCE($3, referencia_pasarela),
              medio = COALESCE($4, medio), respuesta = $5, updated_at = now()
       WHERE id = $1`,
      [pago.id, nuevo, datos.x_ref_payco ?? null, datos.x_franchise ?? null, JSON.stringify(datos)],
      cx,
    );

    if (nuevo === "aprobado" && pago.estado !== "aprobado") {
      await query(
        `UPDATE pedidos SET pagado_at = now(), updated_at = now(),
                estado = CASE WHEN estado = 'pendiente' THEN 'confirmado'::estado_pedido ELSE estado END
         WHERE id = $1`,
        [pago.pedido_id],
        cx,
      );
    } else if (nuevo === "reversado" && pago.estado === "aprobado") {
      await query("UPDATE pedidos SET pagado_at = NULL, updated_at = now() WHERE id = $1", [pago.pedido_id], cx);
    }
    return nuevo;
  });

  if (resultado === "no-encontrado") {
    res.status(404).type("text").send("referencia desconocida");
    return;
  }
  res.status(200).type("text").send("ok");
}

const formulario = express.urlencoded({ extended: false, limit: "64kb" });
pagosRouter.post("/epayco/confirmacion", formulario, confirmacion);
pagosRouter.get("/epayco/confirmacion", confirmacion);

/**
 * URL de respuesta: adonde vuelve el navegador al terminar en ePayco. Solo
 * informa: el estado real lo fija la confirmación, y la app lo consulta.
 */
pagosRouter.get("/epayco/respuesta", (_req, res) => {
  res.type("html").send(
    paginaSimple(
      "Pago en proceso",
      `<h1>Gracias por tu compra</h1>
       <p>Estamos confirmando el pago con ePayco. Vuelve a la app: tu pedido se actualizará en unos segundos.</p>
       <button type="button" onclick="window.close()">Volver a la app</button>`,
    ),
  );
});
