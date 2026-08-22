import { query, queryOne } from "@lib/db";
import { SPEC_FIELDS } from "@utils/spec-fields";
import type {
  Especificacion,
  OpcionesFiltro,
  SpecEntry,
} from "@/src/types/api";

type EspecificacionRow = {
  id: string;
  created_at: Date | string;
} & Record<(typeof SPEC_FIELDS)[number], string>;

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

export async function obtenerEspecificacion(
  id: string,
): Promise<Especificacion | null> {
  const row = await queryOne<EspecificacionRow>(
    `SELECT id, ${SPEC_FIELDS.join(", ")}, created_at
     FROM especificaciones
     WHERE id = $1`,
    [id],
  );

  if (!row) return null;

  // El array sale siempre con las 7 filas y en el orden de SPEC_FIELDS: la tabla
  // del detalle lo renderiza tal cual, sin reordenar.
  const especificaciones: SpecEntry[] = SPEC_FIELDS.map((key) => ({
    key,
    value: row[key],
  }));

  return { id: row.id, created_at: toIso(row.created_at), especificaciones };
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

  console.log("rowsByField", rowsByField);

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
