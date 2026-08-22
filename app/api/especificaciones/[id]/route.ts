import type { NextRequest } from "next/server";
import { handle, notFound, ok, requireUuid } from "@lib/http";
import { obtenerEspecificacion } from "@lib/queries/especificaciones";

/** GET /api/especificaciones/[id] -> { especificaciones: {key, value}[] } */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/especificaciones/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const especificacion = await obtenerEspecificacion(requireUuid(id, "id"));

    if (!especificacion) throw notFound("No existe una especificación con ese id");
    return ok(especificacion);
  });
}
