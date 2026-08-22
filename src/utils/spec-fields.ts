/**
 * Orden canónico de los campos técnicos de `especificaciones`.
 *
 * Es parte del contrato de la API: `GET /api/especificaciones/[id]` y
 * `GET /api/especificaciones/opciones` devuelven sus arrays en este orden, y la
 * tabla del detalle los pinta tal cual llegan (AGENTS.md §4).
 */
export const SPEC_FIELDS = [
  "procesador",
  "ram",
  "almacenamiento",
  "pantalla",
  "camara",
  "bateria",
  "sistema_op",
] as const;

export type SpecField = (typeof SPEC_FIELDS)[number];
