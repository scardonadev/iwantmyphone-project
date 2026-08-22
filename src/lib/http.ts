import { NextResponse } from "next/server";
import type { ApiErrorCode, ApiFailure, ApiSuccess, PaginationMeta } from "@/src/types/api";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

/** Error de dominio que los route handlers traducen a una respuesta JSON. */
export class HttpError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError("BAD_REQUEST", message, details);

export const notFound = (message: string) => new HttpError("NOT_FOUND", message);

export function ok<T>(data: T, meta?: PaginationMeta) {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  return NextResponse.json(body);
}

export function fail(error: HttpError) {
  const body: ApiFailure = {
    success: false,
    error: { code: error.code, message: error.message, details: error.details },
  };
  return NextResponse.json(body, { status: STATUS_BY_CODE[error.code] });
}

/**
 * Envuelve el cuerpo de un route handler: convierte HttpError en su respuesta
 * y cualquier otro fallo en un 500 sin filtrar detalles internos al cliente.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) return fail(error);

    console.error("[api] error no controlado:", error);
    return fail(new HttpError("INTERNAL_ERROR", "Error interno del servidor"));
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida un UUID antes de tocar la BD: un id inválido es 400, nunca 500. */
export function requireUuid(value: string | null, campo: string): string {
  if (!value) throw badRequest(`El parámetro \`${campo}\` es obligatorio`);
  if (!UUID_RE.test(value)) throw badRequest(`\`${campo}\` no es un UUID válido`, { value });
  return value;
}

export const isUuid = (value: string) => UUID_RE.test(value);
