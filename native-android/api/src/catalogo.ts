/**
 * Piezas compartidas del catálogo: el SELECT base de un celular y su
 * serializador. Lo usan el listado, el detalle, la Home, los sugeridos y los
 * favoritos, así el shape de un producto es el mismo en toda la API.
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

/** Columnas de `c` (celulares) y `m` (marcas). Añadir JOIN marcas m ON m.id = c.marca_id. */
export const SELECT_CELULAR = `
  c.id, c.modelo, c.precio, c.costo, c.descuento_pct, c.fecha_lanzamiento, c.created_at, c.images_urls,
  m.id AS marca_id, m.nombre AS marca_nombre, m.logo_url AS marca_logo`;

export interface FilaCelular {
  id: string;
  modelo: string;
  precio: number;
  costo: number;
  descuento_pct: number;
  fecha_lanzamiento: string;
  created_at: Date;
  images_urls: string | null;
  marca_id: string;
  marca_nombre: string;
  marca_logo: string | null;
}

/** El CSV de la BD como array. Nunca `split` sobre null. */
export const imagenes = (csv: string | null) =>
  (csv ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export const precioFinal = (precio: number, descuentoPct: number) =>
  Math.round(precio * (100 - descuentoPct)) / 100;

/**
 * DTO de un celular en listados. `costo` solo aparece si quien pregunta tiene
 * `costos:ver`: un vendedor nunca lo recibe, no basta con esconderlo en la app.
 */
export function celularDto(f: FilaCelular, verCostos: boolean) {
  return {
    id: f.id,
    marca: { id: f.marca_id, nombre: f.marca_nombre, logo: f.marca_logo },
    modelo: f.modelo,
    nombre: `${f.marca_nombre} ${f.modelo}`,
    images_url: imagenes(f.images_urls),
    precio: f.precio,
    descuento_pct: f.descuento_pct,
    precio_final: precioFinal(f.precio, f.descuento_pct),
    ...(verCostos ? { costo: f.costo } : {}),
    fecha_lanzamiento: f.fecha_lanzamiento,
    created_at: f.created_at,
  };
}
