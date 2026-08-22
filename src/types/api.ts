/**
 * Contratos compartidos entre la API (app/api/**) y la UI (src/components/**).
 * Cualquier cambio aquí es un cambio de contrato: revisar AGENTS.md §4.
 */

export type ApiErrorCode = "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export type ApiSuccess<T> = { success: true; data: T; meta?: PaginationMeta };
export type ApiFailure = { success: false; error: ApiError };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Marca {
  id: string;
  nombre: string;
  logo: string | null;
}

/** Item del listado y de sugeridos. */
export interface Celular {
  id: string;
  marca: Marca;
  images_url: string[];
  modelo: string;
  precio: number;
  fecha_lanzamiento: string;
  created_at: string;
}

/**
 * Detalle: añade la especificación asociada y el promedio de valoraciones.
 *
 * `especificacion_id` es nullable: la ficha técnica es una relación 1:1
 * *opcional* (la FK vive en `especificaciones.celular_id`), así que un celular
 * puede no tener ninguna.
 */
export interface CelularDetalle extends Celular {
  especificacion_id: string | null;
  valoracion: number;
}

/** Par key/value: formato de `especificaciones` y base de la tabla del detalle. */
export interface SpecEntry {
  key: string;
  value: string;
}

export interface Especificacion {
  id: string;
  created_at: string;
  especificaciones: SpecEntry[];
}

export interface SpecOption {
  key: string;
  values: string[];
}

export interface OpcionesFiltro {
  options: SpecOption[];
}

export interface Comentario {
  id: string;
  nombre: string;
  mensaje: string;
  calificacion: number;
  fecha: string;
}
