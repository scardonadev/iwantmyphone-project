"use client";

import { useCallback, useState } from "react";
import { escribirFiltro, type FiltroTabla } from "@lib/backoffice/table-filter";

/**
 * Estado de los buscadores de una tabla, espejado en la URL.
 *
 * El valor inicial llega desde el Server Component (que ya hizo `await
 * searchParams`), así que un enlace profundo como
 * `/dashboard/celulares?filter={"id":"…"}` abre la tabla ya filtrada.
 *
 * Las pulsaciones posteriores se escriben con `window.history.replaceState` y
 * **no** con `router.replace`: Next lo integra con `usePathname` /
 * `useSearchParams`, pero sin volver a ejecutar el Server Component. Con un
 * `onChange` por tecla, `router.replace` significaría un render de servidor por
 * pulsación para un filtro que se resuelve entero en cliente. Se usa `replace`
 * y no `push` para no llenar el historial, igual que los filtros de la Home.
 */
export function useFiltroUrl(inicial: FiltroTabla) {
  const [filtro, setFiltro] = useState<FiltroTabla>(inicial);

  const aplicar = useCallback((siguiente: FiltroTabla) => {
    setFiltro(siguiente);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${escribirFiltro(siguiente)}`,
    );
  }, []);

  return [filtro, aplicar] as const;
}
