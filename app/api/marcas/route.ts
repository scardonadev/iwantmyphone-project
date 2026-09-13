import type { NextRequest } from "next/server";
import { requireSesion } from "@lib/auth/session";
import { conflict, conRestricciones, created, handle, ok, readJsonObject } from "@lib/http";
import { crearMarca, existeMarcaConNombre, listarMarcas } from "@lib/queries/marcas";
import { leerAltaMarca } from "@utils/entradas";
import { readPagination } from "@utils/pagination";

/** GET /api/marcas?page=1&limit=12 — público, como el resto de lecturas del catálogo. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { data, meta } = await listarMarcas(readPagination(request.nextUrl.searchParams));
    return ok(data, meta);
  });
}

/** POST /api/marcas  { nombre, pais_origen, logo? } — requiere sesión de un usuario activo. */
export async function POST(request: NextRequest) {
  return handle(async () => {
    await requireSesion();
    const entrada = leerAltaMarca(await readJsonObject(request));

    const duplicada = () => conflict(`Ya existe una marca llamada "${entrada.nombre}"`);
    if (await existeMarcaConNombre(entrada.nombre)) throw duplicada();

    const marca = await conRestricciones(() => crearMarca(entrada), {
      marcas_nombre_key: duplicada,
    });
    return created(marca);
  });
}
