"use client";

import {
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { sesionApi } from "@lib/backoffice/api";
import type { Usuario } from "@/src/types/api";
import { ENTIDADES } from "./nav";

/**
 * Menú lateral del backoffice.
 *
 * En escritorio es una columna fija con filete a la derecha; por debajo de `lg`
 * se pliega en un cajón que se abre desde la barra superior. Cada enlace cierra
 * el cajón al pulsarlo —sin eso, navegar desde el menú deja el panel tapado por
 * el propio menú—; se hace en el `onClick` y no en un efecto sobre `pathname`
 * porque es exactamente lo que es: la consecuencia de un gesto del usuario.
 *
 * El pie muestra quién tiene la sesión abierta (el layout la resuelve en
 * servidor) y "Salir", que borra la sesión en el servidor antes de volver al
 * login. Si el cierre falla no se navega: mandar al login con la cookie todavía
 * viva daría a entender una salida que no ha ocurrido.
 */

const ACTIVO = "bg-surface text-ink";
const INACTIVO = "text-muted hover:bg-surface/70 hover:text-ink";

interface SidebarProps {
  usuario: Pick<Usuario, "nombre" | "documento">;
}

export function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalida, setErrorSalida] = useState<string | null>(null);
  const cerrar = () => setAbierto(false);

  const salir = async () => {
    setSaliendo(true);
    setErrorSalida(null);
    try {
      await sesionApi.cerrar();
      cerrar();
      router.replace("/login");
    } catch {
      setErrorSalida("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      setSaliendo(false);
    }
  };

  const enlaces = (
    <nav aria-label="Secciones del panel" className="flex flex-col gap-1">
      <Link
        href="/dashboard"
        onClick={cerrar}
        aria-current={pathname === "/dashboard" ? "page" : undefined}
        className={`u-label flex items-center gap-3 px-4 py-3 transition-colors ${
          pathname === "/dashboard" ? ACTIVO : INACTIVO
        }`}
      >
        <LayoutDashboardIcon className="size-4" />
        Inicio
      </Link>

      <span className="u-label mt-6 px-4 pb-2 text-[0.6em]! text-muted/70">Entidades</span>

      {ENTIDADES.map(({ key, label, href, icono: Icono }) => {
        const activo = pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            onClick={cerrar}
            aria-current={activo ? "page" : undefined}
            className={`u-label flex items-center gap-3 px-4 py-3 transition-colors ${
              activo ? ACTIVO : INACTIVO
            }`}
          >
            <Icono className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const pie = (
    <div className="flex flex-col gap-1 border-t border-line pt-4">
      <div className="px-4 pb-3">
        <p className="u-label text-[0.6em]! text-muted/70">Sesión</p>
        <p className="mt-2 truncate text-sm text-ink" title={usuario.nombre}>
          {usuario.nombre}
        </p>
        <p className="text-xs text-muted">{usuario.documento}</p>
      </div>
      <Link
        href="/"
        onClick={cerrar}
        className="u-label flex items-center gap-3 px-4 py-3 text-muted transition-colors hover:text-ink"
      >
        <ExternalLinkIcon className="size-4" />
        Ver sitio público
      </Link>
      <button
        type="button"
        onClick={salir}
        disabled={saliendo}
        className="u-label flex cursor-pointer items-center gap-3 px-4 py-3 text-left text-muted transition-colors hover:text-ink disabled:opacity-40"
      >
        <LogOutIcon className="size-4" />
        {saliendo ? "Saliendo…" : "Salir"}
      </button>
      {errorSalida && (
        <p role="alert" className="px-4 text-xs text-red-700">
          {errorSalida}
        </p>
      )}
    </div>
  );

  return (
    <>
      {/* Barra superior: solo existe por debajo de `lg`, donde no hay columna. */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-paper/90 px-5 backdrop-blur-sm lg:hidden">
        <Link href="/dashboard" aria-label="Panel — ir al inicio">
          <Image src="/assets/logo.svg" alt="iwantmyphone" width={100} height={40} className="w-36" />
        </Link>
        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          aria-expanded={abierto}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="inline-flex size-10 items-center justify-center border border-line text-ink"
        >
          {abierto ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
        </button>
      </div>

      <aside
        className={`${
          abierto ? "flex" : "hidden"
        } sticky top-16 z-30 max-h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-b border-line bg-paper py-6 lg:top-0 lg:flex lg:max-h-screen lg:h-screen lg:w-64 lg:border-b-0 lg:border-r`}
      >
        <div className="mb-10 hidden px-4 lg:block">
          <Link href="/dashboard" aria-label="Panel — ir al inicio">
            <Image
              src="/assets/logo.svg"
              alt="iwantmyphone"
              width={100}
              height={40}
              className="w-40"
            />
          </Link>
          <p className="u-label mt-3 text-[0.6em]! text-muted">Panel de administración</p>
        </div>

        <div className="flex-1">{enlaces}</div>
        {pie}
      </aside>
    </>
  );
}
