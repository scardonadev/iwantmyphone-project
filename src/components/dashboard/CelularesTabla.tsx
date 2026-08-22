"use client";

import { EyeIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useFiltroUrl } from "@hooks/useFiltroUrl";
import { useBackoffice } from "@lib/backoffice/store";
import { enlaceFiltrado, type FiltroTabla } from "@lib/backoffice/table-filter";
import type { CelularRecord } from "@lib/backoffice/types";
import { formatFechaCorta, formatFechaLanzamiento, formatPrecio } from "@utils/format";
import { DataTable, type Borrador, type ColumnaTabla } from "./DataTable";
import { Miniaturas } from "./Miniatura";

/**
 * CRUD de celulares.
 *
 * La columna "Ficha técnica" es la bisagra con Especificaciones, y es de solo
 * lectura porque el dato no vive aquí: la FK 1:1 está en
 * `especificaciones.celular_id` (AGENTS.md §3). Según exista o no la ficha se
 * ofrece una acción u otra:
 *
 *   - sin ficha  → "+" que abre el alta en `/dashboard/especificaciones?new=<id>`
 *     con el `celular_id` ya relleno;
 *   - con ficha  → "ojo" que abre esa misma pantalla filtrada por `celular_id`.
 *
 * Ambos son `<Link>` y no `router.push`: se pueden abrir en otra pestaña y Next
 * los precarga.
 */

const ACCION_CELDA =
  "inline-flex size-8 items-center justify-center border border-line text-muted transition-colors";

/** `images_urls` es un CSV: se normaliza el separador y se guarda `null` si queda vacío. */
const csvDeImagenes = (valor: string | undefined): string | null => {
  const urls = (valor ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  return urls.length > 0 ? urls.join(",") : null;
};

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function CelularesTabla({ filtroInicial }: { filtroInicial: FiltroTabla }) {
  const { celulares, marcas, marcaPorId, especificacionDeCelular, crudCelulares } =
    useBackoffice();
  const [filtro, setFiltro] = useFiltroUrl(filtroInicial);

  const opcionesMarca = marcas.map((marca) => ({ value: marca.id, label: marca.nombre }));

  const columnas: ColumnaTabla<CelularRecord>[] = [
    {
      key: "id",
      label: "ID",
      ancho: "9rem",
      edicion: "nunca",
      valor: (celular) => celular.id,
      // Es la columna a la que apunta el "ojo" de Especificaciones, así que
      // tiene que ser filtrable aunque se muestre recortada.
      render: (celular) => (
        <span className="font-mono text-xs text-muted" title={celular.id}>
          {celular.id.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: "images_urls",
      label: "Imágenes",
      ancho: "11rem",
      filtrable: false,
      placeholder: "https://…,https://…",
      valor: (celular) => celular.images_urls ?? "",
      render: (celular) => <Miniaturas csv={celular.images_urls} alt={celular.modelo} />,
    },
    {
      key: "marca_id",
      label: "Marca",
      ancho: "10rem",
      tipo: "select",
      requerida: true,
      opciones: opcionesMarca,
      valor: (celular) => celular.marca_id,
      textoFiltro: (celular) => marcaPorId(celular.marca_id)?.nombre ?? "",
      render: (celular) => marcaPorId(celular.marca_id)?.nombre ?? "—",
    },
    {
      key: "modelo",
      label: "Modelo",
      requerida: true,
      placeholder: "iPhone 17 Pro",
      valor: (celular) => celular.modelo,
      render: (celular) => <span className="text-ink">{celular.modelo}</span>,
    },
    {
      key: "precio",
      label: "Precio",
      ancho: "8rem",
      tipo: "number",
      requerida: true,
      alinear: "derecha",
      valor: (celular) => String(celular.precio),
      render: (celular) => (
        <span className="whitespace-nowrap">{formatPrecio(celular.precio)}</span>
      ),
    },
    {
      key: "fecha_lanzamiento",
      label: "Lanzamiento",
      ancho: "11rem",
      tipo: "date",
      requerida: true,
      valor: (celular) => celular.fecha_lanzamiento,
      textoFiltro: (celular) => celular.fecha_lanzamiento,
      render: (celular) => (
        <span className="whitespace-nowrap">
          {formatFechaLanzamiento(celular.fecha_lanzamiento)}
        </span>
      ),
    },
    {
      key: "especificacion",
      label: "Ficha técnica",
      ancho: "8rem",
      edicion: "nunca",
      filtrable: false,
      valor: (celular) => (especificacionDeCelular(celular.id) ? "sí" : "no"),
      render: (celular) => {
        const ficha = especificacionDeCelular(celular.id);

        if (!ficha) {
          return (
            <Link
              href={`/dashboard/especificaciones?new=${celular.id}`}
              aria-label={`Crear la ficha técnica de ${celular.modelo}`}
              title="Crear ficha técnica"
              className={`${ACCION_CELDA} hover:border-accent hover:text-accent`}
            >
              <PlusIcon className="size-4" />
            </Link>
          );
        }

        return (
          <Link
            href={enlaceFiltrado("/dashboard/especificaciones", {
              celular_id: celular.id,
            })}
            aria-label={`Ver la ficha técnica de ${celular.modelo}`}
            title="Ver ficha técnica"
            className={`${ACCION_CELDA} hover:border-ink hover:text-ink`}
          >
            <EyeIcon className="size-4" />
          </Link>
        );
      },
    },
    {
      key: "created_at",
      label: "Registrado",
      ancho: "10rem",
      edicion: "nunca",
      alinear: "derecha",
      valor: (celular) => celular.created_at,
      textoFiltro: (celular) => formatFechaCorta(celular.created_at),
      render: (celular) => (
        <span className="whitespace-nowrap text-muted">
          {formatFechaCorta(celular.created_at)}
        </span>
      ),
    },
  ];

  const aInput = (borrador: Borrador) => ({
    marca_id: borrador.marca_id ?? "",
    modelo: borrador.modelo ?? "",
    precio: Number(borrador.precio),
    fecha_lanzamiento: borrador.fecha_lanzamiento ?? "",
    images_urls: csvDeImagenes(borrador.images_urls),
  });

  const validarBorrador = (borrador: Borrador): string | null => {
    const precio = Number(borrador.precio);
    if (!Number.isFinite(precio) || precio < 0) {
      return "El precio tiene que ser un número mayor o igual que cero";
    }
    if (!FECHA_ISO.test(borrador.fecha_lanzamiento ?? "")) {
      return "La fecha de lanzamiento tiene que tener el formato AAAA-MM-DD";
    }
    return null;
  };

  return (
    <DataTable
      columnas={columnas}
      filas={celulares}
      idDeFila={(celular) => celular.id}
      filtro={filtro}
      onFiltroChange={setFiltro}
      anchoMinimo="80rem"
      etiquetaAlta="Agregar celular"
      vacio="No hay celulares que cumplan estos filtros"
      validarBorrador={validarBorrador}
      onCrear={(borrador) => crudCelulares.crear(aInput(borrador))}
      onActualizar={(id, borrador) => crudCelulares.actualizar(id, aInput(borrador))}
      onEliminar={(id) => crudCelulares.eliminar(id)}
    />
  );
}
