import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Layout raíz: solo `<html>`, `<body>` y las fuentes.
 *
 * La cabecera y el pie del catálogo bajaron a `app/(public)/layout.tsx` cuando
 * entró el backoffice: `/dashboard` y `/login` cuelgan del mismo layout raíz y
 * no deben heredar el cromo del sitio público. Los grupos de rutas
 * —`(public)` y `(backoffice)`— no aparecen en la URL, así que las rutas
 * existentes no cambian.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "iWantMyPhone | Todo del mundo Apple",
    template: "%s | iWantMyPhone",
  },
  description:
    "Catálogo de dispositivos móviles con especificaciones técnicas, valoraciones y comparativa por generaciones.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
