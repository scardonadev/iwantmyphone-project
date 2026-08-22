import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Galeria } from "@components/detalle/Galeria";
import { DetalleCelular } from "@components/detalle/DetalleCelular";
import { TablaEspecificaciones } from "@components/detalle/TablaEspecificaciones";
import { Valoraciones } from "@components/detalle/Valoraciones";
import { Sugeridos } from "@components/detalle/Sugeridos";
import { obtenerCelular, obtenerSugeridos } from "@lib/queries/celulares";
import { obtenerEspecificacion } from "@lib/queries/especificaciones";
import { listarComentarios } from "@lib/queries/comentarios";
import { isUuid } from "@lib/http";
import { nombreCompleto } from "@utils/format";

export const dynamic = "force-dynamic";

const COMENTARIOS_POR_PAGINA = 5;

export async function generateMetadata({
  params,
}: PageProps<"/celular/[celularId]">): Promise<Metadata> {
  const { celularId } = await params;
  if (!isUuid(celularId)) return { title: "Dispositivo no encontrado" };

  const celular = await obtenerCelular(celularId);
  if (!celular) return { title: "Dispositivo no encontrado" };

  return { title: nombreCompleto(celular.marca.nombre, celular.modelo) };
}

export default async function CelularPage({
  params,
}: PageProps<"/celular/[celularId]">) {
  const { celularId } = await params;

  // Esta ruta dinámica vive en la raíz, así que captura cualquier segmento:
  // si no es un UUID no es un detalle, es un 404.
  if (!isUuid(celularId)) notFound();

  const celular = await obtenerCelular(celularId);
  if (!celular) notFound();

  const nombre = nombreCompleto(celular.marca.nombre, celular.modelo);

  // Especificación, sugeridos y primera página de comentarios en paralelo.
  // La ficha técnica es opcional (1:1 no obligatoria): sin ella, la tabla de
  // especificaciones simplemente no se pinta.
  const [especificacion, sugeridos, comentarios] = await Promise.all([
    celular.especificacion_id === null
      ? null
      : obtenerEspecificacion(celular.especificacion_id),
    obtenerSugeridos(celular.id),
    listarComentarios(celular.id, {
      page: 1,
      limit: COMENTARIOS_POR_PAGINA,
      offset: 0,
    }),
  ]);

  return (
    <>
      <Galeria images={celular.images_url} alt={nombre} />

      <DetalleCelular
        celular={celular}
        totalValoraciones={comentarios.meta.total}
      />

      <TablaEspecificaciones
        especificaciones={especificacion?.especificaciones ?? []}
      />

      <Valoraciones
        celularId={celular.id}
        initialData={comentarios.data}
        initialMeta={comentarios.meta}
      />
      <Sugeridos sugeridos={sugeridos ?? []} />
    </>
  );
}
