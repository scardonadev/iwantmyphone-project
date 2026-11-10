/**
 * Prueba de punta a punta contra la BD de .env:  npm run smoke
 *
 * Levanta la app en un puerto libre (no hace falta `npm run dev`), recorre
 * los flujos de la API y borra al terminar todo lo que creó (usuarios
 * smoke+…@example.com, sus pedidos y los productos de prueba).
 *
 * Fija llaves de ePayco FALSAS si no hay reales, para probar el checkout y la
 * firma de la confirmación sin salir a internet.
 */
import { createHash, createHmac, generateKeyPairSync, sign } from "node:crypto";
import type { AddressInfo } from "node:net";

process.env.EPAYCO_P_CUST_ID_CLIENTE ||= "smoke-cust";
process.env.EPAYCO_P_KEY ||= "smoke-p-key";
process.env.EPAYCO_PUBLIC_KEY ||= "smoke-public-key";

const { crearApp } = await import("../src/app.ts");
const { pool } = await import("../src/db.ts");
const { config } = await import("../src/config.ts");

const servidor = crearApp().listen(0);
await new Promise((r) => servidor.once("listening", r));
const BASE = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;

// ---------------------------------------------------------------- mini framework

let fallos = 0;
let pasos = 0;
function check(nombre: string, condicion: unknown, detalle?: unknown) {
  pasos++;
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.log(`  FAIL ${nombre}`, detalle === undefined ? "" : JSON.stringify(detalle).slice(0, 400));
  }
}

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
async function api(metodo: string, ruta: string, opciones: { token?: string; body?: unknown; form?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {};
  if (opciones.token) headers.authorization = `Bearer ${opciones.token}`;
  let body: string | undefined;
  if (opciones.form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opciones.form).toString();
  } else if (opciones.body !== undefined) {
    headers["content-type"] = "application/json";
    body = typeof opciones.body === "string" ? opciones.body : JSON.stringify(opciones.body);
  }
  const r = await fetch(`${BASE}${ruta}`, { method: metodo, headers, body });
  const texto = await r.text();
  let json: Json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    json = texto;
  }
  return { status: r.status, json, texto };
}

const seccion = (t: string) => console.log(`\n${t}`);
const sufijo = Date.now().toString(36);
const emailSmoke = (n: string) => `smoke+${n}-${sufijo}@example.com`;
const creados = { celulares: [] as string[] };

try {
  // ---------------------------------------------------------------- Catálogo público
  seccion("Catálogo público");
  let r = await api("GET", "/salud");
  check("salud 200", r.status === 200, r.json);

  r = await api("GET", "/home");
  check("home: 4 banners, 8 últimos, promociones y más vendidos", r.json.data?.banners.length === 4 && r.json.data.ultimos.length === 8 && r.json.data.promociones.length > 0 && r.json.data.mas_vendidos.length > 0, r.json);
  check("home: un anónimo no ve costo", r.json.data.ultimos.every((c: Json) => !("costo" in c)));

  r = await api("GET", "/celulares?limit=5");
  check("listado: 52 en total, paginado", r.json.meta?.total === 52 && r.json.data.length === 5 && r.json.meta.hasNextPage, r.json.meta);
  check("listado: precio es number y precio_final aplica descuento", typeof r.json.data[0].precio === "number" && r.json.data.every((c: Json) => c.precio_final <= c.precio));
  const primero = r.json.data[0];

  r = await api("GET", `/celulares?q=${encodeURIComponent("pro max")}`);
  check("búsqueda q=pro max", r.json.data.length > 0 && r.json.data.every((c: Json) => /pro max/i.test(c.nombre)), r.json.data.map((c: Json) => c.nombre));

  r = await api("GET", `/celulares?filter=${encodeURIComponent('{"especificaciones":{"ram":"12 GB"}}')}`);
  check("filter anidado ram=12 GB -> 2", r.json.meta?.total === 2, r.json.meta);
  r = await api("GET", `/celulares?filter=${encodeURIComponent('{"sistema_op":"iOS_"}')}`);
  check("filter escapa _ (iOS_ -> 0)", r.json.meta?.total === 0, r.json.meta);
  r = await api("GET", "/celulares?filter={malo");
  check("filter JSON inválido -> 400", r.status === 400);
  r = await api("GET", `/celulares?filter=${encodeURIComponent('{"precio":"1"}')}`);
  check("filter key fuera de whitelist -> 400", r.status === 400 && r.json.error.details.permitidos);

  r = await api("GET", "/celulares?promocion=true&limit=50");
  check("promocion=true -> 9 con descuento", r.json.meta.total === 9 && r.json.data.every((c: Json) => c.descuento_pct > 0), r.json.meta);
  r = await api("GET", "/celulares?orden=precio_asc&limit=50");
  const precios = r.json.data.map((c: Json) => c.precio_final);
  check("orden=precio_asc ordena por precio final", precios.every((p: number, i: number) => i === 0 || p >= precios[i - 1]));

  r = await api("GET", `/celulares/${primero.id}`);
  check("detalle: 7 especificaciones en orden y valoración", r.json.data.especificaciones.length === 7 && r.json.data.especificaciones[0].key === "procesador" && typeof r.json.data.valoracion === "number", r.json);
  check("detalle: descripción generada", typeof r.json.data.descripcion === "string" && r.json.data.descripcion.length > 40);
  r = await api("GET", "/celulares/no-es-uuid");
  check("detalle id no-UUID -> 400", r.status === 400);
  r = await api("GET", "/celulares/00000000-0000-4000-8000-000000000000");
  check("detalle inexistente -> 404", r.status === 404);
  r = await api("GET", `/celulares/${primero.id}/sugeridos`);
  check("sugeridos -> 5 sin el de referencia", r.json.data.length === 5 && r.json.data.every((c: Json) => c.id !== primero.id));
  r = await api("GET", "/especificaciones/opciones");
  check("opciones: 7 claves", r.json.data.options.length === 7);
  r = await api("GET", `/comentarios?celular_id=${primero.id}`);
  check("comentarios paginados", Array.isArray(r.json.data) && r.json.meta);
  r = await api("GET", "/ruta-que-no-existe");
  check("ruta desconocida -> 404 con sobre", r.status === 404 && r.json.success === false);
  r = await api("POST", "/auth/login", { body: "{malo" });
  check("JSON mal formado -> 400", r.status === 400 && r.json.error.code === "BAD_REQUEST");

  // ---------------------------------------------------------------- Login
  seccion("Login y roles");
  const login = async (email: string, password: string) => (await api("POST", "/auth/login", { body: { email, password } })).json.data;
  const admin = await login("admin@iwantmyphone.dev", "Admin1234");
  const vendedor = await login("vendedor@iwantmyphone.dev", "Vendedor1234");
  const visitante = await login("visitante@iwantmyphone.dev", "Visitante1234");
  check("login de los 3 roles", admin?.access_token && vendedor?.access_token && visitante?.access_token);
  check("login devuelve rol y permisos", admin.usuario.rol === "administrador" && admin.usuario.permisos.includes("costos:ver") && !("password_hash" in admin.usuario));
  r = await api("POST", "/auth/login", { body: { email: "admin@iwantmyphone.dev", password: "otra-cosa" } });
  const r2 = await api("POST", "/auth/login", { body: { email: "nadie@example.com", password: "otra-cosa" } });
  check("contraseña errónea y correo inexistente -> mismo 401", r.status === 401 && r2.status === 401 && r.json.error.message === r2.json.error.message);
  r = await api("POST", "/auth/login", { body: { email: "no-es-correo" } });
  check("login con formato inválido -> 400 con campos", r.status === 400 && r.json.error.details.campos.email && r.json.error.details.campos.password);
  r = await api("GET", "/auth/yo", { token: admin.access_token });
  check("GET /auth/yo", r.status === 200 && r.json.data.email === "admin@iwantmyphone.dev");
  r = await api("GET", "/auth/yo", { token: admin.refresh_token });
  check("un refresh token no abre la API -> 401", r.status === 401);
  r = await api("POST", "/auth/refresh", { body: { refresh_token: admin.refresh_token } });
  check("refresh -> par nuevo", r.status === 200 && r.json.data.access_token);
  r = await api("POST", "/auth/refresh", { body: { refresh_token: admin.access_token } });
  check("refresh con access token -> 401", r.status === 401);

  r = await api("GET", "/celulares?limit=3", { token: admin.access_token });
  check("administrador ve costo en el listado", r.json.data.every((c: Json) => typeof c.costo === "number"));
  r = await api("GET", "/celulares?limit=3", { token: vendedor.access_token });
  check("vendedor NO ve costo", r.json.data.every((c: Json) => !("costo" in c)));
  r = await api("GET", "/celulares?limit=3", { token: "token-basura" });
  check("lectura pública con token inválido no falla", r.status === 200);

  // ---------------------------------------------------------------- Registro + huella
  seccion("Registro con huella");
  const par = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKey = par.publicKey.export({ format: "der", type: "spki" }).toString("base64");
  const emailNuevo = emailSmoke("cliente");

  r = await api("POST", "/auth/registro", { body: { email: emailNuevo, nombre: "Smoke", password: "Clave1234" } });
  check("registro sin huella -> 400 campos.biometria", r.status === 400 && r.json.error.details.campos.biometria, r.json);
  r = await api("POST", "/auth/registro", { body: { email: emailNuevo, nombre: "Smoke", password: "Clave1234", biometria: { dispositivo: "Pixel", public_key: "AAAA" } } });
  check("registro con clave pública inválida -> 400", r.status === 400 && r.json.error.details.campos["biometria.public_key"], r.json);
  r = await api("POST", "/auth/registro", {
    body: { email: emailNuevo.toUpperCase(), nombre: "Smoke Cliente", password: "Clave1234", biometria: { dispositivo: "Pixel 8 de prueba", public_key: publicKey } },
  });
  check("registro con huella -> 201 visitante con sesión", r.status === 201 && r.json.data.usuario.rol === "visitante" && r.json.data.access_token && r.json.data.credencial_biometrica_id, r.json);
  const cliente = r.json.data;
  check("el correo se guarda en minúsculas", cliente.usuario.email === emailNuevo);
  r = await api("POST", "/auth/registro", { body: { email: emailNuevo, nombre: "Otra", password: "Clave1234", biometria: { dispositivo: "x", public_key: publicKey } } });
  check("registro duplicado -> 409", r.status === 409);

  r = await api("POST", "/auth/biometria/reto", { body: { credencial_id: cliente.credencial_biometrica_id } });
  const reto = r.json.data.reto as string;
  const firma = sign("sha256", Buffer.from(reto, "utf8"), par.privateKey).toString("base64");
  r = await api("POST", "/auth/biometria/login", { body: { credencial_id: cliente.credencial_biometrica_id, reto, firma } });
  check("login con huella (firma ECDSA del reto) -> 200", r.status === 200 && r.json.data.usuario.email === emailNuevo, r.json);
  r = await api("POST", "/auth/biometria/login", { body: { credencial_id: cliente.credencial_biometrica_id, reto, firma } });
  check("el mismo reto no sirve dos veces -> 401", r.status === 401);
  const otroPar = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const reto2 = (await api("POST", "/auth/biometria/reto", { body: { credencial_id: cliente.credencial_biometrica_id } })).json.data.reto;
  r = await api("POST", "/auth/biometria/login", { body: { credencial_id: cliente.credencial_biometrica_id, reto: reto2, firma: sign("sha256", Buffer.from(reto2), otroPar.privateKey).toString("base64") } });
  check("firma con otra clave -> 401", r.status === 401);

  // ---------------------------------------------------------------- Recuperación
  seccion("Recuperación de contraseña");
  r = await api("POST", "/auth/recuperacion", { body: { email: emailNuevo } });
  const r3 = await api("POST", "/auth/recuperacion", { body: { email: "nadie@example.com" } });
  check("misma respuesta exista o no el correo", r.status === 200 && r3.status === 200 && r.json.data.mensaje === r3.json.data.mensaje);
  // El código real solo viaja por correo: se sustituye su hash por uno conocido.
  const codigo = "123456";
  await pool.query(
    `UPDATE recuperaciones_password SET codigo_hash = $2
     WHERE id = (SELECT id FROM recuperaciones_password WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 1)`,
    [cliente.usuario.id, createHmac("sha256", config.jwt.refreshSecret).update(`${cliente.usuario.id}:${codigo}`).digest("hex")],
  );
  r = await api("POST", "/auth/recuperacion/confirmar", { body: { email: emailNuevo, codigo: "000000", password: "NuevaClave99" } });
  check("código erróneo -> 400", r.status === 400);
  r = await api("POST", "/auth/recuperacion/confirmar", { body: { email: emailNuevo, codigo, password: "NuevaClave99" } });
  check("código correcto -> 200", r.status === 200, r.json);
  r = await api("POST", "/auth/recuperacion/confirmar", { body: { email: emailNuevo, codigo, password: "OtraClave99" } });
  check("el código no sirve dos veces", r.status === 400);
  check("login con la contraseña nueva", (await login(emailNuevo, "NuevaClave99"))?.access_token);

  // ---------------------------------------------------------------- Perfil
  seccion("Favoritos y direcciones");
  const tk = cliente.access_token as string;
  r = await api("PUT", `/favoritos/${primero.id}`, { token: tk });
  await api("PUT", `/favoritos/${primero.id}`, { token: tk });
  check("marcar favorito (idempotente)", r.status === 200);
  r = await api("GET", "/favoritos", { token: tk });
  check("listar favoritos", r.json.data.length === 1 && r.json.data[0].id === primero.id);
  r = await api("GET", `/celulares/${primero.id}`, { token: tk });
  check("detalle con sesión trae es_favorito", r.json.data.es_favorito === true);
  r = await api("GET", "/favoritos");
  check("favoritos sin sesión -> 401", r.status === 401);
  r = await api("POST", "/direcciones", { token: tk, body: { alias: "Casa" } });
  check("dirección incompleta -> 400 con todos los campos", r.status === 400 && Object.keys(r.json.error.details.campos).length === 4, r.json);
  r = await api("POST", "/direcciones", {
    token: tk,
    body: { alias: "Casa", direccion: "Calle 10 # 43-12", ciudad: "Medellín", departamento: "Antioquia", telefono: "300 123 4567" },
  });
  check("crear dirección", r.status === 201);
  const direccionId = r.json.data.id;
  r = await api("GET", "/direcciones", { token: visitante.access_token });
  check("cada uno ve solo sus direcciones", r.json.data.every((d: Json) => d.id !== direccionId));

  // ---------------------------------------------------------------- Compra
  seccion("Compra");
  r = await api("GET", "/metodos-pago");
  const contraentrega = r.json.data.find((m: Json) => m.codigo === "contraentrega");
  const epayco = r.json.data.find((m: Json) => m.codigo === "epayco");
  check("métodos de pago: contraentrega y ePayco", contraentrega && epayco, r.json.data);

  const enPromo = (await api("GET", "/celulares?promocion=true&limit=1")).json.data[0];
  r = await api("POST", "/pedidos", {
    token: tk,
    body: { direccion_id: direccionId, metodo_pago_id: contraentrega.id, items: [{ celular_id: enPromo.id, cantidad: 2 }, { celular_id: primero.id, cantidad: 1 }, { celular_id: enPromo.id, cantidad: 1 }] },
  });
  check("pedido contraentrega -> 201", r.status === 201, r.json);
  const pedido = r.json.data;
  const esperado = Math.round((enPromo.precio_final * 3 + primero.precio_final) * 100) / 100;
  check("líneas repetidas se suman y el total sale de la BD", pedido.items.length === 2 && pedido.num_productos === 4 && Math.abs(pedido.total - esperado) < 0.02, { total: pedido.total, esperado });
  check("el comprador no ve costo ni utilidad", !("utilidad" in pedido) && pedido.items.every((i: Json) => !("costo_unitario" in i)));
  check("contraentrega no crea pago", pedido.pagos.length === 0 && pedido.estado === "pendiente");

  r = await api("POST", "/pedidos", { token: tk, body: { direccion_id: direccionId, metodo_pago_id: contraentrega.id, items: [] } });
  check("carrito vacío -> 400", r.status === 400);
  r = await api("POST", "/pedidos", { token: visitante.access_token, body: { direccion_id: direccionId, metodo_pago_id: contraentrega.id, items: [{ celular_id: primero.id, cantidad: 1 }] } });
  check("dirección de otro usuario -> 400", r.status === 400 && r.json.error.details.campos.direccion_id);
  r = await api("POST", "/pedidos", { body: { items: [] } });
  check("comprar sin sesión -> 401", r.status === 401);

  r = await api("GET", "/pedidos/mios", { token: tk });
  check("mis compras", r.json.data.length === 1 && r.json.data[0].id === pedido.id);
  r = await api("GET", `/pedidos/mios/${pedido.id}`, { token: visitante.access_token });
  check("pedido ajeno en mis compras -> 404", r.status === 404);

  seccion("ePayco");
  r = await api("POST", "/pedidos", { token: tk, body: { direccion_id: direccionId, metodo_pago_id: epayco.id, items: [{ celular_id: primero.id, cantidad: 1 }] } });
  const pedidoEp = r.json.data;
  const pago = pedidoEp.pagos[0];
  check("pedido ePayco crea un pago pendiente con checkout_url", r.status === 201 && pago?.estado === "pendiente" && pago.checkout_url, r.json);
  const pagina = await fetch(pago.checkout_url.replace(config.publicUrl, BASE.replace(/\/api$/, "")));
  const html = await pagina.text();
  check("página de checkout con checkout.js y la llave pública", pagina.status === 200 && html.includes("checkout.epayco.co/checkout.js") && html.includes(process.env.EPAYCO_PUBLIC_KEY!) && !html.includes(process.env.EPAYCO_P_KEY!));

  const confirmar = (cambios: Record<string, string>) => {
    const d: Record<string, string> = {
      x_ref_payco: "998877", x_transaction_id: "tx-1", x_amount: pago.monto.toFixed(2), x_currency_code: pago.moneda,
      x_cod_response: "1", x_id_invoice: pago.referencia, x_franchise: "VS", ...cambios,
    };
    d.x_signature ??= createHash("sha256")
      .update([config.epayco.custId, config.epayco.pKey, d.x_ref_payco, d.x_transaction_id, d.x_amount, d.x_currency_code].join("^"))
      .digest("hex");
    return d;
  };
  r = await api("POST", "/pagos/epayco/confirmacion", { form: { ...confirmar({}), x_signature: "deadbeef" } });
  check("confirmación con firma falsa -> 400", r.status === 400);
  r = await api("POST", "/pagos/epayco/confirmacion", { form: confirmar({ x_amount: "1.00" }) });
  let estadoPago = (await api("GET", `/pedidos/mios/${pedidoEp.id}`, { token: tk })).json.data;
  check("monto distinto -> el pago NO se aprueba", r.status === 200 && estadoPago.pagos[0].estado === "fallido" && !estadoPago.pagado_at, estadoPago.pagos);
  r = await api("POST", `/pedidos/mios/${pedidoEp.id}/pagos`, { token: tk });
  check("reintento de pago crea otro intento", r.status === 201 && r.json.data.pagos.length === 2);
  const pago2 = r.json.data.pagos[0];
  Object.assign(pago, pago2);
  r = await api("POST", "/pagos/epayco/confirmacion", { form: confirmar({}) });
  estadoPago = (await api("GET", `/pedidos/mios/${pedidoEp.id}`, { token: tk })).json.data;
  check("confirmación aprobada -> pago aprobado, pedido confirmado y pagado", r.status === 200 && estadoPago.pagos[0].estado === "aprobado" && estadoPago.estado === "confirmado" && estadoPago.pagado_at, estadoPago);
  r = await api("POST", "/pagos/epayco/confirmacion", { form: confirmar({ x_cod_response: "2" }) });
  estadoPago = (await api("GET", `/pedidos/mios/${pedidoEp.id}`, { token: tk })).json.data;
  check("una confirmación tardía no desaprueba un pago aprobado", estadoPago.pagos[0].estado === "aprobado");
  r = await api("POST", `/pedidos/mios/${pedidoEp.id}/pagos`, { token: tk });
  check("reintentar un pedido pagado -> 409", r.status === 409);
  r = await api("POST", "/pagos/epayco/confirmacion", { form: confirmar({ x_id_invoice: "IWMP-0-nope" }) });
  check("referencia desconocida -> 404", r.status === 404);

  // ---------------------------------------------------------------- Gestión de pedidos
  seccion("Gestión de pedidos");
  r = await api("GET", "/pedidos", { token: visitante.access_token });
  check("visitante no gestiona pedidos -> 403", r.status === 403);
  r = await api("GET", `/pedidos?q=${pedido.numero}`, { token: vendedor.access_token });
  check("vendedor lista pedidos sin utilidad", r.status === 200 && r.json.data[0]?.id === pedido.id && !("utilidad" in r.json.data[0]) && r.json.data[0].num_productos === 4, r.json.data[0]);
  r = await api("GET", `/pedidos?q=${pedido.numero}`, { token: admin.access_token });
  check("administrador ve la utilidad", typeof r.json.data[0].utilidad === "number");
  r = await api("GET", `/pedidos/${pedido.id}`, { token: admin.access_token });
  check("detalle de gestión con costo y utilidad por línea", r.json.data.costo_total > 0 && r.json.data.items.every((i: Json) => typeof i.utilidad === "number"));
  r = await api("PATCH", `/pedidos/${pedido.id}`, { token: vendedor.access_token, body: { total: 1 } });
  check("solo se edita el estado -> 400 con otro campo", r.status === 400);
  r = await api("PATCH", `/pedidos/${pedido.id}`, { token: vendedor.access_token, body: { estado: "entregado" } });
  check("entregar un contraentrega lo marca pagado", r.status === 200 && r.json.data.estado === "entregado" && r.json.data.pagado_at);
  r = await api("PATCH", `/pedidos/${pedido.id}`, { token: vendedor.access_token, body: { estado: "perdido" } });
  check("estado inválido -> 400", r.status === 400);

  // ---------------------------------------------------------------- Reportes
  seccion("Reportes");
  r = await api("GET", "/reportes/ventas?periodo=hoy", { token: visitante.access_token });
  check("visitante sin reportes -> 403", r.status === 403);
  const largos: Record<string, (n: number) => boolean> = { hoy: (n) => n === 24, ayer: (n) => n === 24, semana: (n) => n === 7, mes: (n) => n >= 28 && n <= 31, anio: (n) => n === 12 };
  for (const periodo of Object.keys(largos)) {
    r = await api("GET", `/reportes/ventas?periodo=${periodo}`, { token: vendedor.access_token });
    check(`reporte ${periodo}: serie completa, sin costos para vendedor`, r.status === 200 && largos[periodo]!(r.json.data.serie.length) && !("utilidad" in r.json.data.resumen), { n: r.json.data?.serie?.length, resumen: r.json.data?.resumen });
  }
  r = await api("GET", "/reportes/ventas?periodo=hoy", { token: admin.access_token });
  check("reporte de hoy incluye las compras de la prueba", r.json.data.resumen.pedidos >= 2 && r.json.data.resumen.unidades >= 5, r.json.data.resumen);
  check("administrador ve costo y utilidad neta", typeof r.json.data.resumen.utilidad === "number" && typeof r.json.data.resumen.costo === "number");
  r = await api("GET", "/reportes/ventas?periodo=siglo", { token: admin.access_token });
  check("periodo inválido -> 400", r.status === 400);
  r = await api("GET", `/celulares/${enPromo.id}/resumen-ventas`, { token: vendedor.access_token });
  check("resumen de ventas del producto (vendedor, sin utilidad)", r.status === 200 && r.json.data.hoy.unidades >= 3 && !("utilidad" in r.json.data.hoy), r.json.data);
  r = await api("GET", `/celulares/${enPromo.id}/resumen-ventas`, { token: admin.access_token });
  check("resumen de ventas del producto (admin, con utilidad)", typeof r.json.data.ultimo_anio.utilidad === "number");

  // ---------------------------------------------------------------- Productos
  seccion("Productos y marcas");
  const apple = (await api("GET", "/marcas")).json.data.find((m: Json) => m.nombre === "Apple");
  const nuevo = { marca_id: apple.id, modelo: `Smoke ${sufijo}`, precio: 100.555, fecha_lanzamiento: "2026-02-30" };
  r = await api("POST", "/celulares", { token: visitante.access_token, body: nuevo });
  check("visitante no crea productos -> 403", r.status === 403);
  r = await api("POST", "/celulares", { token: vendedor.access_token, body: { ...nuevo, costo: 10 } });
  check("vendedor no puede enviar costo -> 403", r.status === 403);
  r = await api("POST", "/celulares", { token: vendedor.access_token, body: nuevo });
  check("fecha inexistente -> 400", r.status === 400 && r.json.error.details.campos.fecha_lanzamiento);
  r = await api("POST", "/celulares", { token: vendedor.access_token, body: { ...nuevo, images_urls: "x" } });
  check("images_urls -> 400 sugiriendo images_url", r.status === 400 && /images_url/.test(r.json.error.details.campos.images_urls));
  r = await api("POST", "/celulares", {
    token: vendedor.access_token,
    body: { ...nuevo, fecha_lanzamiento: "2026-02-28", images_url: ["https://example.com/a.png"], especificaciones: { procesador: "A1", ram: "8 GB", almacenamiento: "128GB", pantalla: "6\"", camara: "48 MP", bateria: "4000 mAh", sistema_op: "iOS 26" } },
  });
  check("vendedor crea producto con ficha -> 201, precio redondeado", r.status === 201 && r.json.data.precio === 100.56 && r.json.data.especificaciones.length === 7, r.json);
  const nuevoId = r.json.data.id;
  creados.celulares.push(nuevoId);
  r = await api("PATCH", `/celulares/${nuevoId}`, { token: admin.access_token, body: { costo: 60, descuento_pct: 10, especificaciones: null } });
  check("admin edita costo, descuento y quita la ficha", r.status === 200 && r.json.data.costo === 60 && r.json.data.precio_final === 90.5 && r.json.data.especificaciones.length === 0, r.json.data);
  r = await api("PATCH", `/celulares/${nuevoId}`, { token: admin.access_token, body: {} });
  check("PATCH vacío -> 400", r.status === 400);
  r = await api("DELETE", `/celulares/${nuevoId}`, { token: vendedor.access_token });
  check("vendedor elimina producto", r.status === 200);
  creados.celulares.pop();

  r = await api("POST", "/marcas", { token: vendedor.access_token, body: { nombre: "APPLE", pais_origen: "X" } });
  check("marca repetida sin distinguir mayúsculas -> 409", r.status === 409);
  r = await api("DELETE", `/marcas/${apple.id}`, { token: admin.access_token });
  check("borrar marca con celulares -> 409", r.status === 409);

  // ---------------------------------------------------------------- Usuarios
  seccion("Usuarios y permisos");
  r = await api("GET", "/usuarios", { token: vendedor.access_token });
  check("vendedor no gestiona usuarios -> 403", r.status === 403);
  r = await api("GET", "/roles", { token: admin.access_token });
  check("roles con su matriz de permisos", r.json.data.length === 3 && r.json.data[2].permisos.length === 5);
  r = await api("POST", "/usuarios", { token: admin.access_token, body: { email: emailSmoke("vend"), nombre: "Smoke Vendedor", password: "Clave1234", rol: "vendedor" } });
  check("admin crea un vendedor", r.status === 201 && r.json.data.rol === "vendedor");
  const vendId = r.json.data.id;
  r = await api("PATCH", `/usuarios/${vendId}`, { token: admin.access_token, body: { rol: "administrador", is_active: false } });
  check("admin cambia rol y desactiva", r.status === 200 && r.json.data.rol === "administrador" && r.json.data.is_active === false);
  r = await api("POST", "/auth/login", { body: { email: emailSmoke("vend"), password: "Clave1234" } });
  check("usuario desactivado -> 403 tras validar la contraseña", r.status === 403);
  r = await api("PATCH", `/usuarios/${admin.usuario.id}`, { token: admin.access_token, body: { rol: "vendedor" } });
  check("el admin no puede quitarse el rol a sí mismo -> 409", r.status === 409);
  r = await api("DELETE", `/usuarios/${vendId}`, { token: admin.access_token });
  check("admin elimina usuario", r.status === 200);
  r = await api("GET", "/usuarios?q=smoke", { token: admin.access_token });
  check("buscar usuarios", r.status === 200 && r.json.data.some((u: Json) => u.email === emailNuevo));

  // Desactivar corta al instante aunque el token siga vigente.
  await pool.query("UPDATE usuarios SET is_active = FALSE WHERE id = $1", [cliente.usuario.id]);
  r = await api("GET", "/auth/yo", { token: tk });
  check("token vigente de usuario desactivado -> 403", r.status === 403);
} catch (error) {
  fallos++;
  console.error("\nExcepción en la prueba:", error);
} finally {
  // ---------------------------------------------------------------- Limpieza
  await pool.query("DELETE FROM pedidos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE 'smoke+%@example.com')");
  await pool.query("DELETE FROM usuarios WHERE email LIKE 'smoke+%@example.com'");
  if (creados.celulares.length) await pool.query("DELETE FROM celulares WHERE id = ANY($1::uuid[])", [creados.celulares]);
  servidor.close();
  await pool.end();
  console.log(`\n${pasos - fallos}/${pasos} comprobaciones correctas${fallos ? ` · ${fallos} FALLARON` : ""}`);
  process.exitCode = fallos ? 1 : 0;
}
