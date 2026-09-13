import "server-only";
import { errors, jwtVerify, SignJWT } from "jose";

/**
 * JWT de sesión del backoffice: HS256, firmado con `JWT_SECRET`.
 *
 * El token solo lleva el id del usuario en `sub` (más `iss`, `aud`, `iat` y
 * `exp`): ni nombre ni documento. Los datos del usuario se leen de la BD en la
 * comprobación segura (`@lib/auth/session`), y eso es también lo que permite
 * desactivar a alguien sin esperar a que caduque su token.
 *
 * Lo importa `proxy.ts`, así que este módulo no puede tocar la BD ni
 * `next/headers`: solo firma y verifica.
 */

export const COOKIE_SESION = "iwmp_sesion";

/** 8 horas: una jornada de trabajo en el panel. */
export const DURACION_SESION_S = 8 * 60 * 60;

const ALGORITMO = "HS256";
const EMISOR = "iwantmyphone";
const AUDIENCIA = "backoffice";

function claveDeFirma(): Uint8Array {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error(
      "Falta JWT_SECRET (mínimo 32 caracteres). Añádelo a .env.local: ver .env.example.",
    );
  }
  return new TextEncoder().encode(secreto);
}

export interface TokenSesion {
  usuarioId: string;
  expiraEn: Date;
}

export async function firmarToken(usuarioId: string): Promise<{ token: string; expiraEn: Date }> {
  // `exp` va en segundos: se redondea aquí para que la cookie caduque en el
  // mismo instante que el token.
  const exp = Math.floor(Date.now() / 1000) + DURACION_SESION_S;

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: ALGORITMO, typ: "JWT" })
    .setSubject(usuarioId)
    .setIssuer(EMISOR)
    .setAudience(AUDIENCIA)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(claveDeFirma());

  return { token, expiraEn: new Date(exp * 1000) };
}

/**
 * `null` si el token falta, está mal formado, caducó o la firma no cuadra:
 * para quien llama, todo eso es "sin sesión".
 *
 * Un `JWT_SECRET` ausente sí lanza. Es un fallo de configuración, y tratarlo
 * como un token inválido lo escondería detrás de un login que rechaza a todos.
 */
export async function verificarToken(
  token: string | null | undefined,
): Promise<TokenSesion | null> {
  if (!token) return null;
  const clave = claveDeFirma();

  try {
    const { payload } = await jwtVerify(token, clave, {
      algorithms: [ALGORITMO],
      issuer: EMISOR,
      audience: AUDIENCIA,
      requiredClaims: ["sub", "exp"],
    });
    if (!payload.sub || payload.exp === undefined) return null;
    return { usuarioId: payload.sub, expiraEn: new Date(payload.exp * 1000) };
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
}
