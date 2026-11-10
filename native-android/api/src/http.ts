import type { ErrorRequestHandler, Response } from "express";

/**
 * Sobre de respuesta y errores, el mismo contrato que la API del Next:
 *
 *   { success: true,  data, meta? }
 *   { success: false, error: { code, message, details? } }
 */

const STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

export type CodigoError = keyof typeof STATUS;

export class ApiError extends Error {
  readonly code: CodigoError;
  readonly status: number;
  readonly details: unknown;

  constructor(code: CodigoError, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError("BAD_REQUEST", message, details);
export const unauthorized = (message = "Sesión no válida o caducada") =>
  new ApiError("UNAUTHORIZED", message);
export const forbidden = (message = "No tienes permiso para esta acción") =>
  new ApiError("FORBIDDEN", message);
export const notFound = (message = "Recurso no encontrado") => new ApiError("NOT_FOUND", message);
export const conflict = (message: string, details?: unknown) =>
  new ApiError("CONFLICT", message, details);
export const tooManyRequests = (message: string) => new ApiError("TOO_MANY_REQUESTS", message);

/** 400 con el mapa campo -> mensaje, como `details.campos` del Next. */
export const camposInvalidos = (campos: Record<string, string>, message = "Datos no válidos") =>
  badRequest(message, { campos });

export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export function ok(res: Response, data: unknown, meta?: Meta) {
  return res.status(200).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function created(res: Response, data: unknown) {
  return res.status(201).json({ success: true, data });
}

/**
 * Traduce violaciones de restricciones de Postgres a errores HTTP **por nombre
 * de restricción**. Una misma restricción significa cosas distintas según la
 * operación, así que cada ruta pasa su propio mapa:
 *
 *   await conRestricciones(() => query(...), {
 *     marcas_nombre_key: () => conflict("Ya existe una marca con ese nombre"),
 *   });
 */
export async function conRestricciones<T>(
  fn: () => Promise<T>,
  mapa: Record<string, () => ApiError>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const restriccion = (error as { constraint?: string }).constraint;
    const traducir = restriccion ? mapa[restriccion] : undefined;
    if (traducir) throw traducir();
    throw error;
  }
}

/** Middleware final: cualquier excepción sale con el sobre de error. */
export const manejadorErrores: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ApiError) {
    const cuerpo: Record<string, unknown> = { code: error.code, message: error.message };
    if (error.details !== undefined) cuerpo.details = error.details;
    res.status(error.status).json({ success: false, error: cuerpo });
    return;
  }

  // Errores de express.json(): cuerpo mal formado o demasiado grande.
  const tipo = (error as { type?: string }).type;
  if (tipo === "entity.parse.failed" || tipo === "entity.too.large") {
    res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: tipo === "entity.parse.failed" ? "El cuerpo no es un JSON válido" : "El cuerpo es demasiado grande",
      },
    });
    return;
  }

  console.error(`[api] ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
};

/** Paginación: page 1-based, limit por defecto 12 y tope 50 (como el Next). */
export function paginacion(q: Record<string, unknown>, limitePorDefecto = 12) {
  const page = Math.max(1, Number.parseInt(String(q.page ?? ""), 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(q.limit ?? ""), 10) || limitePorDefecto));
  return { page, limit, offset: (page - 1) * limit };
}

export function meta(p: { page: number; limit: number }, total: number): Meta {
  const totalPages = Math.max(1, Math.ceil(total / p.limit));
  return { page: p.page, limit: p.limit, total, totalPages, hasNextPage: p.page < totalPages };
}
