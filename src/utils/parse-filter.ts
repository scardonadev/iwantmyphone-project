import { badRequest } from "@lib/http";
import { SPEC_FIELDS, type SpecField } from "@utils/spec-fields";

/**
 * Filtros del listado de celulares. Ver AGENTS.md §5.
 *
 * Formato: `?filter={"ram":"8 GB"}` — JSON estricto, así que el parser es
 * `JSON.parse` y nada más. Sin operadores: toda condición es un ILIKE parcial.
 */

/** Los 7 campos técnicos más `created_at`, que no se ofrece como select. */
export const FILTRO_KEYS = [...SPEC_FIELDS, "created_at"] as const;

export type FiltroKey = SpecField | "created_at";

export interface FiltroEntry {
  key: FiltroKey;
  value: string;
}

const KEYS = new Set<string>(FILTRO_KEYS);
const MAX_DEPTH = 2;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Aplana el objeto de filtros. La forma anidada `{"especificaciones":{"ram":"8 GB"}}`
 * es una agrupación por entidad: solo cuentan las hojas, y cada hoja se valida
 * contra la whitelist. Un único recorrido para las dos formas.
 */
function flatten(
  input: Record<string, unknown>,
  depth: number,
  out: FiltroEntry[],
): void {
  if (depth > MAX_DEPTH) {
    throw badRequest("El filtro tiene demasiados niveles de anidamiento");
  }

  for (const [key, value] of Object.entries(input)) {
    if (isPlainObject(value)) {
      flatten(value, depth + 1, out);
      continue;
    }

    if (typeof value !== "string") {
      throw badRequest(`El valor de \`${key}\` debe ser un string`, {
        key,
        value,
      });
    }

    if (!KEYS.has(key)) {
      throw badRequest(`\`${key}\` no es una key filtrable`, {
        key,
        permitidas: [...FILTRO_KEYS],
      });
    }

    const trimmed = value.trim();
    if (trimmed) out.push({ key: key as FiltroKey, value: trimmed });
  }
}

export function parseFilter(raw: string | null | undefined): FiltroEntry[] {
  if (!raw || !raw.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw badRequest(
      'El parámetro `filter` debe ser JSON válido, con comillas dobles. Ej: {"ram":"8 GB"}',
      { filter: raw },
    );
  }

  if (!isPlainObject(parsed)) {
    throw badRequest("El parámetro `filter` debe ser un objeto");
  }

  const entries: FiltroEntry[] = [];
  flatten(parsed, 1, entries);
  return entries;
}

/**
 * `%` y `_` son comodines de LIKE: sin escaparlos, un valor con `_` haría
 * match de cualquier carácter y devolvería resultados de más.
 */
export const escapeLike = (value: string) =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);
