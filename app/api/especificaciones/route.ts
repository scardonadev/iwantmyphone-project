import type { NextRequest } from "next/server";
import { requireSesion } from "@lib/auth/session";
import {
  badRequest,
  conflict,
  conRestricciones,
  created,
  handle,
  readJsonObject,
} from "@lib/http";
import { crearEspecificacion } from "@lib/queries/especificaciones";
import { leerAltaEspecificacion } from "@utils/entradas";

/**
 * POST /api/especificaciones  { celular_id, procesador, ram, … }
 *
 * Alta de la ficha técnica de un celular; requiere sesión de un usuario
 * activo. Responde con el mismo shape que `GET /api/especificaciones/[id]`.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    await requireSesion();
    const entrada = leerAltaEspecificacion(await readJsonObject(request));

    const ficha = await conRestricciones(() => crearEspecificacion(entrada), {
      especificaciones_celular_id_key: () =>
        conflict("Ese celular ya tiene ficha técnica: la relación es 1:1"),
      fk_especificaciones_celulares: () =>
        badRequest("Datos de especificación no válidos", {
          campos: { celular_id: "Celular: no existe." },
        }),
    });
    return created(ficha);
  });
}
