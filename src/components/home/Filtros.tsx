"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { specLabel } from "@utils/spec-labels";
import type { SpecOption } from "@/src/types/api";
import { ChevronDownIcon } from "lucide-react";

interface FiltrosProps {
  opciones: SpecOption[];
  activos: Record<string, string>;
}

/**
 * Selects por especificación. Cada cambio reescribe `?filter=` en la URL y el
 * Server Component de la Home vuelve a resolver la página 1 (AGENTS.md §6).
 * El estado vive en la URL, no en React: la vista es compartible y recargable.
 */
export function Filtros({ opciones, activos }: FiltrosProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const aplicarFiltro = (siguientes: Record<string, string>) => {
    const limpios = Object.fromEntries(
      Object.entries(siguientes).filter(([, value]) => value),
    );

    // Sin filtros se quita el parámetro en vez de mandar `{}`.
    const url =
      Object.keys(limpios).length === 0
        ? "/"
        : `?filter=${encodeURIComponent(JSON.stringify(limpios))}`;

    startTransition(() => router.replace(url, { scroll: false }));
  };

  const activas = Object.entries(activos).filter(([, value]) => value);

  return (
    <section
      aria-label="Filtros por especificación"
      className="border-b border-line"
    >
      <div
        className={`mx-auto max-w-7xl px-5 py-10 transition-opacity sm:px-8 lg:px-12 ${
          pending ? "opacity-50 blur-xs" : ""
        }`}
      >
        <div className="grid gap-x-8 gap-y-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {opciones.map((opcion) => (
            <div key={opcion.key}>
              <label
                htmlFor={`filtro-${opcion.key}`}
                className="u-label text-[.6em]! block text-muted"
              >
                {specLabel(opcion.key)}
              </label>

              <div className="relative">
                <select
                  id={`filtro-${opcion.key}`}
                  className="u-select truncate text-sm"
                  value={activos[opcion.key] ?? ""}
                  onChange={(event) =>
                    aplicarFiltro({
                      ...activos,
                      [opcion.key]: event.target.value,
                    })
                  }
                >
                  <option value="">Todos</option>
                  {opcion.values.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-muted"
                >
                  <ChevronDownIcon className="size-3" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {activas.length > 0 && (
          <div className="mt-8">
            <span className="u-label text-[.6em]! text-muted mb-2 block">
              Filtros activos:
            </span>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-3">
              {activas.map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => aplicarFiltro({ ...activos, [key]: "" })}
                  className="u-label group flex items-center gap-2 text-ink"
                >
                  <span
                    aria-hidden="true"
                    className="text-muted group-hover:text-red-800"
                  >
                    ✕
                  </span>
                  <span className="normal-case tracking-normal">{value}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => aplicarFiltro({})}
              className="u-label hover:text-muted underline-offset-4 text-ink underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
