import type { ReactNode } from "react";

interface EncabezadoSeccionProps {
  eyebrow?: string;
  titulo: string;
  descripcion?: ReactNode;
}

/** Cabecera común de las pantallas del panel: versales, titular fino y filete. */
export function EncabezadoSeccion({
  eyebrow = "Panel",
  titulo,
  descripcion,
}: EncabezadoSeccionProps) {
  return (
    <header className="border-b border-line pb-8">
      <p className="u-label text-[0.6em]! text-muted">{eyebrow}</p>
      <h1 className="mt-3 text-2xl font-light tracking-tight sm:text-3xl">{titulo}</h1>
      {descripcion && (
        <div className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {descripcion}
        </div>
      )}
    </header>
  );
}
