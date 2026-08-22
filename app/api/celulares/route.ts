import type { NextRequest } from "next/server";
import { handle, ok } from "@lib/http";
import { listarCelulares } from "@lib/queries/celulares";
import { parseFilter } from "@utils/parse-filter";
import { readPagination } from "@utils/pagination";

/** GET /api/celulares?filter={"ram":"8 GB"}&page=1&limit=12 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const filtros = parseFilter(params.get("filter"));
    const pagination = readPagination(params);

    const { data, meta } = await listarCelulares({ filtros, pagination });
    return ok(data, meta);
  });
}
