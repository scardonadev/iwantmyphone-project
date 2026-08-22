"use client";

import { useFiltroUrl } from "@hooks/useFiltroUrl";
import { useBackoffice } from "@lib/backoffice/store";
import type { FiltroTabla } from "@lib/backoffice/table-filter";
import type { MarcaRecord } from "@lib/backoffice/types";
import { formatFechaCorta } from "@utils/format";
import { DataTable, type ColumnaTabla } from "./DataTable";
import { Miniatura } from "./Miniatura";

/**
 * CRUD de marcas.
 *
 * `logo_url` es la única columna nullable: se guarda `null` cuando el campo
 * queda vacío, no la cadena vacía, para que la API pueda seguir devolviendo
 * `marca.logo: null` (AGENTS.md §4).
 */
export function MarcasTabla({ filtroInicial }: { filtroInicial: FiltroTabla }) {
  const { marcas, crudMarcas } = useBackoffice();
  const [filtro, setFiltro] = useFiltroUrl(filtroInicial);

  const columnas: ColumnaTabla<MarcaRecord>[] = [
    {
      key: "logo_url",
      label: "Logo",
      ancho: "6rem",
      filtrable: false,
      placeholder: "https://…",
      valor: (marca) => marca.logo_url ?? "",
      render: (marca) => <Miniatura src={marca.logo_url} alt={`Logotipo de ${marca.nombre}`} />,
    },
    {
      key: "nombre",
      label: "Nombre",
      requerida: true,
      placeholder: "Apple",
      valor: (marca) => marca.nombre,
      render: (marca) => <span className="text-ink">{marca.nombre}</span>,
    },
    {
      key: "pais_origen",
      label: "País de origen",
      requerida: true,
      placeholder: "Estados Unidos",
      valor: (marca) => marca.pais_origen,
    },
    {
      key: "created_at",
      label: "Registrada",
      ancho: "10rem",
      edicion: "nunca",
      alinear: "derecha",
      valor: (marca) => marca.created_at,
      textoFiltro: (marca) => formatFechaCorta(marca.created_at),
      render: (marca) => (
        <span className="whitespace-nowrap text-muted">
          {formatFechaCorta(marca.created_at)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columnas={columnas}
      filas={marcas}
      idDeFila={(marca) => marca.id}
      filtro={filtro}
      onFiltroChange={setFiltro}
      anchoMinimo="48rem"
      etiquetaAlta="Agregar marca"
      vacio="No hay marcas que cumplan estos filtros"
      onCrear={(borrador) =>
        crudMarcas.crear({
          nombre: borrador.nombre ?? "",
          logo_url: borrador.logo_url?.trim() || null,
          pais_origen: borrador.pais_origen ?? "",
        })
      }
      onActualizar={(id, borrador) =>
        crudMarcas.actualizar(id, {
          nombre: borrador.nombre ?? "",
          logo_url: borrador.logo_url?.trim() || null,
          pais_origen: borrador.pais_origen ?? "",
        })
      }
      onEliminar={(id) => crudMarcas.eliminar(id)}
    />
  );
}
