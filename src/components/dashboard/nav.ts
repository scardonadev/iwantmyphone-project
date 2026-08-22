import { CpuIcon, SmartphoneIcon, TagIcon, type LucideIcon } from "lucide-react";

/**
 * Entidades del backoffice. Una sola lista para el menú lateral y para los
 * accesos rápidos del home: añadir una entidad es tocar este archivo y nada más.
 *
 * Los comentarios no están: se leen desde el frontend público y el dashboard
 * solo los muestra en "últimos agregados", sin CRUD.
 */

export interface EntidadNav {
  key: "celulares" | "marcas" | "especificaciones";
  label: string;
  href: string;
  icono: LucideIcon;
  descripcion: string;
}

export const ENTIDADES: EntidadNav[] = [
  {
    key: "celulares",
    label: "Celulares",
    href: "/dashboard/celulares",
    icono: SmartphoneIcon,
    descripcion:
      "Catálogo de dispositivos: marca, modelo, precio, fecha de lanzamiento e imágenes.",
  },
  {
    key: "marcas",
    label: "Marcas",
    href: "/dashboard/marcas",
    icono: TagIcon,
    descripcion: "Fabricantes del catálogo: nombre, logotipo y país de origen.",
  },
  {
    key: "especificaciones",
    label: "Especificaciones",
    href: "/dashboard/especificaciones",
    icono: CpuIcon,
    descripcion:
      "Ficha técnica de cada celular. Es 1:1 y se da de alta desde el listado de celulares.",
  },
];
