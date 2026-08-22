import { AccesosRapidos } from "@components/dashboard/AccesosRapidos";
import { EncabezadoSeccion } from "@components/dashboard/EncabezadoSeccion";
import { UltimosAgregados } from "@components/dashboard/UltimosAgregados";

export default function DashboardHomePage() {
  return (
    <>
      <EncabezadoSeccion
        eyebrow="Inicio"
        titulo="Panel de administración"
        descripcion="Alta, edición y baja de los registros del catálogo. Los comentarios se escriben desde el sitio público: aquí solo se consultan."
      />

      <div className="mt-12">
        <AccesosRapidos />
        <UltimosAgregados />
      </div>
    </>
  );
}
