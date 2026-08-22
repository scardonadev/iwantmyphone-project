import type { ReactNode } from "react";
import { Header } from "@components/layout/Header";
import { Footer } from "@components/layout/Footer";

/**
 * Cromo del sitio público. Vive en un grupo de rutas —`(public)` no aparece en
 * la URL— para que `/dashboard` y `/login`, que cuelgan del mismo layout raíz,
 * no hereden la cabecera y el pie del catálogo.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
