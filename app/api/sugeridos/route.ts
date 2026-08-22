import type { NextRequest } from "next/server";
import { handle, notFound, ok, requireUuid } from "@lib/http";
import { obtenerSugeridos } from "@lib/queries/celulares";

/** GET /api/sugeridos?celular_id=<uuid> -> 5 celulares, sin paginación. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const celularId = requireUuid(request.nextUrl.searchParams.get("celular_id"), "celular_id");
    const sugeridos = await obtenerSugeridos(celularId);

    if (!sugeridos) throw notFound("No existe un celular con ese id");
    return ok(sugeridos);
  });
}
