import { ApiClientError, apiGet, apiSend } from "@lib/api-client";
import type {
  CelularDetalle,
  CelularEntrada,
  Especificacion,
  FichaTecnica,
  MarcaDetalle,
  MarcaEntrada,
  SesionIniciada,
  Usuario,
} from "@/src/types/api";
import type { CelularInput, Dataset, EspecificacionInput, MarcaInput } from "./types";

/**
 * Capa de datos del backoffice — **único punto de acoplamiento con el backend**.
 *
 * Todo pasa ya por la API real, a través de `@lib/api-client`. Las vistas
 * trabajan con filas de la BD (`./types`: `logo_url`, `images_urls` como CSV)
 * y la API con su contrato (§4: `logo`, `images_url` como array). La
 * traducción entre los dos vive aquí y en ningún otro sitio.
 *
 * Las escrituras exigen en el servidor la sesión de un usuario activo
 * (`requireSesion()`). Un 401/403 llega como cualquier otro rechazo: un
 * `BackofficeError` con el mensaje de la API, que la fila enseña sin perder lo
 * tecleado.
 */

/** Error de dominio: la vista lo muestra en la fila, no en una pantalla de error. */
export class BackofficeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackofficeError";
  }
}

const ruta = (coleccion: string, id: string) => `/api/${coleccion}/${encodeURIComponent(id)}`;

/**
 * Relectura del catálogo tras cada escritura (`GET /api/backoffice/dataset`).
 *
 * La carga inicial no pasa por aquí: la hace el layout —un Server Component—
 * con `cargarDatasetBackoffice()`, sin ir por HTTP (AGENTS.md §2).
 */
export const recargarDataset = (): Promise<Dataset> =>
  comoErrorDelPanel(async () => (await apiGet<Dataset>("/api/backoffice/dataset")).data);

const aMarcaEntrada = (input: MarcaInput): MarcaEntrada => ({
  nombre: input.nombre,
  pais_origen: input.pais_origen,
  logo: input.logo_url,
});

/** La columna es un CSV (§3); la API lo quiere como array. */
const aCelularEntrada = (input: CelularInput): CelularEntrada => ({
  marca_id: input.marca_id,
  modelo: input.modelo,
  precio: input.precio,
  fecha_lanzamiento: input.fecha_lanzamiento,
  images_url: (input.images_urls ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
});

export const marcasApi = {
  /** `POST /api/marcas`. */
  crear: (input: MarcaInput): Promise<MarcaDetalle> =>
    comoErrorDelPanel(async () => {
      const { data } = await apiSend<MarcaDetalle>("POST", "/api/marcas", aMarcaEntrada(input));
      return data;
    }),

  /** `PATCH /api/marcas/[id]`. */
  actualizar: (id: string, input: MarcaInput): Promise<MarcaDetalle> =>
    comoErrorDelPanel(async () => {
      const { data } = await apiSend<MarcaDetalle>(
        "PATCH",
        ruta("marcas", id),
        aMarcaEntrada(input),
      );
      return data;
    }),

  /** `DELETE /api/marcas/[id]`. Con celulares asociados, 409 (ON DELETE RESTRICT). */
  eliminar: (id: string): Promise<void> =>
    comoErrorDelPanel(async () => {
      await apiSend<null>("DELETE", ruta("marcas", id));
    }),
};

export const celularesApi = {
  /** `POST /api/celulares`. */
  crear: (input: CelularInput): Promise<CelularDetalle> =>
    comoErrorDelPanel(async () => {
      const { data } = await apiSend<CelularDetalle>(
        "POST",
        "/api/celulares",
        aCelularEntrada(input),
      );
      return data;
    }),

  /** `PATCH /api/celulares/[id]`. */
  actualizar: (id: string, input: CelularInput): Promise<CelularDetalle> =>
    comoErrorDelPanel(async () => {
      const { data } = await apiSend<CelularDetalle>(
        "PATCH",
        ruta("celulares", id),
        aCelularEntrada(input),
      );
      return data;
    }),

  /** `DELETE /api/celulares/[id]`. Su ficha y sus comentarios caen con él (ON DELETE CASCADE). */
  eliminar: (id: string): Promise<void> =>
    comoErrorDelPanel(async () => {
      await apiSend<null>("DELETE", ruta("celulares", id));
    }),
};

export const especificacionesApi = {
  /** `POST /api/especificaciones`. 409 si el celular ya tiene ficha (UNIQUE). */
  crear: (input: EspecificacionInput): Promise<Especificacion> =>
    comoErrorDelPanel(async () => {
      const { data } = await apiSend<Especificacion>("POST", "/api/especificaciones", input);
      return data;
    }),

  /**
   * `PATCH /api/especificaciones/[id]`.
   *
   * `celular_id` no viaja: la ficha no se reasigna desde el dashboard, se borra
   * y se crea desde el celular que corresponda. La API lo rechazaría con 400.
   */
  actualizar: (
    id: string,
    input: Omit<EspecificacionInput, "celular_id">,
  ): Promise<Especificacion> =>
    comoErrorDelPanel(async () => {
      const cuerpo: FichaTecnica = input;
      const { data } = await apiSend<Especificacion>(
        "PATCH",
        ruta("especificaciones", id),
        cuerpo,
      );
      return data;
    }),

  /** `DELETE /api/especificaciones/[id]`. */
  eliminar: (id: string): Promise<void> =>
    comoErrorDelPanel(async () => {
      await apiSend<null>("DELETE", ruta("especificaciones", id));
    }),
};

/**
 * Sesión del panel, contra `/api/sesion`.
 *
 * El JWT lo guarda el servidor en una cookie HttpOnly y aquí no se toca. El
 * `token` que el login también devuelve en el cuerpo es para clientes que no
 * son un navegador, y se descarta a propósito.
 */
export const sesionApi = {
  /** `POST /api/sesion`. */
  iniciar: (documento: string, password: string): Promise<Usuario> =>
    comoErrorDelPanel(async () => {
      const { data } = await apiSend<SesionIniciada>("POST", "/api/sesion", {
        documento,
        password,
      });
      return data.usuario;
    }),

  /** `DELETE /api/sesion`. */
  cerrar: (): Promise<void> =>
    comoErrorDelPanel(async () => {
      await apiSend<null>("DELETE", "/api/sesion");
    }),
};

/**
 * Convierte los fallos de red y de la API en el error que las vistas ya
 * muestran. Si la API detalla los campos inválidos (`details.campos`, §4), esos
 * mensajes sustituyen al genérico: "Datos no válidos" no dice qué corregir.
 */
async function comoErrorDelPanel<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (causa) {
    if (causa instanceof ApiClientError) throw new BackofficeError(mensajeDeApi(causa));
    throw new BackofficeError("No se pudo contactar con el servidor");
  }
}

function mensajeDeApi(error: ApiClientError): string {
  const detalles = error.details;
  if (typeof detalles === "object" && detalles !== null && "campos" in detalles) {
    const { campos } = detalles as { campos: unknown };
    if (typeof campos === "object" && campos !== null) {
      const mensajes = Object.values(campos).filter(
        (mensaje): mensaje is string => typeof mensaje === "string",
      );
      if (mensajes.length > 0) return mensajes.join(" ");
    }
  }
  return error.message;
}
