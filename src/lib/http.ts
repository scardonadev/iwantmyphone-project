import { NextResponse } from "next/server";
import type { ApiErrorCode, ApiFailure, ApiSuccess, PaginationMeta } from "@/src/types/api";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
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

export const unauthorized = (message: string) => new HttpError("UNAUTHORIZED", message);

export const forbidden = (message: string) => new HttpError("FORBIDDEN", message);

export const notFound = (message: string) => new HttpError("NOT_FOUND", message);

export const conflict = (message: string) => new HttpError("CONFLICT", message);

export function ok<T>(data: T, meta?: PaginationMeta) {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  return NextResponse.json(body);
}

/** 201 para las altas: mismo sobre `{ success, data }` que `ok()`. */
export function created<T>(data: T) {
  const body: ApiSuccess<T> = { success: true, data };
  return NextResponse.json(body, { status: 201 });
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

/**
 * Cuerpo JSON de una escritura. Si no parsea o no es un objeto es un 400, como
 * un `filter` corrupto en los GET (§5): nunca un 500.
 */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("El cuerpo de la petición no es JSON válido");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("El cuerpo de la petición debe ser un objeto JSON");
  }
  return body as Record<string, unknown>;
}

/**
 * Campo de texto del cuerpo. Cualquier otro tipo cuenta como ausente (`""`),
 * así que llega al validador del campo y sale con su mensaje de "obligatorio".
 */
export function readString(body: Record<string, unknown>, campo: string): string {
  const valor = body[campo];
  return typeof valor === "string" ? valor : "";
}

/** Restricción violada en un error de `pg`: 23505 (UNIQUE) o 23503 (FK). */
function restriccionViolada(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const { code, constraint } = error as { code?: unknown; constraint?: unknown };
  return (code === "23505" || code === "23503") && typeof constraint === "string"
    ? constraint
    : null;
}

/**
 * Ejecuta una escritura y traduce las violaciones de UNIQUE y de FK a errores
 * HTTP, por nombre de restricción (los de `seed.sql`).
 *
 * La BD es la garantía: comprobar antes y escribir después deja una carrera, y
 * la restricción no. Cada ruta decide qué significa cada restricción en su
 * contexto: `fk_celulares_marcas` es un 400 ("la marca no existe") al crear un
 * celular, y un 409 ("la marca tiene celulares") al borrar una marca.
 */
export async function conRestricciones<T>(
  escritura: () => Promise<T>,
  traducciones: Record<string, () => HttpError>,
): Promise<T> {
  try {
    return await escritura();
  } catch (error) {
    const restriccion = restriccionViolada(error);
    if (restriccion && Object.hasOwn(traducciones, restriccion)) {
      throw traducciones[restriccion]();
    }
    throw error;
  }
}
