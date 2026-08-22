import { Header } from "@components/layout/Header";
import { Footer } from "@components/layout/Footer";
import { NotFoundView } from "@components/layout/NotFoundView";

/**
 * 404 de las URLs que no casan con ninguna ruta.
 *
 * Monta cabecera y pie por su cuenta porque el archivo vive en el segmento
 * raíz: ahí no llega el layout de `(public)`, que es quien los pone en el
 * catálogo. Los `notFound()` de dentro del catálogo los recoge antes
 * `app/(public)/not-found.tsx`, que no repite el cromo.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <NotFoundView />
      </main>
      <Footer />
    </>
  );
}
