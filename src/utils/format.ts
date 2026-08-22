/**
 * Los precios del seed son de lanzamiento en USD. Se formatean con locale
 * en-US ("$1,199") en vez de es-ES, que produce "1199 US$" y descuadra la
 * alineación a la derecha de las fichas.
 */
const precioFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatPrecio = (precio: number) => precioFmt.format(precio);

/**
 * `fecha_lanzamiento` llega como "YYYY-MM-DD" (ver el type parser de src/lib/db.ts).
 * Se formatea a mano para no reintroducir el desfase de zona horaria que
 * provocaría `new Date("2025-09-19")`, que se interpreta como UTC.
 */
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function formatFechaLanzamiento(fecha: string): string {
  const [year, month, day] = fecha.slice(0, 10).split("-");
  const mes = MESES[Number(month) - 1];
  return mes ? `${Number(day)} de ${mes} de ${year}` : fecha;
}

export const getAnio = (fecha: string) => fecha.slice(0, 4);

/** `created_at` / `fecha` sí son timestamps completos. */
export function formatFechaCorta(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Avatar: la BD no guarda imagen de perfil, así que se generan iniciales. */
export function getIniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

export const nombreCompleto = (marca: string, modelo: string) => `${modelo}`;
