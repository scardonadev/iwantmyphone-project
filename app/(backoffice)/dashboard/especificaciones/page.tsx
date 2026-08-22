import type { Metadata } from "next";
import { EncabezadoSeccion } from "@components/dashboard/EncabezadoSeccion";
import { EspecificacionesTabla } from "@components/dashboard/EspecificacionesTabla";
import { leerFiltro } from "@lib/backoffice/table-filter";
import { isUuid } from "@lib/http";

export const metadata: Metadata = { title: "Especificaciones" };

export default async function EspecificacionesPage({
  searchParams,
}: PageProps<"/dashboard/especificaciones">) {
  const { filter, new: nuevo } = await searchParams;

  // `?new=` trae el `celular_id` del botón "+" del listado de celulares. Se
  // valida como UUID antes de bajarlo: una URL editada a mano no debe abrir una
  // fila de alta apuntando a cualquier cosa.
  const crudo = Array.isArray(nuevo) ? nuevo[0] : nuevo;
  const nuevoCelularId = crudo && isUuid(crudo) ? crudo : null;

  return (
    <>
      <EncabezadoSeccion
        eyebrow="Entidades"
        titulo="Especificaciones"
        descripcion="Ficha técnica para cada celular. Aquí puedes actualizar y eliminar, si necesitas añadir una nueva especificación se debe crear desde el listado de celulares con el botón “+” en la columna de ficha técnica."
      />

      <div className="mt-10">
        <EspecificacionesTabla
          filtroInicial={leerFiltro(filter)}
          nuevoCelularId={nuevoCelularId}
        />
      </div>
    </>
  );
}
