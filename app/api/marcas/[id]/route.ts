import type { NextRequest } from "next/server";
import { requireSesion } from "@lib/auth/session";
import {
  conflict,
  conRestricciones,
  handle,
  notFound,
  ok,
  readJsonObject,
  requireUuid,
} from "@lib/http";
import {
  actualizarMarca,
  eliminarMarca,
  existeMarcaConNombre,
  obtenerMarca,
} from "@lib/queries/marcas";
import { leerCambiosMarca } from "@utils/entradas";

/** GET /api/marcas/[id] */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/marcas/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const marca = await obtenerMarca(requireUuid(id, "id"));

    if (!marca) throw notFound("No existe una marca con ese id");
    return ok(marca);
  });
}

/** PATCH /api/marcas/[id]  cualquier subconjunto de { nombre, pais_origen, logo } */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/marcas/[id]">) {
  return handle(async () => {
    await requireSesion();
    const id = requireUuid((await ctx.params).id, "id");
    const cambios = leerCambiosMarca(await readJsonObject(request));

    const duplicada = () => conflict(`Ya existe una marca llamada "${cambios.nombre}"`);
    if (cambios.nombre !== undefined && (await existeMarcaConNombre(cambios.nombre, id))) {
      throw duplicada();
    }

    const marca = await conRestricciones(() => actualizarMarca(id, cambios), {
      marcas_nombre_key: duplicada,
    });
    if (!marca) throw notFound("No existe una marca con ese id");
    return ok(marca);
  });
}

/** DELETE /api/marcas/[id] — 409 si tiene celulares (ON DELETE RESTRICT). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/marcas/[id]">) {
  return handle(async () => {
    await requireSesion();
    const id = requireUuid((await ctx.params).id, "id");

    const eliminada = await conRestricciones(() => eliminarMarca(id), {
      fk_celulares_marcas: () =>
        conflict(
          "No se puede eliminar: hay celulares de esta marca. Bórralos o cámbialos de marca antes.",
        ),
    });
    if (!eliminada) throw notFound("No existe una marca con ese id");
    return ok(null);
  });
}
