import type { NextRequest } from "next/server";
import { requireSesion } from "@lib/auth/session";
import {
  badRequest,
  conRestricciones,
  handle,
  notFound,
  ok,
  readJsonObject,
  requireUuid,
} from "@lib/http";
import { actualizarCelular, eliminarCelular, obtenerCelular } from "@lib/queries/celulares";
import { leerCambiosCelular } from "@utils/entradas";

/** GET /api/celulares/[id] */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/celulares/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const celular = await obtenerCelular(requireUuid(id, "id"));

    if (!celular) throw notFound("No existe un celular con ese id");
    return ok(celular);
  });
}

/**
 * PATCH /api/celulares/[id]
 * Cualquier subconjunto de { marca_id, modelo, precio, fecha_lanzamiento, images_url }.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/celulares/[id]">) {
  return handle(async () => {
    await requireSesion();
    const id = requireUuid((await ctx.params).id, "id");
    const cambios = leerCambiosCelular(await readJsonObject(request));

    const celular = await conRestricciones(() => actualizarCelular(id, cambios), {
      fk_celulares_marcas: () =>
        badRequest("Datos de celular no válidos", { campos: { marca_id: "Marca: no existe." } }),
    });
    if (!celular) throw notFound("No existe un celular con ese id");
    return ok(celular);
  });
}

/** DELETE /api/celulares/[id] — su ficha y sus comentarios caen con él (ON DELETE CASCADE). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/celulares/[id]">) {
  return handle(async () => {
    await requireSesion();
    const id = requireUuid((await ctx.params).id, "id");

    if (!(await eliminarCelular(id))) throw notFound("No existe un celular con ese id");
    return ok(null);
  });
}
