import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Hash de contraseñas con scrypt (`node:crypto`, sin dependencias nativas).
 * Mismo formato que el Next (src/lib/auth/password.ts), autodescriptivo para
 * poder subir el coste sin invalidar los hashes existentes:
 *
 *   scrypt:<N>:<r>:<p>:<sal base64url>:<clave base64url>
 */

const COSTE = { N: 16384, r: 8, p: 1 } as const;
const LONGITUD_SAL = 16;
const LONGITUD_CLAVE = 64;

function derivar(password: string, sal: Buffer, longitud: number, opciones: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, sal, longitud, opciones, (error, clave) => (error ? reject(error) : resolve(clave)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const sal = randomBytes(LONGITUD_SAL);
  const clave = await derivar(password, sal, LONGITUD_CLAVE, COSTE);
  return ["scrypt", COSTE.N, COSTE.r, COSTE.p, sal.toString("base64url"), clave.toString("base64url")].join(":");
}

/**
 * Hash de relleno para cuando el email no existe: verificar contra él iguala el
 * tiempo de respuesta con el de una contraseña errónea, y el login no delata
 * qué correos están registrados.
 */
let hashRelleno: Promise<string> | null = null;

/** `almacenado = null` = "el usuario no existe": mismo trabajo, y `false`. */
export async function verificarPassword(password: string, almacenado: string | null): Promise<boolean> {
  const hash = almacenado ?? (await (hashRelleno ??= hashPassword(randomBytes(32).toString("base64url"))));

  const partes = hash.split(":");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;

  const [, N, r, p, sal = "", clave = ""] = partes;
  const esperada = Buffer.from(clave, "base64url");
  // Una clave vacía o truncada haría que cualquier contraseña "coincidiera".
  if (esperada.length < 16) return false;

  const calculada = await derivar(password, Buffer.from(sal, "base64url"), esperada.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });

  return timingSafeEqual(calculada, esperada) && almacenado !== null;
}
