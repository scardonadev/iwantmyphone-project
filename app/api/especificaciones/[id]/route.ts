import type { NextRequest } from "next/server";
import { requireSesion } from "@lib/auth/session";
import { handle, notFound, ok, readJsonObject, requireUuid } from "@lib/http";
import {
  actualizarEspecificacion,
  eliminarEspecificacion,
  obtenerEspecificacion,
} from "@lib/queries/especificaciones";
import { leerCambiosEspecificacion } from "@utils/entradas";

/** GET /api/especificaciones/[id] -> { especificaciones: {key, value}[] } */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/especificaciones/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const especificacion = await obtenerEspecificacion(requireUuid(id, "id"));

    if (!especificacion) throw notFound("No existe una especificación con ese id");
    return ok(especificacion);
  });
}

/**
 * PATCH /api/especificaciones/[id]
 * Cualquier subconjunto de los 7 campos técnicos. `celular_id` → 400: la
 * ficha no se reasigna.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/especificaciones/[id]">,
) {
  return handle(async () => {
    await requireSesion();
    const id = requireUuid((await ctx.params).id, "id");
    const cambios = leerCambiosEspecificacion(await readJsonObject(request));

    const especificacion = await actualizarEspecificacion(id, cambios);
    if (!especificacion) throw notFound("No existe una especificación con ese id");
    return ok(especificacion);
  });
}

/** DELETE /api/especificaciones/[id] — el celular sigue, sin ficha (la relación es opcional). */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/especificaciones/[id]">,
) {
  return handle(async () => {
    await requireSesion();
    const id = requireUuid((await ctx.params).id, "id");

    if (!(await eliminarEspecificacion(id))) {
      throw notFound("No existe una especificación con ese id");
    }
    return ok(null);
  });
}
