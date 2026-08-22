"use client";

import { ImageOffIcon } from "lucide-react";
import { useState } from "react";

/**
 * Miniatura de fila. Usa `<img>` y no `next/image` por el mismo motivo que
 * `@components/ui/PhoneImage` (AGENTS.md §6): las URLs las teclea el operador
 * del panel y pueden apuntar a cualquier host —o estar rotas—, y el optimizador
 * de Next devolvería un 500 en vez de dejar que actúe el `onError`. Declarar un
 * `images.remotePatterns` por cada dominio que alguien pueda escribir no es
 * viable en un backoffice.
 *
 * Ante `src` ausente o carga fallida se pinta un marcador: tiene que parecer
 * intencional, no roto.
 */

const CAJA = "flex size-10 shrink-0 items-center justify-center border border-line bg-surface";

interface MiniaturaProps {
  src?: string | null;
  alt: string;
}

export function Miniatura({ src, alt }: MiniaturaProps) {
  const [fallo, setFallo] = useState(false);

  if (!src || fallo) {
    return (
      <span className={CAJA} role="img" aria-label={`${alt} (sin imagen)`}>
        <ImageOffIcon className="size-4 text-muted/60" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={CAJA}>
      {/* eslint-disable-next-line @next/next/no-img-element -- host arbitrario, ver cabecera */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFallo(true)}
        className="size-full object-contain p-1"
      />
    </span>
  );
}

interface MiniaturasProps {
  /** CSV crudo de `celulares.images_urls`: puede ser `null`. */
  csv: string | null;
  alt: string;
  maximo?: number;
}

/** Tira de miniaturas para la columna `images_urls`, que es un CSV (§3). */
export function Miniaturas({ csv, alt, maximo = 3 }: MiniaturasProps) {
  const urls = (csv ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (urls.length === 0) return <Miniatura src={null} alt={alt} />;

  return (
    <span className="flex items-center gap-1.5">
      {urls.slice(0, maximo).map((url, indice) => (
        <Miniatura key={url + indice} src={url} alt={`${alt} — imagen ${indice + 1}`} />
      ))}
      {urls.length > maximo && (
        <span className="u-label text-muted">+{urls.length - maximo}</span>
      )}
    </span>
  );
}
