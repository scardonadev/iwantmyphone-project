import { requireSesion } from "@lib/auth/session";
import { handle, ok } from "@lib/http";
import { cargarDatasetBackoffice } from "@lib/queries/backoffice";

/**
 * GET /api/backoffice/dataset — el catálogo entero en filas de la BD, para el panel.
 *
 * Es la relectura que hace el panel tras cada escritura (`recargarDataset()`):
 * una sola fuente de verdad, sin copias optimistas que reconciliar. Requiere
 * sesión, como todo lo del panel. No forma parte del catálogo público: para
 * eso están los GET de §4.
 */
export async function GET() {
  return handle(async () => {
    await requireSesion();
    return ok(await cargarDatasetBackoffice());
  });
}
