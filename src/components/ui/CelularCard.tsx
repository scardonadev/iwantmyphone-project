import Link from "next/link";
import { PhoneImage } from "@components/ui/PhoneImage";
import { formatPrecio, getAnio, nombreCompleto } from "@utils/format";
import type { Celular } from "@/src/types/api";

interface CelularCardProps {
  celular: Celular;
  priority?: boolean;
}

/**
 * Ficha del catálogo. Compartida por la retícula de la Home y el carrusel de
 * sugeridos del detalle: bloque gris completo, imagen arriba, y al pie el
 * nombre con el precio alineado a la derecha.
 */
export function CelularCard({ celular, priority = false }: CelularCardProps) {
  const nombre = nombreCompleto(celular.marca.nombre, celular.modelo);

  return (
    <Link
      href={`/celular/${celular.id}`}
      className="group flex h-full flex-col bg-surface p-4 transition-all duration-300 hover:bg-surface-2 sm:p-6"
    >
      <div className="flex items-center justify-center">
        <div className="h-full w-full aspect-4/5 transition-all duration-500 group-hover:scale-[1.04]">
          <PhoneImage
            src={celular.images_url[0]}
            alt={nombre}
            priority={priority}
          />
        </div>
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <h3 className="text-[13px] leading-tight text-ink">{nombre}</h3>
        <span className="shrink-0 text-[13px] tabular-nums text-ink font-semibold">
          {formatPrecio(celular.precio)}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {getAnio(celular.fecha_lanzamiento)}
      </p>
    </Link>
  );
}
