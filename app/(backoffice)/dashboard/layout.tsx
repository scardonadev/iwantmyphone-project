import type { Metadata } from "next";
import { Sidebar } from "@components/dashboard/Sidebar";
import { verificarSesion } from "@lib/auth/session";
import { BackofficeProvider } from "@lib/backoffice/store";
import { cargarDatasetBackoffice } from "@lib/queries/backoffice";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel" },
  robots: { index: false, follow: false },
};

/**
 * Estructura del backoffice: menú lateral fijo + contenido.
 *
 * Primero la sesión. `proxy.ts` ya filtró la petición mirando solo la firma
 * del JWT. Aquí va la comprobación segura, contra la BD: el usuario existe y
 * sigue activo. Si no, `verificarSesion()` redirige a `/login` antes de cargar
 * ningún dato. El layout no se vuelve a ejecutar al navegar entre secciones
 * (Partial Rendering), pero cada una de esas peticiones pasa por el proxy.
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
  const { usuario } = await verificarSesion();
  const datosIniciales = await cargarDatasetBackoffice();

  return (
    <BackofficeProvider datosIniciales={datosIniciales}>
      <div className="flex-1 lg:flex">
        {/* Solo lo que el menú pinta: el resto del usuario no baja al cliente. */}
        <Sidebar usuario={{ nombre: usuario.nombre, documento: usuario.documento }} />
        <div className="min-w-0 flex-1 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          {children}
        </div>
      </div>
    </BackofficeProvider>
  );
}
