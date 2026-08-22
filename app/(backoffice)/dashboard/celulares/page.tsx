import type { Metadata } from "next";
import { CelularesTabla } from "@components/dashboard/CelularesTabla";
import { EncabezadoSeccion } from "@components/dashboard/EncabezadoSeccion";
import { leerFiltro } from "@lib/backoffice/table-filter";

export const metadata: Metadata = { title: "Celulares" };

export default async function CelularesPage({
  searchParams,
}: PageProps<"/dashboard/celulares">) {
  const { filter } = await searchParams;

  return (
    <>
      <EncabezadoSeccion
        eyebrow="Entidades"
        titulo="Celulares"
        descripcion="Administra en esta sección los celulares que se muestran en el catálogo. Puedes filtrar por cualquier especificación técnica, o por fecha de creación."
      />

      <div className="mt-10">
        <CelularesTabla filtroInicial={leerFiltro(filter)} />
      </div>
    </>
  );
}
