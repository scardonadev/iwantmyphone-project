import { clausulaSet, query, queryOne } from "@lib/db";
import { SPEC_FIELDS } from "@utils/spec-fields";
import type {
  Especificacion,
  EspecificacionEntrada,
  FichaTecnica,
  OpcionesFiltro,
  SpecEntry,
} from "@/src/types/api";

type EspecificacionRow = {
  id: string;
  created_at: Date | string;
} & Record<(typeof SPEC_FIELDS)[number], string>;

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

/** Constante del módulo, nunca entrada del usuario: se puede interpolar. */
const COLUMNAS = `id, ${SPEC_FIELDS.join(", ")}, created_at`;

function mapEspecificacion(row: EspecificacionRow): Especificacion {
  // El array sale siempre con las 7 filas y en el orden de SPEC_FIELDS: la tabla
  // del detalle lo renderiza tal cual, sin reordenar.
  const especificaciones: SpecEntry[] = SPEC_FIELDS.map((key) => ({
    key,
    value: row[key],
  }));

  return { id: row.id, created_at: toIso(row.created_at), especificaciones };
}

export async function obtenerEspecificacion(
  id: string,
): Promise<Especificacion | null> {
  const row = await queryOne<EspecificacionRow>(
    `SELECT ${COLUMNAS}
     FROM especificaciones
     WHERE id = $1`,
    [id],
  );

  return row ? mapEspecificacion(row) : null;
}

/**
 * Alta de ficha técnica. Pueden saltar dos restricciones:
 * `especificaciones_celular_id_key` (el celular ya tiene ficha: la relación es
 * 1:1) y `fk_especificaciones_celulares` (el celular no existe).
 */
export async function crearEspecificacion(
  entrada: EspecificacionEntrada,
): Promise<Especificacion> {
  const columnas = ["celular_id", ...SPEC_FIELDS] as const;
  const row = await queryOne<EspecificacionRow>(
    `INSERT INTO especificaciones (${columnas.join(", ")})
     VALUES (${columnas.map((_, i) => `$${i + 1}`).join(", ")})
     RETURNING ${COLUMNAS}`,
    columnas.map((columna) => entrada[columna]),
  );
  if (!row) throw new Error("INSERT INTO especificaciones no devolvió la fila");
  return mapEspecificacion(row);
}

/**
 * PATCH: solo los campos técnicos que vienen. `celular_id` no se toca nunca.
 * `null` si la ficha no existe.
 */
export async function actualizarEspecificacion(
  id: string,
  cambios: Partial<FichaTecnica>,
): Promise<Especificacion | null> {
  // SPEC_FIELDS es la whitelist: se recorre ella, no las claves de `cambios`.
  const columnas = Object.fromEntries(
    SPEC_FIELDS.filter((campo) => cambios[campo] !== undefined).map((campo) => [
      campo,
      cambios[campo],
    ]),
  );
  const { sql, valores } = clausulaSet(columnas, 2);
  const row = await queryOne<EspecificacionRow>(
    `UPDATE especificaciones SET ${sql} WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, ...valores],
  );
  return row ? mapEspecificacion(row) : null;
}

/** `false` si no existía. El celular sigue ahí, sin ficha (la relación es opcional). */
export async function eliminarEspecificacion(id: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM especificaciones WHERE id = $1 RETURNING id",
    [id],
  );
  return row !== null;
}

/**
 * Valores distintos por campo para poblar los selects de la Home.
 * El UNION (no ALL) deduplica los pares key/value, así que hace de DISTINCT y
 * resuelve los 7 campos en un solo round-trip. El nombre de columna nunca viene
 * del usuario: sale de la constante SPEC_FIELDS.
 */
export async function obtenerOpciones(): Promise<OpcionesFiltro> {
  const union = SPEC_FIELDS.map(
    (field) =>
      `SELECT '${field}' AS key, ${field} AS value FROM especificaciones WHERE ${field} IS NOT NULL AND ${field} <> ''`,
  ).join(" UNION ");

  const rows = await query<{ key: string; value: string }>(union);

  // Agrupa por campo para que cada select tenga su propio array de valores.
  const rowsByField = Object.fromEntries(
    SPEC_FIELDS.map((field) => [
      field,
      rows.filter((row) => row.key === field).map((row) => row.value),
    ]),
  );

  // Orden natural, no lexicográfico: `ORDER BY` en SQL deja "128 MB" antes que
  // "1 GB", y "Apple A19" antes que "Apple A4". La colación numérica ordena los
  // dígitos por valor, que es como se leen estos desplegables.
  const collator = new Intl.Collator("es", {
    numeric: true,
    sensitivity: "base",
  });

  return {
    options: SPEC_FIELDS.map((key) => ({
      key,
      values: (rowsByField[key] ?? []).sort(collator.compare),
    })),
  };
}
