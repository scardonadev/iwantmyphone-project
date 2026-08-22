import { NotFoundView } from "@components/layout/NotFoundView";

/**
 * 404 del catálogo: lo que ve un `notFound()` lanzado desde `/celular/[id]`.
 *
 * Sin cabecera ni pie a propósito. Este límite cae dentro del `<main>` del
 * layout de `(public)`, que ya los monta; repetirlos aquí pintaría dos
 * cabeceras y dos pies en la misma página.
 */
export default function CatalogoNotFound() {
  return <NotFoundView />;
}
