import type { Metadata } from "next";
import { Sidebar } from "@components/dashboard/Sidebar";
import { cargarDataset } from "@lib/backoffice/api";
import { BackofficeProvider } from "@lib/backoffice/store";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel" },
  robots: { index: false, follow: false },
};

/**
 * Estructura del backoffice: menú lateral fijo + contenido.
 *
 * El catálogo se resuelve aquí, en servidor, y baja al proveedor como estado
 * inicial —el mismo reparto que usa la Home pública con `ListadoCelulares`
 * (AGENTS.md §6)—: el panel se pinta con datos desde el primer render, sin
 * parpadeo de carga.
 *
 * El proveedor cuelga del layout y no de cada página para que el estado
 * sobreviva a la navegación entre secciones.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const datosIniciales = await cargarDataset();

  return (
    <BackofficeProvider datosIniciales={datosIniciales}>
      <div className="flex-1 lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          {children}
        </div>
      </div>
    </BackofficeProvider>
  );
}
