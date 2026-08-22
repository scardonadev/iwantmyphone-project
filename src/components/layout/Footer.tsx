import { SocialButtons } from "@components/layout/SocialButtons";
import Image from "next/image";

export function Footer() {
  return (
    <footer id="contacto" className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl justify-center gap-12 px-5 py-16 text-center lg:text-left sm:px-8 lg:grid-cols-[1fr_auto] lg:gap-24 lg:px-12">
        <div className="max-w-sm">
          <Image
            src="/assets/logo.svg"
            alt="iwantmyphone"
            className="w-45 sm:w-55 grayscale opacity-50 mx-auto lg:mx-0"
            width={100}
            height={40}
          ></Image>
          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            Catálogo de referencia de dispositivos móviles: cada generación, sus
            especificaciones técnicas y lo que opina quien ya lo tiene.
          </p>
        </div>

        <div className="flex flex-col gap-8 items-center lg:items-end">
          <SocialButtons />
        </div>
      </div>

      <div className="border-t border-line mx-auto flex max-w-7xl items-center gap-4 px-5 py-6 sm:px-8 md:flex-row md:justify-between lg:px-12">
        <span className="u-label text-[0.6em]! text-muted text-center w-full lg:text-left ">
          © 2026 | Develop By: Sebastian Cardona & Mateo Cardona
        </span>
      </div>
    </footer>
  );
}
