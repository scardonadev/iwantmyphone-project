"use client";

import Image from "next/image";
import { useState } from "react";

interface PhoneImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

/**
 * Imagen de producto con degradado a marcador gráfico.
 *
 * Se usa `<img>` y no `next/image` a propósito: las URLs del seed apuntan a
 * hosts inexistentes (`img.apple.com`), y el optimizador de Next devolvería un
 * 500 en lugar de dejar que el `onError` haga su trabajo. Además evita tener que
 * declarar `images.remotePatterns` para cada dominio de la BD. Ver AGENTS.md §3.
 */
export function PhoneImage({
  src,
  alt,
  className = "",
  priority = false,
}: PhoneImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed)
    return (
      <Image
        src={"/assets/placeholder.png"}
        alt={alt}
        width={500}
        height={500}
        decoding="async"
        className={`h-full w-full object-contain ${className}`}
      />
    );

  return (
    <Image
      src={src}
      alt={alt}
      width={500}
      height={500}
      onError={() => setFailed(true)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`h-full w-full object-contain ${className}`}
    />
  );
}
