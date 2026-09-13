import type { NextRequest } from "next/server";
import { requireSesion } from "@lib/auth/session";
import { badRequest, conRestricciones, created, handle, ok, readJsonObject } from "@lib/http";
import { crearCelular, listarCelulares } from "@lib/queries/celulares";
import { leerAltaCelular } from "@utils/entradas";
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

/**
 * POST /api/celulares  { marca_id, modelo, precio, fecha_lanzamiento, images_url? }
 *
 * Requiere sesión de un usuario activo. Responde con el mismo shape que
 * `GET /api/celulares/[id]`.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    await requireSesion();
    const entrada = leerAltaCelular(await readJsonObject(request));

    const celular = await conRestricciones(() => crearCelular(entrada), {
      fk_celulares_marcas: () =>
        badRequest("Datos de celular no válidos", { campos: { marca_id: "Marca: no existe." } }),
    });
    return created(celular);
  });
}
