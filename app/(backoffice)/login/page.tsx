import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@components/dashboard/LoginForm";

export const metadata: Metadata = {
  title: "Acceso al panel",
  description: "Acceso al panel de administración de iWantMyPhone.",
  robots: { index: false, follow: false },
};

/**
 * A dónde volver tras el login. `proxy.ts` manda aquí con `?next=<ruta>`, y
 * solo se acepta si es una ruta del propio panel: así el parámetro no sirve
 * de redirección abierta (`?next=https://…` o `?next=//otro-sitio`).
 */
function destinoSeguro(next: string | string[] | undefined): string {
  return typeof next === "string" && /^\/dashboard(?:[/?#]|$)/.test(next) ? next : "/dashboard";
}

/** Formulario centrado, sin cabecera ni pie: la pantalla no tiene nada que navegar. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-20 sm:px-8">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/" aria-label="iwantmyphone — ir al catálogo">
            <Image
              src="/assets/logo.svg"
              alt="iwantmyphone"
              width={100}
              height={40}
              priority
              className="mx-auto w-80"
            />
          </Link>
          <p className="u-label mt-6 text-[0.6em]! text-muted">
            Panel de administración
          </p>
        </div>

        <LoginForm destino={destinoSeguro(next)} />

        <p className="mt-10 border-t border-line pt-6 text-center text-xs leading-relaxed text-muted">
          Las cuentas nuevas se crean desactivadas. Si no puedes entrar, pide
          que activen tu usuario.
        </p>
      </div>
    </div>
  );
}
