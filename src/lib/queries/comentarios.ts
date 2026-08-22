import { query } from "@lib/db";
import { buildMeta, type Pagination } from "@utils/pagination";
import type { Comentario, PaginationMeta } from "@/src/types/api";

interface ComentarioRow {
  id: string;
  nombre: string;
  mensaje: string;
  calificacion: number;
  fecha: Date | string;
  total_count: number | string;
}

export interface ListarComentariosResult {
  data: Comentario[];
  meta: PaginationMeta;
}

export async function listarComentarios(
  celularId: string,
  pagination: Pagination,
): Promise<ListarComentariosResult> {
  const rows = await query<ComentarioRow>(
    `SELECT id, nombre, mensaje, calificacion, fecha, COUNT(*) OVER() AS total_count
     FROM comentarios
     WHERE celular_id = $1
     ORDER BY fecha DESC, id ASC
     LIMIT $2 OFFSET $3`,
    [celularId, pagination.limit, pagination.offset],
  );

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    data: rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      mensaje: row.mensaje,
      calificacion: Number(row.calificacion),
      fecha: row.fecha instanceof Date ? row.fecha.toISOString() : new Date(row.fecha).toISOString(),
    })),
    meta: buildMeta(total, pagination),
  };
}
