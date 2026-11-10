import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, errors } from "jose";
import { config } from "../config.ts";

/**
 * Tres tipos de JWT HS256, cada uno con su audiencia, así un token no sirve
 * donde se espera otro (un refresh no abre la API, un reto no es una sesión):
 *
 *   access     15 min  · secreto de access  · Authorization: Bearer en cada petición
 *   refresh    30 días · secreto de refresh · solo en POST /api/auth/refresh
 *   biometria   2 min  · secreto de access  · reto que el teléfono firma con la huella
 *
 * Solo llevan `sub`: el rol se relee de la BD en cada petición, así que un
 * cambio de rol o una desactivación se aplica al instante, sin esperar a que
 * caduque el token.
 */

const ISSUER = "iwantmyphone-api";
const enc = new TextEncoder();
const CLAVE_ACCESS = enc.encode(config.jwt.accessSecret);
const CLAVE_REFRESH = enc.encode(config.jwt.refreshSecret);
const DURACION_RETO_S = 120;

type Audiencia = "app" | "refresh" | "biometria";

async function firmar(sub: string, aud: Audiencia, ttl: number, clave: Uint8Array, extra: Record<string, unknown> = {}) {
  return new SignJWT(extra)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(clave);
}

async function verificar(token: string, aud: Audiencia, clave: Uint8Array) {
  try {
    const { payload } = await jwtVerify(token, clave, { issuer: ISSUER, audience: aud, algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return payload;
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  /** Segundos de vida del access token. */
  expires_in: number;
}

export async function emitirTokens(usuarioId: string): Promise<Tokens> {
  const [access_token, refresh_token] = await Promise.all([
    firmar(usuarioId, "app", config.jwt.accessTtl, CLAVE_ACCESS),
    firmar(usuarioId, "refresh", config.jwt.refreshTtl, CLAVE_REFRESH),
  ]);
  return { access_token, refresh_token, token_type: "Bearer", expires_in: config.jwt.accessTtl };
}

export async function verificarAccess(token: string): Promise<string | null> {
  return (await verificar(token, "app", CLAVE_ACCESS))?.sub ?? null;
}

export async function verificarRefresh(token: string): Promise<string | null> {
  return (await verificar(token, "refresh", CLAVE_REFRESH))?.sub ?? null;
}

/** Reto biométrico: `sub` = id de la credencial; el nonce lo hace irrepetible. */
export async function emitirReto(credencialId: string) {
  const reto = await firmar(credencialId, "biometria", DURACION_RETO_S, CLAVE_ACCESS, {
    nonce: randomBytes(16).toString("base64url"),
  });
  return { reto, expires_in: DURACION_RETO_S };
}

/** Devuelve la credencial y el `iat` (segundos) del reto, o null si no es válido. */
export async function verificarReto(reto: string) {
  const payload = await verificar(reto, "biometria", CLAVE_ACCESS);
  if (!payload?.sub || typeof payload.iat !== "number") return null;
  return { credencialId: payload.sub, iat: payload.iat };
}
