import { Router } from "express";
import { query } from "../db.ts";
import { badRequest, meta, ok, paginacion } from "../http.ts";
import { puede, sesionOpcional } from "../auth/middleware.ts";
import { SELECT_CELULAR, SPEC_FIELDS, celularDto, type FilaCelular } from "../catalogo.ts";
import { esUuid } from "../validacion.ts";

/**
 * Lecturas públicas que acompañan al catálogo: la Home, las opciones de los
 * filtros y los comentarios.
 */
export const catalogoExtraRouter = Router();

/**
 * GET /api/home — todo lo que pinta la Home en una sola petición (enfoque
 * comercial, Excel fila 6):
 *   banners      4 lanzamientos más recientes, para los banners a ancho completo
 *   promociones  con descuento, del mayor al menor
 *   ultimos      8 lanzamientos más recientes
 *   mas_vendidos 8 con más unidades en los últimos 90 días
 */
catalogoExtraRouter.get("/home", sesionOpcional, async (req, res) => {
  const base = `SELECT ${SELECT_CELULAR} FROM celulares c JOIN marcas m ON m.id = c.marca_id`;
  const [banners, promociones, ultimos, masVendidos] = await Promise.all([
    query<FilaCelular & { descripcion: string | null }>(
      `SELECT ${SELECT_CELULAR}, c.descripcion FROM celulares c JOIN marcas m ON m.id = c.marca_id
       ORDER BY c.fecha_lanzamiento DESC, c.precio DESC LIMIT 4`,
    ),
    query<FilaCelular>(`${base} WHERE c.descuento_pct > 0 ORDER BY c.descuento_pct DESC, c.fecha_lanzamiento DESC LIMIT 8`),
    query<FilaCelular>(`${base} ORDER BY c.fecha_lanzamiento DESC, c.modelo ASC LIMIT 8`),
    query<FilaCelular & { unidades: number }>(
      `SELECT ${SELECT_CELULAR}, v.unidades
       FROM (
         SELECT i.celular_id, SUM(i.cantidad) AS unidades
         FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
         WHERE p.estado <> 'cancelado' AND p.created_at >= now() - interval '90 days' AND i.celular_id IS NOT NULL
         GROUP BY i.celular_id
       ) v
       JOIN celulares c ON c.id = v.celular_id
       JOIN marcas m ON m.id = c.marca_id
       ORDER BY v.unidades DESC, c.modelo ASC LIMIT 8`,
    ),
  ]);
  const verCostos = puede(req, "costos:ver");
  const dto = (f: FilaCelular) => celularDto(f, verCostos);
  ok(res, {
    banners: banners.map((f) => ({ ...dto(f), descripcion: f.descripcion })),
    promociones: promociones.map(dto),
    ultimos: ultimos.map(dto),
    mas_vendidos: masVendidos.map((f) => ({ ...dto(f), unidades_vendidas: f.unidades })),
  });
});

/**
 * GET /api/especificaciones/opciones — valores distintos de cada campo técnico,
 * para los filtros del listado (mismo contrato que el Next).
 */
catalogoExtraRouter.get("/especificaciones/opciones", async (_req, res) => {
  const options = await Promise.all(
    SPEC_FIELDS.map(async (key) => ({
      key,
      values: (
        await query<{ v: string }>(`SELECT DISTINCT ${key} AS v FROM especificaciones WHERE ${key} IS NOT NULL ORDER BY 1`)
      ).map((r) => r.v),
    })),
  );
  ok(res, { options });
});

/** GET /api/comentarios?celular_id= — valoraciones del seed, paginadas. */
catalogoExtraRouter.get("/comentarios", async (req, res) => {
  const celularId = req.query.celular_id;
  if (!esUuid(celularId)) throw badRequest("celular_id es obligatorio y debe ser un identificador válido");
  const p = paginacion(req.query, 5);
  const filas = await query<{ total: number }>(
    `SELECT id, nombre, mensaje, calificacion, fecha, COUNT(*) OVER() AS total
     FROM comentarios WHERE celular_id = $1
     ORDER BY fecha DESC, id ASC LIMIT $2 OFFSET $3`,
    [celularId, p.limit, p.offset],
  );
  ok(res, filas.map(({ total: _t, ...c }) => c), meta(p, filas[0]?.total ?? 0));
});
