/**
 * Contratos compartidos entre la API (app/api/**) y la UI (src/components/**).
 * Cualquier cambio aquí es un cambio de contrato: revisar AGENTS.md §4.
 */

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

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

/**
 * Usuario del backoffice. Nunca lleva `password_hash`: esa columna no sale de
 * `src/lib/queries/usuarios.ts`.
 */
export interface Usuario {
  id: string;
  documento: string;
  nombre: string;
  is_active: boolean;
  created_at: string;
}

/** `GET /api/sesion`: la sesión en curso. */
export interface Sesion {
  usuario: Usuario;
  expires_at: string; // ISO-8601: el mismo instante que el `exp` del JWT
}

/**
 * `POST /api/sesion`. El JWT viaja en una cookie HttpOnly y, además, en el
 * cuerpo, para los clientes que no son un navegador (`Authorization: Bearer`).
 */
export interface SesionIniciada extends Sesion {
  token: string;
}

/** Marca completa: `GET /api/marcas`, `GET /api/marcas/[id]` y respuesta de sus escrituras. */
export interface MarcaDetalle extends Marca {
  pais_origen: string;
  created_at: string;
}

/*
 * Cuerpos de escritura del catálogo (§4). Todos exigen la sesión de un usuario
 * activo. `POST` manda la entrada completa; `PATCH` acepta cualquier
 * subconjunto no vacío.
 *
 * Los nombres son los de la API, no los de la BD: `logo` (no `logo_url`) e
 * `images_url` como array (no el CSV `images_urls`).
 */

export interface MarcaEntrada {
  nombre: string;
  pais_origen: string;
  logo: string | null;
}

export interface CelularEntrada {
  marca_id: string;
  modelo: string;
  precio: number;
  fecha_lanzamiento: string; // "YYYY-MM-DD"
  images_url: string[];
}

/** Los 7 campos técnicos, con las mismas keys que `SPEC_FIELDS`. */
export interface FichaTecnica {
  procesador: string;
  ram: string;
  almacenamiento: string;
  pantalla: string;
  camara: string;
  bateria: string;
  sistema_op: string;
}

/** `celular_id` solo va en el alta: una ficha no se reasigna a otro celular. */
export interface EspecificacionEntrada extends FichaTecnica {
  celular_id: string;
}
