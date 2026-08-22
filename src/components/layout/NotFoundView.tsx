import Link from "next/link";

/**
 * Cuerpo del 404, sin cabecera ni pie.
 *
 * Existen dos límites de "no encontrado" y cada uno monta su cromo de forma
 * distinta, así que el contenido se comparte desde aquí:
 *
 *   - `app/(public)/not-found.tsx` — para los `notFound()` del catálogo. Cae
 *     dentro del `<main>` del layout público, que ya pone Header y Footer.
 *   - `app/not-found.tsx` — para las URLs que no casan con ninguna ruta. Vive en
 *     el segmento raíz, donde el layout de `(public)` no llega, así que monta
 *     Header y Footer por su cuenta.
 */
export function NotFoundView() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-32 text-center sm:px-8">
      <p className="u-label text-muted">Error 404</p>

      <h1 className="mt-5 text-2xl font-light tracking-tight">
        No encontramos ese dispositivo
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        El enlace puede estar mal copiado o el dispositivo ya no está en el catálogo.
      </p>

      <Link
        href="/"
        className="u-label mt-10 border border-ink px-10 py-4 text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        Ver el catálogo
      </Link>
    </div>
  );
}
