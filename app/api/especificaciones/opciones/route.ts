import { handle, ok } from "@lib/http";
import { obtenerOpciones } from "@lib/queries/especificaciones";

/**
 * GET /api/especificaciones/opciones -> { options: {key, values}[] }
 *
 * Alimenta los selects de la Home. El segmento estático `opciones` tiene
 * prioridad sobre `[id]`, así que no colisiona con el detalle.
 */
// Único GET sin acceso al request: sin esto, Next intentaría prerenderizarlo en
// build y necesitaría la BD disponible para compilar.
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ok(await obtenerOpciones()));
}
