import { badRequest, isUuid } from "@lib/http";
import { SPEC_FIELDS, type SpecField } from "@utils/spec-fields";
import { specLabel } from "@utils/spec-labels";
import type {
  CelularEntrada,
  EspecificacionEntrada,
  FichaTecnica,
  MarcaEntrada,
} from "@/src/types/api";

/**
 * Lectura y validación de los cuerpos de escritura del catálogo (§4).
 *
 * Dos modos por entidad:
 *   - alta (POST): tienen que venir todos los campos obligatorios;
 *   - cambios (PATCH): solo se validan los que vienen, y tiene que venir uno.
 *
 * Los errores se acumulan en `details.campos` (`campo → mensaje`), todos a la
 * vez, como en `/api/usuarios`. Los topes de longitud son los de `seed.sql`:
 * sin ellos, un texto largo llegaría a Postgres y saldría como 500 (22001) en
 * vez de 400.
 *
 * Un campo desconocido es 400, no se ignora. La API renombra columnas
 * (`images_url`, `logo`), y un `images_urls` ignorado en silencio sería un
 * PATCH que responde 200 sin cambiar nada.
 */

type Lectura<V> = { valor: V } | { error: string };

interface Regla<V> {
  /** Nombre del campo en los mensajes: "Modelo: campo obligatorio." */
  etiqueta: string;
  obligatorio: boolean;
  /** En el alta, valor de un campo opcional que no viene. */
  porDefecto?: V;
  /** El campo solo existe en el alta; en un PATCH se rechaza con este motivo. */
  soloAlta?: string;
  leer: (valor: unknown) => Lectura<V>;
}

type Reglas<T> = { [K in keyof T]-?: Regla<T[K]> };

/** Nombres de columna que la API renombra (§3): el error sugiere el bueno. */
const RENOMBRES: Record<string, string> = { images_urls: "images_url", logo_url: "logo" };

const URL_MAX = 2048;

function esUrlHttp(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Texto obligatorio, recortado, con el tope de su columna. */
function texto(etiqueta: string, max: number): Regla<string> {
  return {
    etiqueta,
    obligatorio: true,
    leer: (valor) => {
      if (typeof valor !== "string") return { error: "tiene que ser texto." };
      const limpio = valor.trim();
      if (!limpio) return { error: "campo obligatorio." };
      if (limpio.length > max) return { error: `máximo ${max} caracteres.` };
      return { valor: limpio };
    },
  };
}

function uuid(etiqueta: string, soloAlta?: string): Regla<string> {
  return {
    etiqueta,
    obligatorio: true,
    soloAlta,
    leer: (valor) =>
      typeof valor === "string" && isUuid(valor) ? { valor } : { error: "tiene que ser un UUID." },
  };
}

/** URL opcional: `null` o `""` la quitan, y se guarda NULL. */
function urlOpcional(etiqueta: string): Regla<string | null> {
  return {
    etiqueta,
    obligatorio: false,
    porDefecto: null,
    leer: (valor) => {
      if (valor === null) return { valor: null };
      if (typeof valor !== "string") return { error: "tiene que ser texto o null." };
      const limpio = valor.trim();
      if (!limpio) return { valor: null };
      if (limpio.length > URL_MAX) return { error: `máximo ${URL_MAX} caracteres.` };
      if (!esUrlHttp(limpio)) {
        return { error: "tiene que ser una URL que empiece por http:// o https://." };
      }
      return { valor: limpio };
    },
  };
}

/** Tope de `DECIMAL(10, 2)`. */
const PRECIO_MAX = 99_999_999.99;

const precio: Regla<number> = {
  etiqueta: "Precio",
  obligatorio: true,
  leer: (valor) => {
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      return { error: "tiene que ser un número." };
    }
    // Se redondea como lo haría la columna, para comprobar el tope con el
    // valor que de verdad se guardaría.
    const redondeado = Math.round(valor * 100) / 100;
    if (redondeado < 0 || redondeado > PRECIO_MAX) {
      return { error: `tiene que estar entre 0 y ${PRECIO_MAX}.` };
    }
    return { valor: redondeado };
  },
};

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const fechaLanzamiento: Regla<string> = {
  etiqueta: "Fecha de lanzamiento",
  obligatorio: true,
  leer: (valor) => {
    if (typeof valor !== "string" || !FECHA_ISO.test(valor)) {
      return { error: "formato AAAA-MM-DD." };
    }
    // `2026-02-30` pasa el patrón: solo es real si sobrevive a la vuelta completa.
    const fecha = new Date(`${valor}T00:00:00Z`);
    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
      return { error: "no es una fecha real." };
    }
    return { valor };
  },
};

const MAX_IMAGENES = 20;

/**
 * Array de URLs. Se guarda como el CSV de `images_urls` (§3), así que ninguna
 * puede llevar una coma sin escapar: partiría la URL en dos al leerla.
 */
const imagenes: Regla<string[]> = {
  etiqueta: "Imágenes",
  obligatorio: false,
  porDefecto: [],
  leer: (valor) => {
    if (valor === null) return { valor: [] };
    if (!Array.isArray(valor)) return { error: "tiene que ser un array de URLs." };
    if (valor.length > MAX_IMAGENES) return { error: `máximo ${MAX_IMAGENES} URLs.` };

    const urls: string[] = [];
    for (const item of valor) {
      if (typeof item !== "string") return { error: "cada URL tiene que ser texto." };
      const url = item.trim();
      if (!url) continue;
      if (url.includes(",")) {
        return { error: `"${url}" lleva una coma: escápala como %2C (la columna es un CSV).` };
      }
      if (url.length > URL_MAX || !esUrlHttp(url)) {
        return { error: `"${url}" no es una URL http(s) válida.` };
      }
      urls.push(url);
    }
    return { valor: urls };
  },
};

function leer<T>(
  body: Record<string, unknown>,
  reglas: Reglas<T>,
  modo: "alta" | "cambios",
  mensaje: string,
): Partial<T> {
  const valores: Record<string, unknown> = {};
  const errores: Record<string, string> = {};
  const campos = Object.keys(reglas) as (keyof T & string)[];

  for (const campo of Object.keys(body)) {
    if (Object.hasOwn(reglas, campo)) continue;
    const sugerencia = Object.hasOwn(RENOMBRES, campo) ? ` (¿querías \`${RENOMBRES[campo]}\`?)` : "";
    errores[campo] = `${campo}: campo no admitido${sugerencia}.`;
  }

  for (const campo of campos) {
    const regla: Regla<unknown> = reglas[campo];
    const crudo = body[campo];

    if (crudo === undefined) {
      if (modo === "cambios") continue;
      if (regla.obligatorio) errores[campo] = `${regla.etiqueta}: campo obligatorio.`;
      else valores[campo] = regla.porDefecto;
      continue;
    }
    if (modo === "cambios" && regla.soloAlta) {
      errores[campo] = `${regla.etiqueta}: ${regla.soloAlta}`;
      continue;
    }

    const lectura = regla.leer(crudo);
    if ("error" in lectura) errores[campo] = `${regla.etiqueta}: ${lectura.error}`;
    else valores[campo] = lectura.valor;
  }

  if (Object.keys(errores).length > 0) throw badRequest(mensaje, { campos: errores });
  if (modo === "cambios" && Object.keys(valores).length === 0) {
    throw badRequest("No hay campos que actualizar", {
      permitidos: campos.filter((campo) => !reglas[campo].soloAlta),
    });
  }
  return valores as Partial<T>;
}

const REGLAS_MARCA: Reglas<MarcaEntrada> = {
  nombre: texto("Nombre", 100),
  pais_origen: texto("País de origen", 100),
  logo: urlOpcional("Logo"),
};

const REGLAS_CELULAR: Reglas<CelularEntrada> = {
  marca_id: uuid("Marca"),
  modelo: texto("Modelo", 150),
  precio,
  fecha_lanzamiento: fechaLanzamiento,
  images_url: imagenes,
};

/** Topes de `seed.sql`, columna a columna. */
const TOPE_FICHA: Record<SpecField, number> = {
  procesador: 100,
  ram: 50,
  almacenamiento: 50,
  pantalla: 100,
  camara: 150,
  bateria: 50,
  sistema_op: 100,
};

const REGLAS_FICHA = Object.fromEntries(
  SPEC_FIELDS.map((campo) => [campo, texto(specLabel(campo), TOPE_FICHA[campo])]),
) as Reglas<FichaTecnica>;

const REGLAS_ESPECIFICACION: Reglas<EspecificacionEntrada> = {
  celular_id: uuid(
    "Celular",
    "no se puede cambiar. Para pasar la ficha a otro celular, bórrala y créala desde ese celular.",
  ),
  ...REGLAS_FICHA,
};

type Cuerpo = Record<string, unknown>;

export const leerAltaMarca = (body: Cuerpo) =>
  leer(body, REGLAS_MARCA, "alta", "Datos de marca no válidos") as MarcaEntrada;

export const leerCambiosMarca = (body: Cuerpo) =>
  leer(body, REGLAS_MARCA, "cambios", "Datos de marca no válidos");

export const leerAltaCelular = (body: Cuerpo) =>
  leer(body, REGLAS_CELULAR, "alta", "Datos de celular no válidos") as CelularEntrada;

export const leerCambiosCelular = (body: Cuerpo) =>
  leer(body, REGLAS_CELULAR, "cambios", "Datos de celular no válidos");

export const leerAltaEspecificacion = (body: Cuerpo) =>
  leer(body, REGLAS_ESPECIFICACION, "alta", "Datos de especificación no válidos") as EspecificacionEntrada;

/** `celular_id` nunca pasa: su regla es `soloAlta`. */
export const leerCambiosEspecificacion = (body: Cuerpo): Partial<FichaTecnica> =>
  leer(body, REGLAS_ESPECIFICACION, "cambios", "Datos de especificación no válidos");
