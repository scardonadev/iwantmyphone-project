import { crearDatasetInicial } from "./mock-data";
import type {
  CelularInput,
  CelularRecord,
  Dataset,
  EspecificacionInput,
  EspecificacionRecord,
  MarcaInput,
  MarcaRecord,
} from "./types";

/**
 * Capa de datos del backoffice — **único punto de acoplamiento con el backend**.
 *
 * Hoy resuelve todo contra un dataset en memoria (`mock-data.ts`) porque los
 * endpoints de escritura todavía no existen. Cada método está anotado con la
 * ruta REST que lo sustituirá; cuando el backend esté, se reemplaza el cuerpo
 * por un `fetch` y **ninguna vista cambia**: la firma ya es asíncrona y ya
 * devuelve el registro creado/actualizado.
 *
 * Es el equivalente para escritura de lo que `@lib/api-client` es para lectura
 * en el frontend público (AGENTS.md §1).
 */

/** Error de dominio: la vista lo muestra en la fila, no en una pantalla de error. */
export class BackofficeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackofficeError";
  }
}

/**
 * El dataset vive a nivel de módulo, no dentro del provider: así sobrevive a
 * las navegaciones entre `/dashboard/*` (que remontan cada página) y una alta
 * en Marcas se ve al instante en el select de Celulares.
 */
let dataset: Dataset | null = null;

const db = (): Dataset => (dataset ??= crearDatasetInicial());

/** Latencia simulada: sin ella los estados de carga no se pueden probar. */
const LATENCIA_MS = 180;
const latencia = () => new Promise((resolve) => setTimeout(resolve, LATENCIA_MS));

const nuevoId = () => crypto.randomUUID();
const ahora = () => new Date().toISOString();

async function commit<T>(fn: () => T): Promise<T> {
  await latencia();
  return fn();
}

/**
 * Lectura completa del catálogo.
 *
 * Sin latencia simulada, al contrario que las escrituras: la lectura inicial la
 * resuelve el layout —un Server Component— antes de pintar, que es como accede
 * a datos el resto del proyecto (AGENTS.md §2). El día que haya endpoints, esta
 * función pasa a ser un `Promise.all` de queries y nada más cambia.
 *
 * TODO(backend): sustituir por los `GET` de listado de cada entidad.
 */
export async function cargarDataset(): Promise<Dataset> {
  return structuredClone(db());
}

export const marcasApi = {
  /** TODO(backend): `POST /api/marcas`. */
  crear: (input: MarcaInput): Promise<MarcaRecord> =>
    commit(() => {
      const nombre = input.nombre.trim();
      if (db().marcas.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase())) {
        // `marcas.nombre` es UNIQUE en el esquema (AGENTS.md §3).
        throw new BackofficeError(`Ya existe una marca llamada "${nombre}"`);
      }

      const marca: MarcaRecord = {
        ...input,
        nombre,
        id: nuevoId(),
        created_at: ahora(),
      };
      db().marcas.push(marca);
      return structuredClone(marca);
    }),

  /** TODO(backend): `PATCH /api/marcas/[id]`. */
  actualizar: (id: string, input: MarcaInput): Promise<MarcaRecord> =>
    commit(() => {
      const marca = db().marcas.find((m) => m.id === id);
      if (!marca) throw new BackofficeError("La marca ya no existe");

      const nombre = input.nombre.trim();
      const duplicada = db().marcas.some(
        (m) => m.id !== id && m.nombre.toLowerCase() === nombre.toLowerCase(),
      );
      if (duplicada) throw new BackofficeError(`Ya existe una marca llamada "${nombre}"`);

      Object.assign(marca, input, { nombre });
      return structuredClone(marca);
    }),

  /** TODO(backend): `DELETE /api/marcas/[id]`. */
  eliminar: (id: string): Promise<void> =>
    commit(() => {
      // `celulares.marca_id` es ON DELETE RESTRICT: la BD rechazaría el borrado.
      const enUso = db().celulares.filter((c) => c.marca_id === id).length;
      if (enUso > 0) {
        throw new BackofficeError(
          `No se puede eliminar: ${enUso} ${enUso === 1 ? "celular usa" : "celulares usan"} esta marca`,
        );
      }

      db().marcas = db().marcas.filter((m) => m.id !== id);
    }),
};

export const celularesApi = {
  /** TODO(backend): `POST /api/celulares`. */
  crear: (input: CelularInput): Promise<CelularRecord> =>
    commit(() => {
      if (!db().marcas.some((m) => m.id === input.marca_id)) {
        throw new BackofficeError("La marca seleccionada ya no existe");
      }

      const celular: CelularRecord = { ...input, id: nuevoId(), created_at: ahora() };
      db().celulares.push(celular);
      return structuredClone(celular);
    }),

  /** TODO(backend): `PATCH /api/celulares/[id]`. */
  actualizar: (id: string, input: CelularInput): Promise<CelularRecord> =>
    commit(() => {
      const celular = db().celulares.find((c) => c.id === id);
      if (!celular) throw new BackofficeError("El celular ya no existe");
      if (!db().marcas.some((m) => m.id === input.marca_id)) {
        throw new BackofficeError("La marca seleccionada ya no existe");
      }

      Object.assign(celular, input);
      return structuredClone(celular);
    }),

  /** TODO(backend): `DELETE /api/celulares/[id]`. */
  eliminar: (id: string): Promise<void> =>
    commit(() => {
      db().celulares = db().celulares.filter((c) => c.id !== id);
      // ON DELETE CASCADE: ficha y comentarios se van con el celular (§3).
      db().especificaciones = db().especificaciones.filter((e) => e.celular_id !== id);
      db().comentarios = db().comentarios.filter((c) => c.celular_id !== id);
    }),
};

export const especificacionesApi = {
  /** TODO(backend): `POST /api/especificaciones`. */
  crear: (input: EspecificacionInput): Promise<EspecificacionRecord> =>
    commit(() => {
      if (!db().celulares.some((c) => c.id === input.celular_id)) {
        throw new BackofficeError("El celular indicado no existe");
      }
      // `especificaciones.celular_id` es UNIQUE: la relación es 1:1 (§3).
      if (db().especificaciones.some((e) => e.celular_id === input.celular_id)) {
        throw new BackofficeError("Ese celular ya tiene ficha técnica");
      }

      const especificacion: EspecificacionRecord = {
        ...input,
        id: nuevoId(),
        created_at: ahora(),
      };
      db().especificaciones.push(especificacion);
      return structuredClone(especificacion);
    }),

  /**
   * TODO(backend): `PATCH /api/especificaciones/[id]`.
   *
   * `celular_id` se ignora a propósito: la ficha no se reasigna desde el
   * dashboard, se borra y se crea desde el celular que corresponda.
   */
  actualizar: (
    id: string,
    input: Omit<EspecificacionInput, "celular_id">,
  ): Promise<EspecificacionRecord> =>
    commit(() => {
      const especificacion = db().especificaciones.find((e) => e.id === id);
      if (!especificacion) throw new BackofficeError("La especificación ya no existe");

      Object.assign(especificacion, input);
      return structuredClone(especificacion);
    }),

  /** TODO(backend): `DELETE /api/especificaciones/[id]`. */
  eliminar: (id: string): Promise<void> =>
    commit(() => {
      db().especificaciones = db().especificaciones.filter((e) => e.id !== id);
    }),
};
