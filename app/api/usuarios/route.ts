import type { NextRequest } from "next/server";
import { hashPassword } from "@lib/auth/password";
import { badRequest, conflict, created, handle, readJsonObject, readString } from "@lib/http";
import { crearUsuario } from "@lib/queries/usuarios";
import {
  errorDocumento,
  errorNombre,
  errorPasswordNueva,
  soloErrores,
} from "@utils/credenciales";

/**
 * POST /api/usuarios  { documento, nombre, password }
 *
 * Alta abierta, sin sesión: el usuario nace con `is_active = false` y no puede
 * entrar al panel hasta que alguien lo active a mano en la BD. Es una solicitud
 * de acceso, no un acceso.
 *
 * Un `is_active` en el cuerpo se ignora: no hay forma de crearse ya activo.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await readJsonObject(request);
    const documento = readString(body, "documento").trim();
    const nombre = readString(body, "nombre").trim();
    const password = readString(body, "password");

    const errores = soloErrores({
      documento: errorDocumento(documento),
      nombre: errorNombre(nombre),
      password: errorPasswordNueva(password),
    });
    if (errores) throw badRequest("Datos de usuario no válidos", { campos: errores });

    const usuario = await crearUsuario({
      documento,
      nombre,
      passwordHash: await hashPassword(password),
    });
    if (!usuario) throw conflict("Ya existe un usuario con ese documento");

    return created(usuario);
  });
}
