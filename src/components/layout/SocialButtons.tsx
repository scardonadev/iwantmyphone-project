import type { ReactNode } from "react";

interface Social {
  nombre: string;
  href: string;
  icon: ReactNode;
}

const SOCIALS: Social[] = [
  {
    nombre: "Instagram",
    href: "https://instagram.com",
    icon: (
      <path d="M10 2c-2.2 0-2.5 0-3.3.05-.9.04-1.5.18-2 .38a4 4 0 00-1.5 1A4 4 0 002.4 5c-.2.5-.34 1.1-.38 2C2 7.5 2 7.8 2 10s0 2.5.05 3.3c.04.9.18 1.5.38 2a4 4 0 001 1.5 4 4 0 001.5 1c.5.2 1.1.34 2 .38.8.05 1.1.05 3.3.05s2.5 0 3.3-.05c.9-.04 1.5-.18 2-.38a4.2 4.2 0 002.4-2.4c.2-.5.34-1.1.38-2 .05-.8.05-1.1.05-3.3s0-2.5-.05-3.3c-.04-.9-.18-1.5-.38-2a4 4 0 00-1-1.5 4 4 0 00-1.5-1c-.5-.2-1.1-.34-2-.38C12.5 2 12.2 2 10 2zm0 1.6c2.1 0 2.4 0 3.2.05.8.03 1.2.17 1.5.28.4.15.6.32.9.6.28.3.45.5.6.9.11.3.25.7.28 1.5.05.8.05 1.1.05 3.2s0 2.4-.05 3.2c-.03.8-.17 1.2-.28 1.5-.15.4-.32.6-.6.9-.3.28-.5.45-.9.6-.3.11-.7.25-1.5.28-.8.05-1.1.05-3.2.05s-2.4 0-3.2-.05c-.8-.03-1.2-.17-1.5-.28a2.5 2.5 0 01-.9-.6 2.5 2.5 0 01-.6-.9c-.11-.3-.25-.7-.28-1.5C3.6 12.4 3.6 12.1 3.6 10s0-2.4.05-3.2c.03-.8.17-1.2.28-1.5.15-.4.32-.6.6-.9.3-.28.5-.45.9-.6.3-.11.7-.25 1.5-.28C7.6 3.6 7.9 3.6 10 3.6zm0 2.7a3.7 3.7 0 100 7.4 3.7 3.7 0 000-7.4zm0 6.1a2.4 2.4 0 110-4.8 2.4 2.4 0 010 4.8zm4.7-6.2a.86.86 0 11-1.7 0 .86.86 0 011.7 0z" />
    ),
  },
  {
    nombre: "Facebook",
    href: "https://facebook.com",
    icon: (
      <path d="M18 10a8 8 0 10-9.2 7.9v-5.6H6.7V10h2.1V8.2c0-2.1 1.2-3.2 3.1-3.2.9 0 1.8.16 1.8.16v2h-1c-1 0-1.3.62-1.3 1.26V10h2.2l-.35 2.3h-1.85v5.6A8 8 0 0018 10z" />
    ),
  },
  {
    nombre: "YouTube",
    href: "https://youtube.com",
    icon: (
      <path d="M18.6 6.2a2.2 2.2 0 00-1.6-1.6C15.6 4.2 10 4.2 10 4.2s-5.6 0-7 .4a2.2 2.2 0 00-1.6 1.6C1 7.6 1 10 1 10s0 2.4.4 3.8a2.2 2.2 0 001.6 1.6c1.4.4 7 .4 7 .4s5.6 0 7-.4a2.2 2.2 0 001.6-1.6c.4-1.4.4-3.8.4-3.8s0-2.4-.4-3.8zM8.2 12.7V7.3l4.7 2.7-4.7 2.7z" />
    ),
  },
];

/** Botones de redes del footer: cuadrados finos, monocromo, acento al hover. */
export function SocialButtons() {
  return (
    <nav aria-label="Redes sociales">
      <ul className="flex items-center gap-2">
        {SOCIALS.map((social) => (
          <li key={social.nombre}>
            <a
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.nombre}
              className="flex size-10 items-center justify-center border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="size-4"
              >
                {social.icon}
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
