import { query, queryOne } from "@lib/db";
import { escapeLike, type FiltroEntry } from "@utils/parse-filter";
import { buildMeta, type Pagination } from "@utils/pagination";
import type { Celular, CelularDetalle, PaginationMeta } from "@/src/types/api";

interface CelularRow {
  id: string;
  modelo: string;
  precio: number | string;
  fecha_lanzamiento: string;
  created_at: Date | string;
  images_urls: string | null;
  marca_id: string;
  marca_nombre: string;
  marca_logo: string | null;
}

interface CelularListRow extends CelularRow {
  total_count: number | string;
}

interface CelularDetalleRow extends CelularRow {
  especificacion_id: string | null;
  valoracion: number | string;
}

const CAMPOS = `
  c.id,
  c.modelo,
  c.precio,
  c.fecha_lanzamiento,
  c.created_at,
  c.images_urls,
  m.id     AS marca_id,
  m.nombre AS marca_nombre,
  m.logo_url AS marca_logo
`;

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

/** `images_urls` es TEXT con CSV y admite NULL: nunca hacer split sobre null. */
const toImages = (value: string | null): string[] =>
  (value ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

function mapCelular(row: CelularRow): Celular {
  return {
    id: row.id,
    marca: { id: row.marca_id, nombre: row.marca_nombre, logo: row.marca_logo },
    images_url: toImages(row.images_urls),
    modelo: row.modelo,
    precio: Number(row.precio),
    fecha_lanzamiento: row.fecha_lanzamiento,
    created_at: toIso(row.created_at),
  };
}

export interface ListarCelularesInput {
  filtros: FiltroEntry[];
  pagination: Pagination;
}

export interface ListarCelularesResult {
  data: Celular[];
  meta: PaginationMeta;
}

export async function listarCelulares({
  filtros,
  pagination,
}: ListarCelularesInput): Promise<ListarCelularesResult> {
  let whereFilter: string = "TRUE";
  const params: string[] = [];
  const startIndex = 1;

  if (filtros.length !== 0) {
    const conditions = filtros.map(({ key, value }) => {
      params.push(`%${escapeLike(value)}%`);
      return `e.${key}::text ILIKE $${startIndex + params.length - 1} ESCAPE '\\'`;
    });

    whereFilter = conditions.join(" AND ");
  }

  const limitIndex = params.length + 1;

  // El JOIN con especificaciones siempre está presente porque todas las keys
  // filtrables viven en esa tabla, pero es LEFT: la ficha técnica es opcional
  // (la FK 1:1 vive en `especificaciones.celular_id`) y un celular sin ficha
  // debe seguir apareciendo en el catálogo. Con filtro no hay que excluirlo a
  // mano: NULL nunca hace match con el ILIKE.
  // `modelo ASC` es obligatorio como segundo criterio: sin él, los modelos que
  // comparten fecha (17 Pro / Pro Max) pueden repetirse o desaparecer entre
  // páginas.
  const rows = await query<CelularListRow>(
    `SELECT ${CAMPOS}, COUNT(*) OVER() AS total_count
     FROM celulares c
     JOIN marcas m ON m.id = c.marca_id
     LEFT JOIN especificaciones e ON e.celular_id = c.id
     WHERE ${whereFilter}
     ORDER BY c.fecha_lanzamiento DESC, c.modelo ASC
     LIMIT $${limitIndex} OFFSET $${limitIndex + 1}`,
    [...params, pagination.limit, pagination.offset],
  );

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { data: rows.map(mapCelular), meta: buildMeta(total, pagination) };
}

export async function obtenerCelular(
  id: string,
): Promise<CelularDetalle | null> {
  // Los dos LEFT JOIN son obligatorios: con JOIN, un celular sin comentarios —o
  // sin ficha técnica, que ahora es opcional— devolvería 404.
  // `especificaciones.celular_id` es UNIQUE, así que ese LEFT JOIN aporta como
  // mucho una fila y no multiplica los comentarios del AVG.
  const row = await queryOne<CelularDetalleRow>(
    `SELECT ${CAMPOS},
            e.id AS especificacion_id,
            COALESCE(ROUND(AVG(co.calificacion)::numeric, 1), 0) AS valoracion
     FROM celulares c
     JOIN marcas m ON m.id = c.marca_id
     LEFT JOIN especificaciones e ON e.celular_id = c.id
     LEFT JOIN comentarios co ON co.celular_id = c.id
     WHERE c.id = $1
     GROUP BY c.id, m.id, e.id`,
    [id],
  );

  if (!row) return null;

  return {
    ...mapCelular(row),
    especificacion_id: row.especificacion_id,
    valoracion: Number(row.valoracion),
  };
}

/**
 * 5 sugeridos: primero los posteriores al de referencia (del más cercano al más
 * lejano) y, si no se completan 5, se rellena con los más recientes del
 * catálogo. Se resuelve en una sola consulta con el ORDER BY compuesto.
 */
export async function obtenerSugeridos(
  celularId: string,
): Promise<Celular[] | null> {
  const referencia = await queryOne<{ fecha_lanzamiento: string }>(
    "SELECT fecha_lanzamiento FROM celulares WHERE id = $1",
    [celularId],
  );

  if (!referencia) return null;

  const rows = await query<CelularRow>(
    `SELECT ${CAMPOS}
     FROM celulares c
     JOIN marcas m ON m.id = c.marca_id
     WHERE c.id <> $1
     ORDER BY (c.fecha_lanzamiento > $2::date) DESC,
              CASE WHEN c.fecha_lanzamiento > $2::date THEN c.fecha_lanzamiento END ASC,
              c.fecha_lanzamiento DESC,
              c.modelo ASC
     LIMIT 4`,
    [celularId, referencia.fecha_lanzamiento],
  );

  return rows.map(mapCelular);
}
