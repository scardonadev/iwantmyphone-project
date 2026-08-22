"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useBackoffice } from "@lib/backoffice/store";
import { ENTIDADES } from "./nav";

/**
 * Accesos rápidos del home del panel: una ficha por entidad del menú lateral,
 * con el número de registros que hay ahora mismo.
 *
 * La retícula y el bloque `surface` son los mismos que los de las fichas de
 * producto del catálogo público (AGENTS.md §6): el panel no inventa un segundo
 * sistema visual.
 */
export function AccesosRapidos() {
  const { marcas, celulares, especificaciones } = useBackoffice();

  const totales: Record<string, number> = {
    celulares: celulares.length,
    marcas: marcas.length,
    especificaciones: especificaciones.length,
  };

  return (
    <section aria-labelledby="accesos-rapidos">
      <h2 id="accesos-rapidos" className="u-label text-muted">
        Accesos rápidos
      </h2>

      <div className="mt-6 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {ENTIDADES.map(({ key, label, href, icono: Icono, descripcion }) => (
          <Link
            key={key}
            href={href}
            className="group flex flex-col justify-between gap-8 bg-surface p-8 transition-colors hover:bg-surface-2"
          >
            <div>
              <div className="flex items-start justify-between">
                <Icono className="size-6 text-ink" aria-hidden="true" />
                <ArrowUpRightIcon
                  className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-6 text-lg font-light tracking-tight">{label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{descripcion}</p>
            </div>

            <p className="u-label text-muted">
              {totales[key]} registros
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
