import { Router, type Request } from "express";
import { query, queryOne, transaccion, type Ejecutor } from "../db.ts";
import { badRequest, conRestricciones, created, forbidden, meta, notFound, ok, paginacion } from "../http.ts";
import { puede, requerir, sesionOpcional } from "../auth/middleware.ts";
import { SELECT_CELULAR, SPEC_FIELDS, celularDto, type FilaCelular, type SpecField } from "../catalogo.ts";
import { Validador, definidos, esUuid, idDeRuta, leerCuerpo, soloCampos } from "../validacion.ts";

export const celularesRouter = Router();

// ---------------------------------------------------------------- Filtros del listado

const KEYS_FILTRO = [...SPEC_FIELDS, "created_at"] as const;

/** `%`, `_` y `\` literales dentro de un ILIKE: sin esto `_` sería un comodín. */
const patron = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * `?filter=` con el mismo formato que el Next (§5 del AGENTS.md raíz): JSON
 * estricto, la forma anidada se aplana a sus hojas, keys en whitelist y todo
 * se traduce a `ILIKE '%valor%'` sobre `especificaciones`.
 */
function parsearFiltro(crudo: unknown): Array<{ key: string; value: string }> {
  if (crudo === undefined || crudo === "") return [];
  if (typeof crudo !== "string") throw badRequest("filter debe ser un JSON");
  let json: unknown;
  try {
    json = JSON.parse(crudo);
  } catch {
    throw badRequest("filter no es un JSON válido", { filter: crudo });
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw badRequest("filter debe ser un objeto JSON");
  }
  const hojas: Array<{ key: string; value: string }> = [];
  const recorrer = (obj: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        recorrer(value as Record<string, unknown>);
      } else if (typeof value !== "string") {
        throw badRequest("Los valores de filter deben ser texto", { key, permitidos: KEYS_FILTRO });
      } else if (!(KEYS_FILTRO as readonly string[]).includes(key)) {
        throw badRequest(`Key de filtro no permitida: ${key}`, { key, permitidos: KEYS_FILTRO });
      } else {
        hojas.push({ key, value });
      }
    }
  };
  recorrer(json as Record<string, unknown>);
  return hojas;
}

const ORDENES = {
  recientes: "c.fecha_lanzamiento DESC, c.modelo ASC",
  precio_asc: "(c.precio * (100 - c.descuento_pct)) ASC, c.modelo ASC",
  precio_desc: "(c.precio * (100 - c.descuento_pct)) DESC, c.modelo ASC",
  nombre: "c.modelo ASC",
} as const;

/**
 * GET /api/celulares
 *   q            búsqueda libre en marca y modelo
 *   filter       JSON de especificaciones (formato del Next)
 *   marca_id     UUID
 *   promocion    true = solo con descuento
 *   precio_min / precio_max   sobre el precio final (con descuento)
 *   orden        recientes (defecto) | precio_asc | precio_desc | nombre
 *   page, limit
 */
celularesRouter.get("/", sesionOpcional, async (req, res) => {
  const p = paginacion(req.query);
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  const param = (v: unknown) => {
    valores.push(v);
    return `$${valores.length}`;
  };

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    const n = param(patron(q));
    condiciones.push(`(m.nombre || ' ' || c.modelo) ILIKE ${n}`);
  }
  for (const { key, value } of parsearFiltro(req.query.filter)) {
    condiciones.push(`e.${key}::text ILIKE ${param(patron(value))}`);
  }
  if (req.query.marca_id !== undefined) {
    if (!esUuid(req.query.marca_id)) throw badRequest("marca_id no es un identificador válido");
    condiciones.push(`c.marca_id = ${param(req.query.marca_id)}`);
  }
  if (req.query.promocion === "true") condiciones.push("c.descuento_pct > 0");
  for (const [campo, op] of [["precio_min", ">="], ["precio_max", "<="]] as const) {
    const crudo = req.query[campo];
    if (crudo === undefined || crudo === "") continue;
    const n = Number(crudo);
    if (!Number.isFinite(n) || n < 0) throw badRequest(`${campo} debe ser un número positivo`);
    condiciones.push(`(c.precio * (100 - c.descuento_pct) / 100) ${op} ${param(n)}`);
  }
  const orden = ORDENES[(req.query.orden as keyof typeof ORDENES) ?? "recientes"];
  if (!orden) throw badRequest("orden no válido", { permitidos: Object.keys(ORDENES) });

  const filas = await query<FilaCelular & { total: number }>(
    `SELECT ${SELECT_CELULAR}, COUNT(*) OVER() AS total
     FROM celulares c
     JOIN marcas m ON m.id = c.marca_id
     LEFT JOIN especificaciones e ON e.celular_id = c.id
     WHERE ${condiciones.length ? condiciones.join(" AND ") : "TRUE"}
     ORDER BY ${orden}
     LIMIT ${param(p.limit)} OFFSET ${param(p.offset)}`,
    valores,
  );
  const verCostos = puede(req, "costos:ver");
  ok(res, filas.map((f) => celularDto(f, verCostos)), meta(p, filas[0]?.total ?? 0));
});

// ---------------------------------------------------------------- Detalle

export async function detalleCelular(id: string, req: Request, ejecutor?: Ejecutor) {
  const usuarioId = req.usuario?.id ?? null;
  const f = await queryOne<
    FilaCelular & { descripcion: string | null; valoracion: number; total_valoraciones: number; es_favorito: boolean }
      & Record<SpecField, string | null> & { especificacion_id: string | null }
  >(
    `SELECT ${SELECT_CELULAR}, c.descripcion,
            e.id AS especificacion_id, ${SPEC_FIELDS.map((k) => `e.${k}`).join(", ")},
            COALESCE((SELECT ROUND(AVG(calificacion)::numeric, 1) FROM comentarios WHERE celular_id = c.id), 0) AS valoracion,
            (SELECT COUNT(*) FROM comentarios WHERE celular_id = c.id) AS total_valoraciones,
            EXISTS (SELECT 1 FROM favoritos WHERE celular_id = c.id AND usuario_id = $2) AS es_favorito
     FROM celulares c
     JOIN marcas m ON m.id = c.marca_id
     LEFT JOIN especificaciones e ON e.celular_id = c.id
     WHERE c.id = $1`,
    [id, usuarioId],
    ejecutor,
  );
  if (!f) throw notFound("Celular no encontrado");
  return {
    ...celularDto(f, puede(req, "costos:ver")),
    descripcion: f.descripcion,
    valoracion: f.valoracion,
    total_valoraciones: f.total_valoraciones,
    es_favorito: usuarioId ? f.es_favorito : false,
    // Siempre las 7 filas y en este orden; [] si el celular no tiene ficha.
    especificaciones: f.especificacion_id ? SPEC_FIELDS.map((key) => ({ key, value: f[key] ?? "" })) : [],
  };
}

celularesRouter.get("/:id", sesionOpcional, async (req, res) => {
  ok(res, await detalleCelular(idDeRuta(req.params.id), req));
});

/**
 * 5 sugeridos, regla del Next: primero los lanzados después del de referencia
 * (del más cercano al más lejano) y, si no llegan a 5, los más recientes.
 */
celularesRouter.get("/:id/sugeridos", sesionOpcional, async (req, res) => {
  const id = idDeRuta(req.params.id);
  const ref = await queryOne<{ fecha_lanzamiento: string }>("SELECT fecha_lanzamiento FROM celulares WHERE id = $1", [id]);
  if (!ref) throw notFound("Celular no encontrado");
  const filas = await query<FilaCelular>(
    `SELECT ${SELECT_CELULAR}
     FROM celulares c JOIN marcas m ON m.id = c.marca_id
     WHERE c.id <> $1
     ORDER BY (c.fecha_lanzamiento > $2) DESC,
              CASE WHEN c.fecha_lanzamiento > $2 THEN c.fecha_lanzamiento END ASC,
              c.fecha_lanzamiento DESC, c.modelo ASC
     LIMIT 5`,
    [id, ref.fecha_lanzamiento],
  );
  const verCostos = puede(req, "costos:ver");
  ok(res, filas.map((f) => celularDto(f, verCostos)));
});

/**
 * Banner de ventas del detalle (Excel, fila 19): unidades y valor vendidos del
 * producto en el último año, último mes, últimos 7 días y hoy. Ventanas
 * móviles, no calendario (el reporte general sí va por calendario).
 * La utilidad solo con `costos:ver`. Los pedidos cancelados no cuentan.
 */
celularesRouter.get("/:id/resumen-ventas", ...requerir("reportes:ver"), async (req, res) => {
  const id = idDeRuta(req.params.id);
  const existe = await queryOne("SELECT 1 FROM celulares WHERE id = $1", [id]);
  if (!existe) throw notFound("Celular no encontrado");

  const ventanas = {
    ultimo_anio: "now() - interval '365 days'",
    ultimo_mes: "now() - interval '30 days'",
    ultimos_7_dias: "now() - interval '7 days'",
    hoy: "date_trunc('day', now())",
  } as const;

  const columnas = Object.entries(ventanas)
    .map(([k, desde]) => {
      const f = `FILTER (WHERE p.created_at >= ${desde})`;
      return `COALESCE(SUM(i.cantidad) ${f}, 0) AS ${k}_unidades,
              COALESCE(SUM((i.precio_unitario - i.descuento_unitario) * i.cantidad) ${f}, 0) AS ${k}_ventas,
              COALESCE(SUM((i.precio_unitario - i.descuento_unitario - i.costo_unitario) * i.cantidad) ${f}, 0) AS ${k}_utilidad`;
    })
    .join(",\n");

  const fila = (await queryOne<Record<string, number>>(
    `SELECT ${columnas}
     FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
     WHERE i.celular_id = $1 AND p.estado <> 'cancelado' AND p.created_at >= now() - interval '365 days'`,
    [id],
  ))!;

  const verCostos = puede(req, "costos:ver");
  ok(
    res,
    Object.fromEntries(
      Object.keys(ventanas).map((k) => [
        k,
        {
          unidades: fila[`${k}_unidades`],
          ventas: fila[`${k}_ventas`],
          ...(verCostos ? { utilidad: fila[`${k}_utilidad`] } : {}),
        },
      ]),
    ),
  );
});

// ---------------------------------------------------------------- Escritura

const CAMPOS = ["marca_id", "modelo", "descripcion", "images_url", "precio", "costo", "descuento_pct", "fecha_lanzamiento", "especificaciones"] as const;
const SUGERENCIAS = { images_urls: "images_url", marca: "marca_id", descuento: "descuento_pct" };
const MAX_SPEC: Record<SpecField, number> = {
  procesador: 100, ram: 50, almacenamiento: 50, pantalla: 100, camara: 150, bateria: 50, sistema_op: 100,
};

const RESTRICCIONES = {
  fk_celulares_marcas: () => badRequest("Datos de celular no válidos", { campos: { marca_id: "Marca: no existe." } }),
  chk_celulares_descuento: () => badRequest("Datos de celular no válidos", { campos: { descuento_pct: "Descuento: de 0 a 90." } }),
};

/** Ficha técnica completa (las 7 claves) o `null` para borrarla. */
function leerEspecificaciones(v: Validador, valor: unknown) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== "object" || Array.isArray(valor)) {
    v.error("especificaciones", "Especificaciones: debe ser un objeto con las 7 claves técnicas.");
    return undefined;
  }
  const obj = valor as Record<string, unknown>;
  const extra = Object.keys(obj).filter((k) => !(SPEC_FIELDS as readonly string[]).includes(k));
  if (extra.length) v.error("especificaciones", `Especificaciones: claves no admitidas: ${extra.join(", ")}.`);
  const sv = new Validador(obj);
  const ficha = Object.fromEntries(
    SPEC_FIELDS.map((k) => [k, sv.texto(k, k, { obligatorio: true, max: MAX_SPEC[k] })]),
  ) as Record<SpecField, string>;
  for (const [k, m] of Object.entries(sv.errores)) v.error(`especificaciones.${k}`, m);
  return sv.valido ? ficha : undefined;
}

function leerCelular(req: Request, alta: boolean) {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, CAMPOS, SUGERENCIAS);
  // El costo es dato de administrador: un vendedor ni lo ve ni lo escribe.
  if (cuerpo.costo !== undefined && !puede(req, "costos:ver")) {
    throw forbidden("Solo el administrador puede ver y editar el costo");
  }
  const v = new Validador(cuerpo);
  const datos = definidos({
    marca_id: v.uuid("marca_id", "Marca", { obligatorio: alta }),
    modelo: v.texto("modelo", "Modelo", { obligatorio: alta, max: 150 }),
    descripcion: v.texto("descripcion", "Descripción", { nulo: true, max: 5000 }),
    images_urls: (() => {
      const urls = v.urls("images_url", "Imágenes", { max: 20 });
      return urls === undefined ? undefined : urls === null ? null : urls.join(",");
    })(),
    precio: v.dinero("precio", "Precio", { obligatorio: alta }),
    costo: v.dinero("costo", "Costo"),
    descuento_pct: v.entero("descuento_pct", "Descuento", { min: 0, max: 90 }),
    fecha_lanzamiento: v.fecha("fecha_lanzamiento", "Fecha de lanzamiento", { obligatorio: alta }),
  });
  const especificaciones = leerEspecificaciones(v, cuerpo.especificaciones);
  if (alta && especificaciones === null) v.error("especificaciones", "Especificaciones: en el alta se omiten o se envían completas.");
  v.comprobar("Datos de celular no válidos");
  return { datos, especificaciones };
}

async function guardarEspecificaciones(ejecutor: Ejecutor, celularId: string, ficha: Record<SpecField, string> | null) {
  if (ficha === null) {
    await query("DELETE FROM especificaciones WHERE celular_id = $1", [celularId], ejecutor);
    return;
  }
  const valores = SPEC_FIELDS.map((k) => ficha[k]);
  await query(
    `INSERT INTO especificaciones (celular_id, ${SPEC_FIELDS.join(", ")})
     VALUES ($1, ${SPEC_FIELDS.map((_, i) => `$${i + 2}`).join(", ")})
     ON CONFLICT (celular_id) DO UPDATE SET ${SPEC_FIELDS.map((k) => `${k} = EXCLUDED.${k}`).join(", ")}`,
    [celularId, ...valores],
    ejecutor,
  );
}

celularesRouter.post("/", ...requerir("productos:gestionar"), async (req, res) => {
  const { datos, especificaciones } = leerCelular(req, true);
  const id = await conRestricciones(
    () =>
      transaccion(async (cx) => {
        const columnas = Object.keys(datos);
        const fila = await queryOne<{ id: string }>(
          `INSERT INTO celulares (${columnas.join(", ")}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
          columnas.map((c) => datos[c as keyof typeof datos]),
          cx,
        );
        if (especificaciones) await guardarEspecificaciones(cx, fila!.id, especificaciones);
        return fila!.id;
      }),
    RESTRICCIONES,
  );
  created(res, await detalleCelular(id, req));
});

celularesRouter.patch("/:id", ...requerir("productos:gestionar"), async (req, res) => {
  const id = idDeRuta(req.params.id);
  const { datos, especificaciones } = leerCelular(req, false);
  if (!Object.keys(datos).length && especificaciones === undefined) {
    throw badRequest("No hay nada que actualizar", { permitidos: CAMPOS });
  }
  await conRestricciones(
    () =>
      transaccion(async (cx) => {
        const columnas = Object.keys(datos);
        const fila = columnas.length
          ? await queryOne(
              `UPDATE celulares SET ${columnas.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1 RETURNING id`,
              [id, ...columnas.map((c) => datos[c as keyof typeof datos])],
              cx,
            )
          : await queryOne("SELECT id FROM celulares WHERE id = $1 FOR UPDATE", [id], cx);
        if (!fila) throw notFound("Celular no encontrado");
        if (especificaciones !== undefined) await guardarEspecificaciones(cx, id, especificaciones);
      }),
    RESTRICCIONES,
  );
  ok(res, await detalleCelular(id, req));
});

/**
 * Se lleva su ficha, sus comentarios y los favoritos (CASCADE). Los pedidos
 * que lo incluían se conservan: sus líneas guardan una foto del producto y
 * `celular_id` pasa a NULL.
 */
celularesRouter.delete("/:id", ...requerir("productos:gestionar"), async (req, res) => {
  const id = idDeRuta(req.params.id);
  const r = await query("DELETE FROM celulares WHERE id = $1 RETURNING id", [id]);
  if (!r.length) throw notFound("Celular no encontrado");
  ok(res, null);
});
