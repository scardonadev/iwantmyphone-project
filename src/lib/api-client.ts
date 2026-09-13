import type { ApiResponse, PaginationMeta } from "@/src/types/api";

/**
 * Cliente REST para Client Components. Los Server Components NO pasan por aquí:
 * importan las funciones de `src/lib/queries/*` directamente (AGENTS.md §2).
 *
 * Punto único de acoplamiento con la URL del backend: si algún día se separa a
 * un servicio propio, solo cambia BASE.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    /** `error.details` de la API, p. ej. `{ campos: { modelo: "…" } }`. */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: PaginationMeta;
}

async function leerRespuesta<T>(response: Response): Promise<ApiResult<T>> {
  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError("Respuesta no válida del servidor", "INTERNAL_ERROR");
  }

  if (!body.success) {
    throw new ApiClientError(body.error.message, body.error.code, body.error.details);
  }

  return { data: body.data, meta: body.meta };
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<ApiResult<T>> {
  const response = await fetch(`${BASE}${path}`, { signal, headers: { Accept: "application/json" } });
  return leerRespuesta<T>(response);
}

/**
 * Escrituras, con el cuerpo como JSON.
 *
 * La cookie de sesión viaja sola porque la API es del mismo origen. Si BASE
 * pasa a apuntar a otro dominio, harán falta `credentials: "include"` aquí y
 * CORS con credenciales en el backend.
 */
export async function apiSend<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers:
      body === undefined
        ? { Accept: "application/json" }
        : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return leerRespuesta<T>(response);
}

/** Serializa los filtros al formato JSON estricto que espera la API (§5). */
export function buildCelularesQuery(params: {
  filtros?: Record<string, string>;
  page?: number;
  limit?: number;
}): string {
  const search = new URLSearchParams();
  const activos = Object.entries(params.filtros ?? {}).filter(([, value]) => value);

  if (activos.length > 0) {
    search.set("filter", JSON.stringify(Object.fromEntries(activos)));
  }
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));

  const query = search.toString();
  return query ? `?${query}` : "";
}
