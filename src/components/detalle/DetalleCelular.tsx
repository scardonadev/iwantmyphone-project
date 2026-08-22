import { Stars } from "@components/ui/Stars";
import {
  formatFechaLanzamiento,
  formatPrecio,
  nombreCompleto,
} from "@utils/format";
import type { CelularDetalle } from "@/src/types/api";

interface DetalleCelularProps {
  celular: CelularDetalle;
  totalValoraciones: number;
}

/** Bloque central del detalle: nombre, fecha, valoración media y precio. */
export function DetalleCelular({
  celular,
  totalValoraciones,
}: DetalleCelularProps) {
  const nombre = nombreCompleto(celular.marca.nombre, celular.modelo);

  return (
    <section className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8 sm:py-20">
      <p className="u-label text-muted">{celular.marca.nombre}</p>

      <h1 className="text-4xl font-light tracking-tight sm:text-3xl">
        {nombre}
      </h1>

      <p className="mt-6 text-[11px] text-muted">Precio de lanzamiento</p>
      <p className="mt-1 text-2xl font-light tabular-nums sm:text-4xl">
        {formatPrecio(celular.precio)}{" "}
        <small className=" text-muted">USD</small>
      </p>
      <p className="mt-6 text-xs text-muted">
        Presentado el {formatFechaLanzamiento(celular.fecha_lanzamiento)}
      </p>

      <div className="flex items-center justify-center gap-3">
        <Stars value={celular.valoracion} size={16} />
        <span className="text-sm tabular-nums text-ink">
          {celular.valoracion.toFixed(1)}
        </span>
        <span className="text-xs text-muted">
          (
          {totalValoraciones === 0
            ? "sin valoraciones"
            : `${totalValoraciones} ${totalValoraciones === 1 ? "opinión" : "opiniones"}`}
          )
        </span>
      </div>
    </section>
  );
}
