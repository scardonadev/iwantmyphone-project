import { query } from "@lib/db";
import type {
  CelularRecord,
  ComentarioRecord,
  Dataset,
  EspecificacionRecord,
  MarcaRecord,
} from "@lib/backoffice/types";
import { SPEC_FIELDS } from "@utils/spec-fields";

/**
 * Lectura completa del panel, en **filas de la BD** (`@lib/backoffice/types`)
 * y no en los DTO de §4: el panel edita registros.
 *
 * La usan el layout del dashboard (Server Component, directo, AGENTS.md §2) y
 * `GET /api/backoffice/dataset`, que es la relectura tras cada escritura. Son
 * cuatro consultas en paralelo y sin paginar: el catálogo son decenas de filas
 * (§7, decisión 4).
 */

/** "Últimos agregados" pinta 10 comentarios: no tiene sentido traer más. */
const COMENTARIOS_RECIENTES = 10;

/** La fila tal como llega de `pg`: los TIMESTAMP son `Date`. */
type Fila<T, K extends keyof T> = Omit<T, K> & Record<K, Date | string>;

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

export async function cargarDatasetBackoffice(): Promise<Dataset> {
  const [marcas, celulares, especificaciones, comentarios] = await Promise.all([
    query<Fila<MarcaRecord, "created_at">>(
      `SELECT id, nombre, logo_url, pais_origen, created_at
       FROM marcas
       ORDER BY nombre ASC, id ASC`,
    ),
    query<Fila<CelularRecord, "created_at">>(
      `SELECT id, marca_id, images_urls, modelo, precio, fecha_lanzamiento, created_at
       FROM celulares
       ORDER BY fecha_lanzamiento DESC, modelo ASC`,
    ),
    // Mismo orden que Celulares, para que las dos tablas se lean igual.
    query<Fila<EspecificacionRecord, "created_at">>(
      `SELECT e.id, e.celular_id, ${SPEC_FIELDS.map((campo) => `e.${campo}`).join(", ")}, e.created_at
       FROM especificaciones e
       JOIN celulares c ON c.id = e.celular_id
       ORDER BY c.fecha_lanzamiento DESC, c.modelo ASC`,
    ),
    query<Fila<ComentarioRecord, "fecha">>(
      `SELECT id, celular_id, nombre, mensaje, calificacion, fecha
       FROM comentarios
       ORDER BY fecha DESC, id ASC
       LIMIT $1`,
      [COMENTARIOS_RECIENTES],
    ),
  ]);

  return {
    marcas: marcas.map((marca) => ({ ...marca, created_at: toIso(marca.created_at) })),
    celulares: celulares.map((celular) => ({
      ...celular,
      precio: Number(celular.precio),
      created_at: toIso(celular.created_at),
    })),
    especificaciones: especificaciones.map((ficha) => ({
      ...ficha,
      created_at: toIso(ficha.created_at),
    })),
    comentarios: comentarios.map((comentario) => ({
      ...comentario,
      calificacion: Number(comentario.calificacion),
      fecha: toIso(comentario.fecha),
    })),
  };
}
