import { Router } from "express";
import { config } from "../config.ts";
import { query, queryOne } from "../db.ts";
import { badRequest, ok } from "../http.ts";
import { puede, requerir } from "../auth/middleware.ts";

export const reportesRouter = Router();

/**
 * Periodos del reporte (Excel fila 15), por CALENDARIO en la zona horaria de
 * la app (la sesión de BD ya la fija, ver src/db.ts). La semana empieza el
 * lunes (date_trunc('week') de Postgres). Todo sale de esta tabla: nada de la
 * petición se interpola en el SQL.
 */
const PERIODOS = {
  hoy: { desde: "date_trunc('day', now())", duracion: "1 day", paso: "1 hour", etiqueta: 'HH24":00"' },
  ayer: { desde: "date_trunc('day', now()) - interval '1 day'", duracion: "1 day", paso: "1 hour", etiqueta: 'HH24":00"' },
  semana: { desde: "date_trunc('week', now())", duracion: "7 days", paso: "1 day", etiqueta: "DD/MM" },
  mes: { desde: "date_trunc('month', now())", duracion: "1 month", paso: "1 day", etiqueta: "DD" },
  anio: { desde: "date_trunc('year', now())", duracion: "1 year", paso: "1 month", etiqueta: "MM" },
} as const;
type Periodo = keyof typeof PERIODOS;

interface FilaSerie {
  inicio: Date;
  etiqueta: string;
  pedidos: number;
  unidades: number;
  ventas: number;
  costo: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/reportes/ventas?periodo=hoy|ayer|semana|mes|anio
 *
 * Serie para el gráfico (por hora, día o mes según el periodo, con los huecos
 * a cero), resumen y top 5 de productos. Unidades y ventas para todos;
 * costo de lo vendido y utilidad neta solo con `costos:ver`.
 * Los pedidos cancelados no cuentan.
 */
reportesRouter.get("/ventas", ...requerir("reportes:ver"), async (req, res) => {
  const periodo = (req.query.periodo ?? "mes") as Periodo;
  const def = PERIODOS[periodo];
  if (!def) throw badRequest("periodo no válido", { permitidos: Object.keys(PERIODOS) });

  const rango = `SELECT ${def.desde} AS desde, ${def.desde} + interval '${def.duracion}' AS hasta`;
  const pedidosDelRango = `
    SELECT p.id, p.created_at, p.total, p.costo_total,
           (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id) AS unidades
    FROM pedidos p, r
    WHERE p.estado <> 'cancelado' AND p.created_at >= r.desde AND p.created_at < r.hasta`;

  const [limites, serie, top] = await Promise.all([
    queryOne<{ desde: Date; hasta: Date }>(rango),
    query<FilaSerie>(
      `WITH r AS (${rango}),
            ped AS (${pedidosDelRango}),
            b AS (SELECT g AS inicio FROM r, generate_series(r.desde, r.hasta - interval '${def.paso}', interval '${def.paso}') g)
       SELECT b.inicio, to_char(b.inicio, '${def.etiqueta}') AS etiqueta,
              COUNT(ped.id) AS pedidos,
              COALESCE(SUM(ped.unidades), 0) AS unidades,
              COALESCE(SUM(ped.total), 0) AS ventas,
              COALESCE(SUM(ped.costo_total), 0) AS costo
       FROM b LEFT JOIN ped ON ped.created_at >= b.inicio AND ped.created_at < b.inicio + interval '${def.paso}'
       GROUP BY b.inicio ORDER BY b.inicio`,
    ),
    query<{ celular_id: string | null; modelo: string; imagen_url: string | null; unidades: number; ventas: number; costo: number }>(
      `WITH r AS (${rango})
       SELECT i.celular_id, i.modelo, MIN(i.imagen_url) AS imagen_url,
              SUM(i.cantidad) AS unidades,
              SUM((i.precio_unitario - i.descuento_unitario) * i.cantidad) AS ventas,
              SUM(i.costo_unitario * i.cantidad) AS costo
       FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id, r
       WHERE p.estado <> 'cancelado' AND p.created_at >= r.desde AND p.created_at < r.hasta
       GROUP BY i.celular_id, i.modelo
       ORDER BY unidades DESC, ventas DESC LIMIT 5`,
    ),
  ]);

  const verCostos = puede(req, "costos:ver");
  const conCostos = (ventas: number, costo: number) =>
    verCostos ? { costo: round2(costo), utilidad: round2(ventas - costo) } : {};

  const tot = serie.reduce(
    (a, s) => ({ pedidos: a.pedidos + s.pedidos, unidades: a.unidades + s.unidades, ventas: a.ventas + s.ventas, costo: a.costo + s.costo }),
    { pedidos: 0, unidades: 0, ventas: 0, costo: 0 },
  );

  ok(res, {
    periodo,
    desde: limites!.desde,
    hasta: limites!.hasta,
    moneda: config.moneda,
    resumen: {
      pedidos: tot.pedidos,
      unidades: tot.unidades,
      ventas: round2(tot.ventas),
      ticket_promedio: tot.pedidos ? round2(tot.ventas / tot.pedidos) : 0,
      ...conCostos(tot.ventas, tot.costo),
    },
    serie: serie.map((s) => ({
      inicio: s.inicio,
      etiqueta: s.etiqueta,
      pedidos: s.pedidos,
      unidades: s.unidades,
      ventas: round2(s.ventas),
      ...conCostos(s.ventas, s.costo),
    })),
    top_productos: top.map((t) => ({
      celular_id: t.celular_id,
      modelo: t.modelo,
      imagen_url: t.imagen_url,
      unidades: t.unidades,
      ventas: round2(t.ventas),
      ...conCostos(t.ventas, t.costo),
    })),
  });
});
