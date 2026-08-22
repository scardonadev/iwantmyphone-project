import type { NextRequest } from "next/server";
import { handle, ok, requireUuid } from "@lib/http";
import { listarComentarios } from "@lib/queries/comentarios";
import { readPagination } from "@utils/pagination";

/** GET /api/comentarios?celular_id=<uuid>&page=1&limit=12 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const celularId = requireUuid(params.get("celular_id"), "celular_id");

    // Sin comentarios se devuelve 200 con data vacío, no 404: el celular puede
    // existir perfectamente y no tener valoraciones todavía.
    const { data, meta } = await listarComentarios(celularId, readPagination(params));
    return ok(data, meta);
  });
}
