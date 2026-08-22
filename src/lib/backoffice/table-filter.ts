/**
 * Filtros de las tablas del dashboard.
 *
 * Mismo formato que los filtros del frontend público (AGENTS.md §5):
 * `?filter={"key":"value"}` en JSON estricto, y la forma anidada
 * `{"celulares":{"modelo":"pro"}}` se aplana a las hojas. Lo que cambia es el
 * origen y el destino: aquí los valores vienen de un `<input>` por columna y el
 * filtrado se resuelve en cliente, no en SQL.
 *
 * Esa simetría es lo que hace que funcionen los enlaces entre tablas: el botón
 * de "ver" de Celulares apunta a
 * `/dashboard/especificaciones?filter={"celular_id":"…"}` y la tabla de destino
 * lo entiende sin ninguna traducción intermedia.
 *
 * Un `filter` corrupto **no tumba la vista**: se ignora y se muestra la tabla
 * completa, igual que en la Home pública.
 */

export type FiltroTabla = Record<string, string>;

const MAX_DEPTH = 2;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function flatten(input: Record<string, unknown>, depth: number, out: FiltroTabla): void {
  if (depth > MAX_DEPTH) return;

  for (const [key, value] of Object.entries(input)) {
    if (isPlainObject(value)) {
      flatten(value, depth + 1, out);
      continue;
    }
    // Un valor no-string se descarta en silencio: en la API es un 400, pero una
    // URL editada a mano no debe dejar el panel inservible.
    if (typeof value !== "string") continue;

    const trimmed = value.trim();
    if (trimmed) out[key] = trimmed;
  }
}

export function leerFiltro(raw: string | string[] | undefined): FiltroTabla {
  const valor = Array.isArray(raw) ? raw[0] : raw;
  if (!valor?.trim()) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(valor);
  } catch {
    return {};
  }
  if (!isPlainObject(parsed)) return {};

  const filtro: FiltroTabla = {};
  flatten(parsed, 1, filtro);
  return filtro;
}

/** Serializa a query string. Sin filtros activos devuelve "" (no `?filter={}`). */
export function escribirFiltro(filtro: FiltroTabla): string {
  const activos = Object.entries(filtro).filter(([, value]) => value.trim());
  if (activos.length === 0) return "";
  return `?filter=${encodeURIComponent(JSON.stringify(Object.fromEntries(activos)))}`;
}

/** Enlace profundo a otra tabla ya filtrada: la base de los botones de "ver". */
export const enlaceFiltrado = (ruta: string, filtro: FiltroTabla) =>
  `${ruta}${escribirFiltro(filtro)}`;

/** Equivalente en cliente de `ILIKE '%valor%'` con los comodines escapados. */
export const coincide = (valor: string, patron: string) =>
  valor.toLowerCase().includes(patron.trim().toLowerCase());

/**
 * Aplica todos los filtros activos con `AND`, igual que la API.
 * `textoDeColumna` devuelve `null` cuando la columna no es filtrable.
 */
export function filtrarFilas<T>(
  filas: T[],
  filtro: FiltroTabla,
  textoDeColumna: (fila: T, key: string) => string | null,
): T[] {
  const activos = Object.entries(filtro).filter(([, value]) => value.trim());
  if (activos.length === 0) return filas;

  return filas.filter((fila) =>
    activos.every(([key, value]) => {
      const texto = textoDeColumna(fila, key);
      return texto === null ? true : coincide(texto, value);
    }),
  );
}
