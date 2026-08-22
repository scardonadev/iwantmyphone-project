import type { NextRequest } from "next/server";
import { handle, notFound, ok, requireUuid } from "@lib/http";
import { obtenerCelular } from "@lib/queries/celulares";

/** GET /api/celulares/[id] */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/celulares/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const celular = await obtenerCelular(requireUuid(id, "id"));

    if (!celular) throw notFound("No existe un celular con ese id");
    return ok(celular);
  });
}
