"use client";

import { ChevronLeftIcon, HomeIcon, PhoneIcon, UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto grid h-16 sm:h-25 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:px-8 lg:px-12">
        {!isHome ? (
          <Link
            onClick={() => window.history.back()}
            href="#"
            aria-label="Volver a la página anterior"
            className="u-label tracking-normal group flex items-center gap-1 text-muted hover:text-ink transition-colors"
          >
            <ChevronLeftIcon className="size-5 sm:size-6 text-muted transition-colors group-hover:-translate-x-1 group-hover:text-ink" />
            Atras
          </Link>
        ) : (
          <HomeIcon className="size-5 sm:size-6 text-muted transition-colors opacity-0 hover:text-ink" />
        )}

        <div className="justify-self-center">
          <Link
            href="/"
            aria-label="iwantmyphone — ir al inicio"
            className={
              "text-ink transition-opaciy hover:opacity-80 transition-all"
            }
          >
            <Image
              src="/assets/logo.svg"
              alt="iwantmyphone"
              className="w-45 sm:w-55"
              width={100}
              height={40}
            ></Image>
          </Link>
        </div>

        <div className="flex items-center justify-self-end gap-2 sm:gap-4">
          <Link href="/login" className="flex items-center">
            <UserIcon className="size-5 sm:size-6 text-muted transition-colors hover:text-ink" />
          </Link>
          <Link href="#contacto" className="flex items-center">
            <PhoneIcon className="size-5 sm:size-6 text-muted transition-colors hover:text-ink" />
          </Link>
        </div>
      </div>
    </header>
  );
}
