import type { Metadata } from "next";
import { EncabezadoSeccion } from "@components/dashboard/EncabezadoSeccion";
import { MarcasTabla } from "@components/dashboard/MarcasTabla";
import { leerFiltro } from "@lib/backoffice/table-filter";

export const metadata: Metadata = { title: "Marcas" };

/**
 * El filtro se lee aquí, en servidor, y baja como valor inicial: así un enlace
 * profundo `?filter={"nombre":"apple"}` abre la tabla ya filtrada sin que el
 * componente cliente necesite `useSearchParams` ni un `<Suspense>` alrededor.
 */
export default async function MarcasPage({
  searchParams,
}: PageProps<"/dashboard/marcas">) {
  const { filter } = await searchParams;

  return (
    <>
      <EncabezadoSeccion
        eyebrow="Entidades"
        titulo="Marcas"
        descripcion="Fabricantes del catálogo. Una marca con celulares asociados no se puede eliminar: la FK de `celulares` es ON DELETE RESTRICT."
      />

      <div className="mt-10">
        <MarcasTabla filtroInicial={leerFiltro(filter)} />
      </div>
    </>
  );
}
