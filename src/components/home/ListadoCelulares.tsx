"use client";

import { useState } from "react";
import { CelularCard } from "@components/ui/CelularCard";
import { apiGet, buildCelularesQuery } from "@lib/api-client";
import type { Celular, PaginationMeta } from "@/src/types/api";

interface ListadoCelularesProps {
  initialData: Celular[];
  initialMeta: PaginationMeta;
  filtros: Record<string, string>;
}

/**
 * Retícula del catálogo con "cargar más".
 *
 * La página 1 llega renderizada en servidor; las siguientes se piden a
 * `/api/celulares` y se acumulan. Al cambiar los filtros, la Home remonta este
 * componente con `key`, así que el estado interno se reinicia solo — sin
 * sincronizar props y estado a mano.
 */
export function ListadoCelulares({
  initialData,
  initialMeta,
  filtros,
}: ListadoCelularesProps) {
  const [items, setItems] = useState(initialData);
  const [meta, setMeta] = useState(initialMeta);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarMas() {
    setCargando(true);
    setError(null);

    try {
      const query = buildCelularesQuery({
        filtros,
        page: meta.page + 1,
        limit: meta.limit,
      });
      const { data, meta: nuevaMeta } = await apiGet<Celular[]>(
        `/api/celulares${query}`,
      );

      setItems((prev) => [...prev, ...data]);
      if (nuevaMeta) setMeta(nuevaMeta);
    } catch {
      setError("No se pudieron cargar más dispositivos. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-24 text-center sm:px-8 lg:px-12">
        <p className="text-sm text-ink">
          No hay dispositivos que cumplan estos filtros.
        </p>
        <p className="mt-2 text-sm text-muted">
          Prueba a quitar alguna especificación.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
      <div className="mb-8 flex items-baseline justify-between">
        <h2 className="u-label text-muted">Listado de celulares</h2>
        <span className="u-label tabular-nums text-muted">
          Mostrando {items.length} de {meta.total}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((celular, index) => (
          <li key={celular.id}>
            <CelularCard celular={celular} priority={index < 3} />
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-8 text-center text-sm text-red-800">
          {error}
        </p>
      )}

      {meta.hasNextPage && (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={cargarMas}
            disabled={cargando}
            className="u-label border border-ink px-12 py-4 text-ink transition-colors cursor-pointer hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-40"
          >
            {cargando ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}
    </div>
  );
}
