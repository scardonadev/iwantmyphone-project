/**
 * Contratos del backoffice. Ver AGENTS.md §3 (esquema) y §4 (API pública).
 *
 * A diferencia de `src/types/api.ts` —que describe lo que la API *expone*—
 * aquí se modelan las **filas de la BD tal cual**: el dashboard edita registros,
 * no DTOs. Por eso se conservan los nombres de columna (`images_urls`,
 * `logo_url`, `marca_id`) en lugar de los renombres de la API pública
 * (`images_url`, `marca.logo`).
 */

export interface MarcaRecord {
  id: string;
  nombre: string;
  logo_url: string | null;
  pais_origen: string;
  created_at: string;
}

/** `images_urls` es TEXT con CSV y admite NULL (AGENTS.md §3). */
export interface CelularRecord {
  id: string;
  marca_id: string;
  images_urls: string | null;
  modelo: string;
  precio: number;
  fecha_lanzamiento: string;
  created_at: string;
}

/**
 * 1:1 con `celulares`: la FK vive aquí y es UNIQUE, así que `celular_id`
 * identifica la ficha y **no se puede reasignar** desde el dashboard.
 */
export interface EspecificacionRecord {
  id: string;
  celular_id: string;
  procesador: string;
  ram: string;
  almacenamiento: string;
  pantalla: string;
  camara: string;
  bateria: string;
  sistema_op: string;
  created_at: string;
}

/** Solo lectura en el dashboard: los comentarios llegan del frontend público. */
export interface ComentarioRecord {
  id: string;
  celular_id: string;
  nombre: string;
  mensaje: string;
  calificacion: number;
  fecha: string;
}

export interface Dataset {
  marcas: MarcaRecord[];
  celulares: CelularRecord[];
  especificaciones: EspecificacionRecord[];
  comentarios: ComentarioRecord[];
}

/** Payloads de escritura: sin `id` ni `created_at`, que los genera el servidor. */
export type MarcaInput = Omit<MarcaRecord, "id" | "created_at">;
export type CelularInput = Omit<CelularRecord, "id" | "created_at">;
export type EspecificacionInput = Omit<EspecificacionRecord, "id" | "created_at">;
