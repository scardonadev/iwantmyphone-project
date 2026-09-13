import type { NextRequest } from "next/server";
import { firmarToken } from "@lib/auth/jwt";
import { verificarPassword } from "@lib/auth/password";
import { borrarCookieSesion, guardarCookieSesion, requireSesion } from "@lib/auth/session";
import {
  badRequest,
  forbidden,
  handle,
  ok,
  readJsonObject,
  readString,
  unauthorized,
} from "@lib/http";
import { buscarCredenciales } from "@lib/queries/usuarios";
import { errorDocumento, errorPasswordLogin, soloErrores } from "@utils/credenciales";
import type { Sesion, SesionIniciada } from "@/src/types/api";

/**
 * La sesión del backoffice como recurso único:
 *
 *   POST   /api/sesion   inicia sesión y emite el JWT
 *   GET    /api/sesion   sesión en curso
 *   DELETE /api/sesion   cierra sesión
 */

/** POST /api/sesion  { documento, password } */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await readJsonObject(request);
    const documento = readString(body, "documento").trim();
    const password = readString(body, "password");

    const errores = soloErrores({
      documento: errorDocumento(documento),
      password: errorPasswordLogin(password),
    });
    if (errores) throw badRequest("Credenciales incompletas o con formato no válido", { campos: errores });

    // La contraseña se verifica aunque el documento no exista (contra un hash
    // de relleno): la respuesta tarda lo mismo y no delata qué documentos hay.
    const credenciales = await buscarCredenciales(documento);
    const valida = await verificarPassword(password, credenciales?.passwordHash ?? null);
    if (!credenciales || !valida) throw unauthorized("Documento o contraseña incorrectos");

    // Solo tras comprobar la contraseña: antes, este aviso revelaría que el
    // documento está registrado.
    if (!credenciales.usuario.is_active) {
      throw forbidden("Tu usuario está pendiente de activación");
    }

    const { token, expiraEn } = await firmarToken(credenciales.usuario.id);
    await guardarCookieSesion(token, expiraEn);

    return ok<SesionIniciada>({
      usuario: credenciales.usuario,
      token,
      expires_at: expiraEn.toISOString(),
    });
  });
}

/** GET /api/sesion  (cookie o `Authorization: Bearer <jwt>`) */
export async function GET() {
  return handle(async () => {
    const { usuario, expiraEn } = await requireSesion();
    return ok<Sesion>({ usuario, expires_at: expiraEn.toISOString() });
  });
}

/**
 * DELETE /api/sesion
 *
 * Borra la cookie. El JWT no tiene estado en servidor, así que una copia del
 * token guardada fuera del navegador sigue valiendo hasta su `exp`; para
 * cortar el acceso de verdad está `is_active = false`.
 */
export async function DELETE() {
  return handle(async () => {
    await borrarCookieSesion();
    return ok(null);
  });
}
