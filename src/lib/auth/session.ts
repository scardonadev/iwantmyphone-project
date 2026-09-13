import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { forbidden, isUuid, unauthorized } from "@lib/http";
import { buscarUsuario } from "@lib/queries/usuarios";
import type { Usuario } from "@/src/types/api";
import { COOKIE_SESION, verificarToken } from "./jwt";

/**
 * Sesión del backoffice en servidor: la comprobación **segura**.
 *
 * `proxy.ts` solo mira la firma del JWT (comprobación optimista, sin BD). Aquí
 * además se exige que el usuario del token exista y siga activo. Así, poner
 * `is_active = false` a mano en la BD corta el acceso en la siguiente
 * comprobación, sin esperar a que caduque el token.
 *
 * Sirve para Server Components (`verificarSesion`, que redirige) y para Route
 * Handlers (`requireSesion`, que responde 401 o 403): `cookies()` y
 * `headers()` funcionan en los dos. Toda escritura del catálogo empieza por
 * `requireSesion()`.
 */

export interface SesionActiva {
  usuario: Usuario;
  expiraEn: Date;
}

/**
 * Primero `Authorization: Bearer <jwt>` (clientes que no son un navegador),
 * luego la cookie HttpOnly que pone el login.
 */
async function leerToken(): Promise<string | null> {
  const authorization = (await headers()).get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim() || null;
  }
  return (await cookies()).get(COOKIE_SESION)?.value ?? null;
}

type Resolucion = { sesion: SesionActiva } | { motivo: "sin-sesion" | "inactivo" };

/**
 * Qué hay detrás del token de la petición. Memorizada por petición con
 * `cache`: el layout y cualquier página que la pida comparten una sola query.
 */
const resolverSesion = cache(async (): Promise<Resolucion> => {
  const token = await verificarToken(await leerToken());
  // Un `sub` que no es UUID solo puede venir de un token firmado a mano con el
  // secreto; aun así no se deja llegar a la BD (daría un 500, no un 401).
  if (!token || !isUuid(token.usuarioId)) return { motivo: "sin-sesion" };

  const usuario = await buscarUsuario(token.usuarioId);
  if (!usuario) return { motivo: "sin-sesion" };
  if (!usuario.is_active) return { motivo: "inactivo" };

  return { sesion: { usuario, expiraEn: token.expiraEn } };
});

/** Sesión válida *y* usuario activo, o `null`. */
export async function obtenerSesion(): Promise<SesionActiva | null> {
  const resolucion = await resolverSesion();
  return "sesion" in resolucion ? resolucion.sesion : null;
}

/** Server Components: sin sesión activa, a `/login`. */
export async function verificarSesion(): Promise<SesionActiva> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  return sesion;
}

/**
 * Route Handlers: exige que el usuario del token exista y esté activo.
 *
 *   - sin token, token inválido o caducado, o usuario borrado → 401;
 *   - usuario con `is_active = false` → 403.
 *
 * `handle()` convierte el error en la respuesta.
 */
export async function requireSesion(): Promise<SesionActiva> {
  const resolucion = await resolverSesion();
  if ("sesion" in resolucion) return resolucion.sesion;

  if (resolucion.motivo === "inactivo") {
    throw forbidden("Tu usuario está desactivado: pide que lo activen para seguir usando el panel");
  }
  throw unauthorized("No hay sesión activa o ha caducado: vuelve a iniciar sesión");
}

/**
 * Cookie de sesión. HttpOnly para que ningún script la lea, `SameSite=Lax`
 * para que no viaje en peticiones POST de otros sitios, y `Secure` fuera de
 * desarrollo (en `next dev` se sirve por http).
 */
export async function guardarCookieSesion(
  token: string,
  expiraEn: Date,
): Promise<void> {
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEn,
  });
}

export async function borrarCookieSesion(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
}
