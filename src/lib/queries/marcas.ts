import { clausulaSet, query, queryOne } from "@lib/db";
import { buildMeta, type Pagination } from "@utils/pagination";
import type { MarcaDetalle, MarcaEntrada, PaginationMeta } from "@/src/types/api";

interface MarcaRow {
  id: string;
  nombre: string;
  logo_url: string | null;
  pais_origen: string;
  created_at: Date | string;
}

interface MarcaListRow extends MarcaRow {
  total_count: number | string;
}

/** Constante del módulo, nunca entrada del usuario: se puede interpolar. */
const COLUMNAS = "id, nombre, logo_url, pais_origen, created_at";

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

/** Renombre BD → API (§3): `logo_url` → `logo`. */
function mapMarca(row: MarcaRow): MarcaDetalle {
  return {
    id: row.id,
    nombre: row.nombre,
    logo: row.logo_url,
    pais_origen: row.pais_origen,
    created_at: toIso(row.created_at),
  };
}

/** Entrada de la API → columnas. Mapeo fijo: ninguna clave sale del cuerpo. */
function columnasDeMarca(entrada: Partial<MarcaEntrada>): Record<string, unknown> {
  const columnas: Record<string, unknown> = {};
  if (entrada.nombre !== undefined) columnas.nombre = entrada.nombre;
  if (entrada.pais_origen !== undefined) columnas.pais_origen = entrada.pais_origen;
  if (entrada.logo !== undefined) columnas.logo_url = entrada.logo;
  return columnas;
}

export async function listarMarcas(
  pagination: Pagination,
): Promise<{ data: MarcaDetalle[]; meta: PaginationMeta }> {
  const rows = await query<MarcaListRow>(
    `SELECT ${COLUMNAS}, COUNT(*) OVER() AS total_count
     FROM marcas
     ORDER BY nombre ASC, id ASC
     LIMIT $1 OFFSET $2`,
    [pagination.limit, pagination.offset],
  );

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { data: rows.map(mapMarca), meta: buildMeta(total, pagination) };
}

export async function obtenerMarca(id: string): Promise<MarcaDetalle | null> {
  const row = await queryOne<MarcaRow>(`SELECT ${COLUMNAS} FROM marcas WHERE id = $1`, [id]);
  return row ? mapMarca(row) : null;
}

/**
 * ¿Hay otra marca con ese nombre, sin distinguir mayúsculas?
 *
 * El UNIQUE de `marcas.nombre` sí distingue ("Apple" y "apple" cabrían), así
 * que la regla la pone esta comprobación. El UNIQUE queda como red ante una
 * carrera con el mismo nombre exacto.
 */
export async function existeMarcaConNombre(
  nombre: string,
  exceptoId: string | null = null,
): Promise<boolean> {
  const row = await queryOne<{ existe: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM marcas
       WHERE lower(nombre) = lower($1)
         AND ($2::uuid IS NULL OR id <> $2::uuid)
     ) AS existe`,
    [nombre, exceptoId],
  );
  return row?.existe ?? false;
}

export async function crearMarca(entrada: MarcaEntrada): Promise<MarcaDetalle> {
  const row = await queryOne<MarcaRow>(
    `INSERT INTO marcas (nombre, pais_origen, logo_url)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNAS}`,
    [entrada.nombre, entrada.pais_origen, entrada.logo],
  );
  if (!row) throw new Error("INSERT INTO marcas no devolvió la fila");
  return mapMarca(row);
}

/** PATCH: solo las columnas que vienen. `null` si la marca no existe. */
export async function actualizarMarca(
  id: string,
  cambios: Partial<MarcaEntrada>,
): Promise<MarcaDetalle | null> {
  const { sql, valores } = clausulaSet(columnasDeMarca(cambios), 2);
  const row = await queryOne<MarcaRow>(
    `UPDATE marcas SET ${sql} WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, ...valores],
  );
  return row ? mapMarca(row) : null;
}

/**
 * `false` si no existía. Con celulares asociados, Postgres lanza 23503
 * (`fk_celulares_marcas`, ON DELETE RESTRICT) y la ruta lo traduce a 409.
 */
export async function eliminarMarca(id: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>("DELETE FROM marcas WHERE id = $1 RETURNING id", [id]);
  return row !== null;
}
