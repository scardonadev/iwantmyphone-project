"use client";

import { CelularCard } from "@components/ui/CelularCard";
import type { Celular } from "@/src/types/api";

interface SugeridosProps {
  sugeridos: Celular[];
}

export function Sugeridos({ sugeridos }: SugeridosProps) {
  if (sugeridos.length === 0) return null;

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 lg:px-12">
        <h2 className="u-label text-muted">También te puede interesar</h2>
      </div>

      <div
        tabIndex={0}
        role="group"
        aria-label="Dispositivos sugeridos"
        className="mx-auto max-w-7xl mt-8 grid gap-5 px-5 pb-16 sm:px-8 lg:px-12 grid-cols-2 sm:grid-cols-4"
      >
        {sugeridos.map((celular) => (
          <CelularCard key={celular.id} celular={celular} />
        ))}
      </div>
    </section>
  );
}
