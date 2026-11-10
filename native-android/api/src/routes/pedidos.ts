import { randomBytes } from "node:crypto";
import { Router, type Request } from "express";
import { config, epaycoConfigurado } from "../config.ts";
import { query, queryOne, transaccion, type Ejecutor } from "../db.ts";
import { badRequest, conflict, created, meta, notFound, ok, paginacion } from "../http.ts";
import { autenticar, puede, requerir, usuarioDe } from "../auth/middleware.ts";
import { imagenes } from "../catalogo.ts";
import { Validador, esUuid, idDeRuta, leerCuerpo, soloCampos } from "../validacion.ts";

export const pedidosRouter = Router();
export const metodosPagoRouter = Router();

export const ESTADOS_PEDIDO = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"] as const;
type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

// ---------------------------------------------------------------- Métodos de pago

interface FilaMetodo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  proveedor: string | null;
  requiere_pasarela: boolean;
  is_active: boolean;
}

/** Un método de pasarela solo se ofrece si la API tiene las llaves de esa pasarela. */
function disponible(m: FilaMetodo) {
  if (!m.is_active) return false;
  if (m.proveedor === "epayco") return epaycoConfigurado;
  return !m.requiere_pasarela || m.proveedor === null;
}

/** GET /api/metodos-pago — los que la pasarela de la app puede ofrecer ahora mismo. */
metodosPagoRouter.get("/", async (_req, res) => {
  const filas = await query<FilaMetodo>(
    "SELECT id, codigo, nombre, descripcion, proveedor, requiere_pasarela, is_active FROM metodos_pago ORDER BY orden, nombre",
  );
  ok(
    res,
    filas.filter(disponible).map(({ id, codigo, nombre, descripcion, requiere_pasarela }) => ({
      id, codigo, nombre, descripcion, requiere_pasarela,
    })),
  );
});

// ---------------------------------------------------------------- Lectura de un pedido

interface FilaPedido {
  id: string;
  numero: number;
  usuario_id: string | null;
  cliente_nombre: string;
  cliente_email: string;
  cliente_documento: string | null;
  cliente_telefono: string;
  direccion_entrega: string;
  ciudad_entrega: string;
  departamento_entrega: string;
  indicaciones_entrega: string | null;
  estado: EstadoPedido;
  pagado_at: Date | null;
  subtotal: number;
  descuento: number;
  total: number;
  costo_total: number;
  created_at: Date;
  updated_at: Date;
  metodo_id: string;
  metodo_codigo: string;
  metodo_nombre: string;
  requiere_pasarela: boolean;
}

interface FilaPago {
  id: string;
  referencia: string;
  referencia_pasarela: string | null;
  estado: string;
  monto: number;
  moneda: string;
  medio: string | null;
  created_at: Date;
  updated_at: Date;
}

const checkoutUrl = (referencia: string) => `${config.publicUrl}/api/pagos/epayco/checkout/${encodeURIComponent(referencia)}`;

/**
 * El pedido completo. `costo_total` y `utilidad` (pedido y líneas) solo con
 * `costos:ver`. Un pago pendiente de pasarela trae su `checkout_url`.
 */
async function leerPedido(id: string, req: Request, soloDe?: string, ejecutor?: Ejecutor) {
  const p = await queryOne<FilaPedido>(
    `SELECT p.*, mp.id AS metodo_id, mp.codigo AS metodo_codigo, mp.nombre AS metodo_nombre, mp.requiere_pasarela
     FROM pedidos p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
     WHERE p.id = $1 AND ($2::uuid IS NULL OR p.usuario_id = $2)`,
    [id, soloDe ?? null],
    ejecutor,
  );
  if (!p) throw notFound("Pedido no encontrado");

  const [items, pagos] = await Promise.all([
    query<{ id: string; celular_id: string | null; modelo: string; imagen_url: string | null; cantidad: number;
            precio_unitario: number; descuento_unitario: number; costo_unitario: number }>(
      `SELECT id, celular_id, modelo, imagen_url, cantidad, precio_unitario, descuento_unitario, costo_unitario
       FROM pedido_items WHERE pedido_id = $1 ORDER BY modelo`,
      [id],
      ejecutor,
    ),
    query<FilaPago>(
      `SELECT id, referencia, referencia_pasarela, estado, monto, moneda, medio, created_at, updated_at
       FROM pagos WHERE pedido_id = $1 ORDER BY created_at DESC`,
      [id],
      ejecutor,
    ),
  ]);

  const verCostos = puede(req, "costos:ver");
  return {
    id: p.id,
    numero: p.numero,
    estado: p.estado,
    fecha: p.created_at,
    updated_at: p.updated_at,
    pagado_at: p.pagado_at,
    metodo_pago: { id: p.metodo_id, codigo: p.metodo_codigo, nombre: p.metodo_nombre, requiere_pasarela: p.requiere_pasarela },
    cliente: {
      usuario_id: p.usuario_id,
      nombre: p.cliente_nombre,
      email: p.cliente_email,
      documento: p.cliente_documento,
      telefono: p.cliente_telefono,
    },
    entrega: {
      direccion: p.direccion_entrega,
      ciudad: p.ciudad_entrega,
      departamento: p.departamento_entrega,
      indicaciones: p.indicaciones_entrega,
    },
    items: items.map((i) => ({
      id: i.id,
      celular_id: i.celular_id,
      modelo: i.modelo,
      imagen_url: i.imagen_url,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      descuento_unitario: i.descuento_unitario,
      total: round2((i.precio_unitario - i.descuento_unitario) * i.cantidad),
      ...(verCostos
        ? { costo_unitario: i.costo_unitario, utilidad: round2((i.precio_unitario - i.descuento_unitario - i.costo_unitario) * i.cantidad) }
        : {}),
    })),
    num_productos: items.reduce((n, i) => n + i.cantidad, 0),
    subtotal: p.subtotal,
    descuento: p.descuento,
    total: p.total,
    moneda: config.moneda,
    ...(verCostos ? { costo_total: p.costo_total, utilidad: round2(p.total - p.costo_total) } : {}),
    pagos: pagos.map((pg) => ({
      ...pg,
      ...(pg.estado === "pendiente" && p.estado !== "cancelado" ? { checkout_url: checkoutUrl(pg.referencia) } : {}),
    })),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Abre un intento de cobro en la pasarela. La referencia es aleatoria: la URL de checkout no se puede adivinar. */
async function crearPago(cx: Ejecutor, pedido: { id: string; numero: number; total: number }, metodoId: string) {
  const referencia = `IWMP-${pedido.numero}-${randomBytes(12).toString("hex")}`;
  await query(
    "INSERT INTO pagos (pedido_id, metodo_pago_id, referencia, monto, moneda) VALUES ($1, $2, $3, $4, $5)",
    [pedido.id, metodoId, referencia, pedido.total, config.moneda],
    cx,
  );
  return referencia;
}

// ---------------------------------------------------------------- Comprar

/**
 * POST /api/pedidos — "Pagar y finalizar". El carrito vive en el teléfono; aquí
 * llegan solo ids y cantidades. Precio, descuento y costo se leen de la BD
 * (nunca de la app) y se copian al pedido, igual que el comprador y la
 * dirección: el pedido no cambia aunque luego cambien ellos.
 */
pedidosRouter.post("/", autenticar, async (req, res) => {
  const usuario = usuarioDe(req);
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["items", "direccion_id", "metodo_pago_id"]);
  const v = new Validador(cuerpo);
  const direccionId = v.uuid("direccion_id", "Dirección de entrega", { obligatorio: true });
  const metodoId = v.uuid("metodo_pago_id", "Método de pago", { obligatorio: true });

  // items: [{ celular_id, cantidad }] -> mapa id -> cantidad (las líneas repetidas se suman).
  const cantidades = new Map<string, number>();
  if (!Array.isArray(cuerpo.items) || cuerpo.items.length === 0) {
    v.error("items", "Productos: el carrito está vacío.");
  } else if (cuerpo.items.length > 50) {
    v.error("items", "Productos: máximo 50 líneas.");
  } else {
    cuerpo.items.forEach((it: unknown, i: number) => {
      const linea = (it ?? {}) as { celular_id?: unknown; cantidad?: unknown };
      if (!esUuid(linea.celular_id)) return v.error(`items.${i}.celular_id`, "Producto: identificador no válido.");
      if (typeof linea.cantidad !== "number" || !Number.isInteger(linea.cantidad) || linea.cantidad < 1 || linea.cantidad > 10) {
        return v.error(`items.${i}.cantidad`, "Cantidad: entero de 1 a 10.");
      }
      const id = linea.celular_id.toLowerCase();
      cantidades.set(id, Math.min(10, (cantidades.get(id) ?? 0) + linea.cantidad));
    });
  }
  v.comprobar("Pedido no válido");

  const pedidoId = await transaccion(async (cx) => {
    const metodo = await queryOne<FilaMetodo>(
      "SELECT id, codigo, nombre, descripcion, proveedor, requiere_pasarela, is_active FROM metodos_pago WHERE id = $1",
      [metodoId],
      cx,
    );
    if (!metodo || !disponible(metodo)) {
      throw badRequest("Pedido no válido", { campos: { metodo_pago_id: "Método de pago: no disponible." } });
    }

    const dir = await queryOne<{ direccion: string; ciudad: string; departamento: string; indicaciones: string | null; telefono: string }>(
      "SELECT direccion, ciudad, departamento, indicaciones, telefono FROM direcciones WHERE id = $1 AND usuario_id = $2",
      [direccionId, usuario.id],
      cx,
    );
    if (!dir) throw badRequest("Pedido no válido", { campos: { direccion_id: "Dirección: no existe o no es tuya." } });

    const cliente = (await queryOne<{ nombre: string; email: string; documento: string | null }>(
      "SELECT nombre, email, documento FROM usuarios WHERE id = $1",
      [usuario.id],
      cx,
    ))!;

    const productos = await query<{ id: string; nombre: string; images_urls: string | null; precio: number; descuento_pct: number; costo: number }>(
      `SELECT c.id, m.nombre || ' ' || c.modelo AS nombre, c.images_urls, c.precio, c.descuento_pct, c.costo
       FROM celulares c JOIN marcas m ON m.id = c.marca_id WHERE c.id = ANY($1::uuid[])`,
      [[...cantidades.keys()]],
      cx,
    );
    const faltan = [...cantidades.keys()].filter((id) => !productos.some((p) => p.id === id));
    if (faltan.length) throw badRequest("Algunos productos ya no existen", { campos: { items: "Productos: actualiza el carrito." }, faltan });

    const lineas = productos.map((p) => {
      const cantidad = cantidades.get(p.id)!;
      const descuentoUnitario = round2((p.precio * p.descuento_pct) / 100);
      return { ...p, cantidad, descuentoUnitario };
    });
    const subtotal = round2(lineas.reduce((s, l) => s + l.precio * l.cantidad, 0));
    const descuento = round2(lineas.reduce((s, l) => s + l.descuentoUnitario * l.cantidad, 0));
    const costoTotal = round2(lineas.reduce((s, l) => s + l.costo * l.cantidad, 0));
    const total = round2(subtotal - descuento);

    const pedido = (await queryOne<{ id: string; numero: number; total: number }>(
      `INSERT INTO pedidos (usuario_id, cliente_nombre, cliente_email, cliente_documento, cliente_telefono,
                            direccion_entrega, ciudad_entrega, departamento_entrega, indicaciones_entrega,
                            metodo_pago_id, subtotal, descuento, total, costo_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, numero, total`,
      [usuario.id, cliente.nombre, cliente.email, cliente.documento, dir.telefono, dir.direccion, dir.ciudad,
       dir.departamento, dir.indicaciones, metodo.id, subtotal, descuento, total, costoTotal],
      cx,
    ))!;

    for (const l of lineas) {
      await query(
        `INSERT INTO pedido_items (pedido_id, celular_id, modelo, imagen_url, cantidad, precio_unitario, descuento_unitario, costo_unitario)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [pedido.id, l.id, l.nombre, imagenes(l.images_urls)[0] ?? null, l.cantidad, l.precio, l.descuentoUnitario, l.costo],
        cx,
      );
    }

    if (metodo.requiere_pasarela) await crearPago(cx, pedido, metodo.id);
    return pedido.id;
  });

  created(res, await leerPedido(pedidoId, req));
});

// ---------------------------------------------------------------- Mis compras

pedidosRouter.get("/mios", autenticar, async (req, res) => {
  const p = paginacion(req.query, 10);
  const filas = await query<{ total_filas: number; imagenes: string[] }>(
    `SELECT p.id, p.numero, p.estado, p.created_at AS fecha, p.total, p.pagado_at,
            mp.codigo AS metodo_codigo, mp.nombre AS metodo_nombre,
            (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id) AS num_productos,
            (SELECT array_agg(imagen_url ORDER BY modelo) FROM pedido_items WHERE pedido_id = p.id AND imagen_url IS NOT NULL) AS imagenes,
            (SELECT estado FROM pagos WHERE pedido_id = p.id ORDER BY created_at DESC LIMIT 1) AS pago_estado,
            COUNT(*) OVER() AS total_filas
     FROM pedidos p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
     WHERE p.usuario_id = $1
     ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
    [usuarioDe(req).id, p.limit, p.offset],
  );
  ok(
    res,
    filas.map(({ total_filas: _t, imagenes: imgs, ...f }) => ({ ...f, imagenes: imgs ?? [], moneda: config.moneda })),
    meta(p, filas[0]?.total_filas ?? 0),
  );
});

pedidosRouter.get("/mios/:id", autenticar, async (req, res) => {
  ok(res, await leerPedido(idDeRuta(req.params.id), req, usuarioDe(req).id));
});

/** Reintento de pago (tarjeta rechazada, checkout abandonado…). */
pedidosRouter.post("/mios/:id/pagos", autenticar, async (req, res) => {
  const id = idDeRuta(req.params.id);
  const usuarioId = usuarioDe(req).id;
  await transaccion(async (cx) => {
    const p = await queryOne<{ id: string; numero: number; total: number; estado: EstadoPedido; pagado_at: Date | null;
                               metodo_pago_id: string; requiere_pasarela: boolean; proveedor: string | null; is_active: boolean }>(
      `SELECT p.id, p.numero, p.total, p.estado, p.pagado_at, p.metodo_pago_id, mp.requiere_pasarela, mp.proveedor, mp.is_active
       FROM pedidos p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
       WHERE p.id = $1 AND p.usuario_id = $2 FOR UPDATE OF p`,
      [id, usuarioId],
      cx,
    );
    if (!p) throw notFound("Pedido no encontrado");
    if (!p.requiere_pasarela) throw conflict("Este pedido se paga contraentrega");
    if (p.pagado_at) throw conflict("Este pedido ya está pagado");
    if (p.estado === "cancelado") throw conflict("El pedido está cancelado");
    if (p.proveedor === "epayco" && !epaycoConfigurado) throw conflict("La pasarela de pago no está disponible");
    // Los intentos pendientes anteriores quedan sin efecto: solo vale el último checkout.
    await query("UPDATE pagos SET estado = 'fallido', updated_at = now() WHERE pedido_id = $1 AND estado = 'pendiente'", [id], cx);
    await crearPago(cx, p, p.metodo_pago_id);
  });
  created(res, await leerPedido(id, req, usuarioId));
});

// ---------------------------------------------------------------- Gestión (vendedor y administrador)

/**
 * GET /api/pedidos — lista de gestión (Excel fila 14): fecha, medio de pago,
 * nº de productos, estado y cliente; utilidad solo con `costos:ver`.
 *   estado   filtra por estado
 *   q        número de pedido, nombre o correo del cliente
 */
pedidosRouter.get("/", ...requerir("pedidos:gestionar"), async (req, res) => {
  const p = paginacion(req.query, 20);
  const condiciones = ["TRUE"];
  const valores: unknown[] = [];
  if (req.query.estado !== undefined) {
    if (!ESTADOS_PEDIDO.includes(req.query.estado as EstadoPedido)) {
      throw badRequest("estado no válido", { permitidos: ESTADOS_PEDIDO });
    }
    valores.push(req.query.estado);
    condiciones.push(`p.estado = $${valores.length}`);
  }
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    valores.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    condiciones.push(`(p.numero::text ILIKE $${valores.length} OR p.cliente_nombre ILIKE $${valores.length} OR p.cliente_email ILIKE $${valores.length})`);
  }
  valores.push(p.limit, p.offset);

  const filas = await query<{ total: number; costo_total: number; total_filas: number }>(
    `SELECT p.id, p.numero, p.created_at AS fecha, p.estado, p.cliente_nombre, p.total, p.costo_total, p.pagado_at,
            json_build_object('codigo', mp.codigo, 'nombre', mp.nombre) AS metodo_pago,
            (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id) AS num_productos,
            COUNT(*) OVER() AS total_filas
     FROM pedidos p JOIN metodos_pago mp ON mp.id = p.metodo_pago_id
     WHERE ${condiciones.join(" AND ")}
     ORDER BY p.created_at DESC
     LIMIT $${valores.length - 1} OFFSET $${valores.length}`,
    valores,
  );
  const verCostos = puede(req, "costos:ver");
  ok(
    res,
    filas.map(({ total_filas: _t, costo_total, ...f }) => ({
      ...f,
      ...(verCostos ? { utilidad: round2(f.total - costo_total) } : {}),
    })),
    meta(p, filas[0]?.total_filas ?? 0),
  );
});

pedidosRouter.get("/:id", ...requerir("pedidos:gestionar"), async (req, res) => {
  ok(res, await leerPedido(idDeRuta(req.params.id), req));
});

/** En el detalle de gestión solo se edita el estado (Excel fila 14). */
pedidosRouter.patch("/:id", ...requerir("pedidos:gestionar"), async (req, res) => {
  const id = idDeRuta(req.params.id);
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["estado"]);
  const v = new Validador(cuerpo);
  const estado = v.opcion("estado", "Estado", ESTADOS_PEDIDO, { obligatorio: true });
  v.comprobar("Estado no válido");
  const r = await query(
    `UPDATE pedidos SET estado = $2::estado_pedido, updated_at = now(),
            -- Contraentrega: entregar es cobrar.
            pagado_at = CASE WHEN $2::estado_pedido = 'entregado' AND pagado_at IS NULL
                              AND NOT (SELECT requiere_pasarela FROM metodos_pago WHERE id = metodo_pago_id)
                             THEN now() ELSE pagado_at END
     WHERE id = $1 RETURNING id`,
    [id, estado],
  );
  if (!r.length) throw notFound("Pedido no encontrado");
  ok(res, await leerPedido(id, req));
});

/** Borra el pedido con sus líneas y pagos (CASCADE). Sale de los reportes. */
pedidosRouter.delete("/:id", ...requerir("pedidos:gestionar"), async (req, res) => {
  const r = await query("DELETE FROM pedidos WHERE id = $1 RETURNING id", [idDeRuta(req.params.id)]);
  if (!r.length) throw notFound("Pedido no encontrado");
  ok(res, null);
});
