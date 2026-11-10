import type { Request } from "express";
import { badRequest, camposInvalidos } from "./http.ts";

/**
 * Validación de cuerpos. Reúne TODOS los errores antes de responder, en
 * `details.campos` (campo -> mensaje), igual que la API del Next.
 *
 * Cada lector devuelve:
 *   - `undefined` si el campo no vino (en un PATCH significa "no tocar"),
 *   - `null` si vino `null` (o "") y el campo lo admite,
 *   - el valor ya normalizado en otro caso.
 * Un campo obligatorio ausente registra el error y devuelve `undefined`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const esUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** El cuerpo JSON tiene que ser un objeto: un array o un escalar es 400, nunca 500. */
export function leerCuerpo(req: Request): Record<string, unknown> {
  const cuerpo: unknown = req.body;
  if (cuerpo === undefined || cuerpo === null) return {};
  if (typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    throw badRequest("El cuerpo debe ser un objeto JSON");
  }
  return cuerpo as Record<string, unknown>;
}

/**
 * Un campo desconocido es 400, no se ignora: un PATCH que manda `images_urls`
 * en vez de `images_url` respondería 200 sin cambiar nada.
 */
export function soloCampos(
  cuerpo: Record<string, unknown>,
  permitidos: readonly string[],
  sugerencias: Record<string, string> = {},
) {
  const desconocidos = Object.keys(cuerpo).filter((k) => !permitidos.includes(k));
  if (!desconocidos.length) return;
  const campos = Object.fromEntries(
    desconocidos.map((k) => [
      k,
      sugerencias[k] ? `Campo no admitido. ¿Querías decir "${sugerencias[k]}"?` : "Campo no admitido.",
    ]),
  );
  throw badRequest("El cuerpo trae campos no admitidos", { campos, permitidos });
}

interface Opciones {
  obligatorio?: boolean;
  /** Admite `null` (y "" en textos) para vaciar el campo. */
  nulo?: boolean;
}

export class Validador {
  readonly errores: Record<string, string> = {};
  readonly #cuerpo: Record<string, unknown>;

  constructor(cuerpo: Record<string, unknown>) {
    this.#cuerpo = cuerpo;
  }

  error(campo: string, mensaje: string) {
    this.errores[campo] ??= mensaje;
  }

  get valido() {
    return Object.keys(this.errores).length === 0;
  }

  /** Lanza 400 con todos los errores acumulados, si hay alguno. */
  comprobar(mensaje = "Datos no válidos") {
    if (!this.valido) throw camposInvalidos(this.errores, mensaje);
  }

  /** Paso común: ausente / nulo / obligatorio. Devuelve `false` si no hay valor que validar. */
  #presente(campo: string, etiqueta: string, op: Opciones, vacioEsNulo = false) {
    const v = this.#cuerpo[campo];
    const vacio = v === undefined || v === null || (vacioEsNulo && typeof v === "string" && v.trim() === "");
    if (!vacio) return { hay: true as const, v };
    if (v === undefined) {
      if (op.obligatorio) this.error(campo, `${etiqueta}: campo obligatorio.`);
      return { hay: false as const, r: undefined };
    }
    if (op.nulo && !op.obligatorio) return { hay: false as const, r: null };
    this.error(campo, `${etiqueta}: campo obligatorio.`);
    return { hay: false as const, r: undefined };
  }

  texto(campo: string, etiqueta: string, op: Opciones & { max: number; min?: number; recortar?: boolean }) {
    const p = this.#presente(campo, etiqueta, op, true);
    if (!p.hay) return p.r;
    if (typeof p.v !== "string") return void this.error(campo, `${etiqueta}: debe ser texto.`);
    const s = op.recortar === false ? p.v : p.v.trim();
    if (s.length > op.max) return void this.error(campo, `${etiqueta}: máximo ${op.max} caracteres.`);
    if (op.min && s.length < op.min) return void this.error(campo, `${etiqueta}: mínimo ${op.min} caracteres.`);
    return s;
  }

  email(campo: string, etiqueta: string, op: Opciones = {}) {
    const s = this.texto(campo, etiqueta, { ...op, max: 254 });
    if (typeof s !== "string") return s;
    if (!EMAIL.test(s)) return void this.error(campo, `${etiqueta}: no es un correo válido.`);
    return s.toLowerCase();
  }

  /** Contraseña: no se recorta (un espacio es parte de ella). */
  password(campo: string, etiqueta: string, op: Opciones & { min?: number } = {}) {
    return this.texto(campo, etiqueta, { ...op, max: 128, min: op.min ?? 8, recortar: false });
  }

  documento(campo: string, op: Opciones = {}) {
    const s = this.texto(campo, "Documento", { ...op, max: 20 });
    if (typeof s !== "string") return s;
    if (!/^[0-9]{6,20}$/.test(s)) return void this.error(campo, "Documento: solo dígitos, de 6 a 20.");
    return s;
  }

  telefono(campo: string, op: Opciones = {}) {
    const s = this.texto(campo, "Teléfono", { ...op, max: 20 });
    if (typeof s !== "string") return s;
    if (!/^\+?[0-9 ]{7,20}$/.test(s)) return void this.error(campo, "Teléfono: solo dígitos (7 a 20).");
    return s.replace(/\s+/g, "");
  }

  uuid(campo: string, etiqueta: string, op: Opciones = {}) {
    const p = this.#presente(campo, etiqueta, op);
    if (!p.hay) return p.r;
    if (!esUuid(p.v)) return void this.error(campo, `${etiqueta}: identificador no válido.`);
    return p.v.toLowerCase();
  }

  entero(campo: string, etiqueta: string, op: Opciones & { min: number; max: number }) {
    const p = this.#presente(campo, etiqueta, op);
    if (!p.hay) return p.r;
    if (typeof p.v !== "number" || !Number.isInteger(p.v)) {
      return void this.error(campo, `${etiqueta}: debe ser un número entero.`);
    }
    if (p.v < op.min || p.v > op.max) {
      return void this.error(campo, `${etiqueta}: debe estar entre ${op.min} y ${op.max}.`);
    }
    return p.v;
  }

  /** Importe: número de `min` a `max`, redondeado a 2 decimales. */
  dinero(campo: string, etiqueta: string, op: Opciones & { max?: number } = {}) {
    const p = this.#presente(campo, etiqueta, op);
    if (!p.hay) return p.r;
    const max = op.max ?? 99_999_999.99;
    if (typeof p.v !== "number" || !Number.isFinite(p.v)) {
      return void this.error(campo, `${etiqueta}: debe ser un número.`);
    }
    if (p.v < 0 || p.v > max) return void this.error(campo, `${etiqueta}: debe estar entre 0 y ${max}.`);
    return Math.round(p.v * 100) / 100;
  }

  booleano(campo: string, etiqueta: string, op: Opciones = {}) {
    const p = this.#presente(campo, etiqueta, op);
    if (!p.hay) return p.r;
    if (typeof p.v !== "boolean") return void this.error(campo, `${etiqueta}: debe ser true o false.`);
    return p.v;
  }

  /** Fecha `AAAA-MM-DD` que exista de verdad (no 2025-02-30). */
  fecha(campo: string, etiqueta: string, op: Opciones = {}) {
    const p = this.#presente(campo, etiqueta, op, true);
    if (!p.hay) return p.r;
    const s = typeof p.v === "string" ? p.v.trim() : "";
    const d = new Date(`${s}T00:00:00Z`);
    if (!FECHA.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
      return void this.error(campo, `${etiqueta}: debe ser una fecha AAAA-MM-DD.`);
    }
    return s;
  }

  opcion<T extends string>(campo: string, etiqueta: string, opciones: readonly T[], op: Opciones = {}) {
    const p = this.#presente(campo, etiqueta, op);
    if (!p.hay) return p.r;
    if (typeof p.v !== "string" || !opciones.includes(p.v as T)) {
      return void this.error(campo, `${etiqueta}: valores admitidos: ${opciones.join(", ")}.`);
    }
    return p.v as T;
  }

  /**
   * Lista de URLs http(s). `[]` o `null` vacían el campo (se guarda NULL).
   * Sin comas: la columna es un CSV y una coma partiría la URL en dos.
   */
  urls(campo: string, etiqueta: string, op: Opciones & { max: number }) {
    const p = this.#presente(campo, etiqueta, { ...op, nulo: true });
    if (!p.hay) return p.r;
    if (!Array.isArray(p.v)) return void this.error(campo, `${etiqueta}: debe ser una lista de URLs.`);
    if (p.v.length > op.max) return void this.error(campo, `${etiqueta}: máximo ${op.max} URLs.`);
    const urls: string[] = [];
    for (const u of p.v) {
      if (typeof u !== "string" || !esUrl(u.trim()) || u.includes(",") || u.length > 2048) {
        return void this.error(campo, `${etiqueta}: cada elemento debe ser una URL http(s) sin comas.`);
      }
      urls.push(u.trim());
    }
    return urls.length ? urls : null;
  }

  url(campo: string, etiqueta: string, op: Opciones = {}) {
    const s = this.texto(campo, etiqueta, { ...op, max: 2048 });
    if (typeof s !== "string") return s;
    if (!esUrl(s)) return void this.error(campo, `${etiqueta}: debe ser una URL http(s).`);
    return s;
  }
}

function esUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Quita las claves `undefined`: lo que queda es exactamente lo que un PATCH cambia. */
export function definidos<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** UUID de la URL: si no lo es, 400 antes de tocar la BD (nunca 500). */
export function idDeRuta(valor: string | string[] | undefined, etiqueta = "id"): string {
  if (!esUuid(valor)) throw badRequest(`El ${etiqueta} de la URL no es un identificador válido`);
  return valor.toLowerCase();
}
