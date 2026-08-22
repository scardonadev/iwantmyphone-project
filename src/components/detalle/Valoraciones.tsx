"use client";

import { useState } from "react";
import { Stars } from "@components/ui/Stars";
import { apiGet } from "@lib/api-client";
import { formatFechaCorta, getIniciales } from "@utils/format";
import type { Comentario, PaginationMeta } from "@/src/types/api";

interface ValoracionesProps {
  celularId: string;
  initialData: Comentario[];
  initialMeta: PaginationMeta;
}

/** Listado de valoraciones con "cargar más" contra `/api/comentarios`. */
export function Valoraciones({
  celularId,
  initialData,
  initialMeta,
}: ValoracionesProps) {
  const [items, setItems] = useState(initialData);
  const [meta, setMeta] = useState(initialMeta);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarMas() {
    setCargando(true);
    setError(null);

    try {
      const { data, meta: nuevaMeta } = await apiGet<Comentario[]>(
        `/api/comentarios?celular_id=${celularId}&page=${meta.page + 1}&limit=${meta.limit}`,
      );

      setItems((prev) => [...prev, ...data]);
      if (nuevaMeta) setMeta(nuevaMeta);
    } catch {
      setError("No se pudieron cargar más valoraciones. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="flex items-baseline justify-between">
          <h2 className="u-label text-muted">Valoraciones</h2>
          <span className="u-label tabular-nums text-muted">{meta.total}</span>
        </div>

        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted">
            Este dispositivo todavía no tiene valoraciones.
          </p>
        ) : (
          <ul className="mt-10 space-y-10">
            {items.map((comentario) => (
              <li key={comentario.id} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] tracking-wider text-ink-soft"
                >
                  {getIniciales(comentario.nombre)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={comentario.calificacion} />
                    <span className="text-[11px] tabular-nums text-muted">
                      {comentario.calificacion.toFixed(1)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-ink">{comentario.nombre}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {comentario.mensaje}
                  </p>
                  <time
                    dateTime={comentario.fecha}
                    className="mt-3 block text-[11px] text-muted"
                  >
                    {formatFechaCorta(comentario.fecha)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="mt-8 text-center text-sm text-accent">
            {error}
          </p>
        )}

        {meta.hasNextPage && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={cargarMas}
              disabled={cargando}
              className="u-label border border-ink px-10 py-4 text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-40"
            >
              {cargando ? "Cargando…" : "Cargar más"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
