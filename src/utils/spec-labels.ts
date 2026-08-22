/**
 * La API devuelve `especificaciones` como pares {key, value} sin etiquetas
 * legibles (AGENTS.md §4). La traducción vive aquí, no en el backend.
 */
const SPEC_LABELS: Record<string, string> = {
  procesador: "Procesador",
  ram: "Memoria RAM",
  almacenamiento: "Almacenamiento",
  pantalla: "Pantalla",
  camara: "Cámara",
  bateria: "Batería",
  sistema_op: "Sistema operativo",
  created_at: "Registrado",
};

/** Una key desconocida se muestra legible en vez de romper la tabla. */
export function specLabel(key: string): string {
  return SPEC_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
