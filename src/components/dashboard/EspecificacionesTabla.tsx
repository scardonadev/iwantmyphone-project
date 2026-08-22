"use client";

import { EyeIcon } from "lucide-react";
import Link from "next/link";
import { useFiltroUrl } from "@hooks/useFiltroUrl";
import { useBackoffice } from "@lib/backoffice/store";
import {
  enlaceFiltrado,
  escribirFiltro,
  type FiltroTabla,
} from "@lib/backoffice/table-filter";
import type { EspecificacionRecord } from "@lib/backoffice/types";
import { formatFechaCorta } from "@utils/format";
import { SPEC_FIELDS } from "@utils/spec-fields";
import { specLabel } from "@utils/spec-labels";
import { DataTable, type Borrador, type ColumnaTabla } from "./DataTable";

/**
 * CRUD de especificaciones — con el alta amputada a propósito.
 *
 * Una ficha no existe sin su celular (`especificaciones.celular_id` es
 * `UNIQUE NOT NULL`, AGENTS.md §3), así que el alta arranca siempre desde el
 * listado de celulares: el botón "+" de aquella tabla trae a esta pantalla con
 * `?new=<celular_id>` y la fila de alta se abre sola con la FK ya puesta. Desde
 * aquí solo se puede ver, actualizar y eliminar, y `celular_id` nunca es
 * editable: reasignar una ficha a otro modelo es borrarla y crearla de nuevo.
 *
 * Las siete columnas técnicas se generan desde `SPEC_FIELDS`, que es el orden
 * canónico del contrato (§4). Así la tabla del panel y la del detalle público
 * no pueden divergir.
 */

interface EspecificacionesTablaProps {
  filtroInicial: FiltroTabla;
  /** `?new=<celular_id>`: llega del listado de celulares. */
  nuevoCelularId: string | null;
}

const PLACEHOLDERS: Record<string, string> = {
  procesador: "Apple A19 Pro",
  ram: "12 GB",
  almacenamiento: "256GB / 512GB / 1TB",
  pantalla: '6.3" ProMotion 120Hz',
  camara: "Triple 48 MP",
  bateria: "3800 mAh",
  sistema_op: "iOS 26.0",
};

export function EspecificacionesTabla({
  filtroInicial,
  nuevoCelularId,
}: EspecificacionesTablaProps) {
  const {
    especificaciones,
    celularPorId,
    especificacionDeCelular,
    crudEspecificaciones,
  } = useBackoffice();
  const [filtro, setFiltro] = useFiltroUrl(filtroInicial);

  const celularDestino = nuevoCelularId ? celularPorId(nuevoCelularId) : undefined;
  const fichaExistente = nuevoCelularId ? especificacionDeCelular(nuevoCelularId) : undefined;
  // El `?new=` ya viene validado como UUID desde la página, pero eso solo dice
  // que tiene forma de id: aquí se comprueba que el celular exista y que no
  // tenga ya ficha. Si falla cualquiera de las dos, en vez del alta se explica
  // por qué (la relación es 1:1 y la FK es UNIQUE).
  const abrirAlta = Boolean(nuevoCelularId && celularDestino && !fichaExistente);

  const nombreDeCelular = (celularId: string) =>
    celularPorId(celularId)?.modelo ?? "— (celular eliminado)";

  const columnas: ColumnaTabla<EspecificacionRecord>[] = [
    {
      key: "celular_id",
      label: "Celular",
      ancho: "16rem",
      edicion: "nunca",
      valor: (ficha) => ficha.celular_id,
      // Se busca tanto por UUID —el enlace profundo del "+"/"ojo" de Celulares
      // manda el id— como por modelo, que es lo que se ve en la celda.
      textoFiltro: (ficha) => `${ficha.celular_id} ${nombreDeCelular(ficha.celular_id)}`,
      render: (ficha) => (
        <span className="flex items-center gap-3">
          <Link
            href={enlaceFiltrado("/dashboard/celulares", { id: ficha.celular_id })}
            aria-label={`Ver ${nombreDeCelular(ficha.celular_id)} en el listado de celulares`}
            title="Ver el celular"
            className="inline-flex size-8 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-ink hover:text-ink"
          >
            <EyeIcon className="size-4" />
          </Link>
          <span className="min-w-0">
            <span className="block truncate text-ink">
              {nombreDeCelular(ficha.celular_id)}
            </span>
            <span className="block truncate font-mono text-[0.6875rem] text-muted">
              {ficha.celular_id.slice(0, 8)}…
            </span>
          </span>
        </span>
      ),
      renderValor: (celularId) => (
        <span className="min-w-0">
          <span className="block truncate text-ink">{nombreDeCelular(celularId)}</span>
          <span className="u-label block text-[0.6em]! text-accent">Asignado</span>
        </span>
      ),
    },

    ...SPEC_FIELDS.map<ColumnaTabla<EspecificacionRecord>>((campo) => ({
      key: campo,
      label: specLabel(campo),
      requerida: true,
      placeholder: PLACEHOLDERS[campo],
      valor: (ficha) => ficha[campo],
    })),

    {
      key: "created_at",
      label: "Registrada",
      ancho: "10rem",
      edicion: "nunca",
      alinear: "derecha",
      valor: (ficha) => ficha.created_at,
      textoFiltro: (ficha) => formatFechaCorta(ficha.created_at),
      render: (ficha) => (
        <span className="whitespace-nowrap text-muted">
          {formatFechaCorta(ficha.created_at)}
        </span>
      ),
    },
  ];

  const camposTecnicos = (borrador: Borrador) =>
    Object.fromEntries(SPEC_FIELDS.map((campo) => [campo, borrador[campo] ?? ""])) as Record<
      (typeof SPEC_FIELDS)[number],
      string
    >;

  const crear = async (borrador: Borrador) => {
    await crudEspecificaciones.crear({
      celular_id: borrador.celular_id ?? "",
      ...camposTecnicos(borrador),
    });

    // El alta ya se consumió: se quita `?new=` para que recargar la página no
    // vuelva a abrir una fila para un celular que ahora sí tiene ficha.
    window.history.replaceState(
      null,
      "",
      `/dashboard/especificaciones${escribirFiltro(filtro)}`,
    );
  };

  return (
    <>
      {nuevoCelularId && !abrirAlta && (
        <p className="mb-6 border border-line bg-surface px-5 py-4 text-sm text-ink-soft">
          {fichaExistente ? (
            <>
              <strong className="font-normal text-ink">
                {nombreDeCelular(nuevoCelularId)}
              </strong>{" "}
              ya tiene ficha técnica, así que no se puede crear otra: la relación es 1:1.{" "}
              <Link
                href={enlaceFiltrado("/dashboard/especificaciones", {
                  celular_id: nuevoCelularId,
                })}
                className="text-accent underline underline-offset-4"
              >
                Ver la ficha existente
              </Link>
              .
            </>
          ) : (
            <>
              El celular indicado en la URL no existe.{" "}
              <Link
                href="/dashboard/celulares"
                className="text-accent underline underline-offset-4"
              >
                Volver al listado de celulares
              </Link>
              .
            </>
          )}
        </p>
      )}

      <DataTable
        columnas={columnas}
        filas={especificaciones}
        idDeFila={(ficha) => ficha.id}
        filtro={filtro}
        onFiltroChange={setFiltro}
        anchoMinimo="96rem"
        // El alta existe, pero solo se entra por `?new=` desde Celulares.
        ocultarBotonAlta
        altaAlMontar={abrirAlta}
        borradorInicial={nuevoCelularId ? { celular_id: nuevoCelularId } : undefined}
        vacio="No hay fichas técnicas que cumplan estos filtros"
        onCrear={crear}
        onActualizar={(id, borrador) =>
          crudEspecificaciones.actualizar(id, camposTecnicos(borrador))
        }
        onEliminar={(id) => crudEspecificaciones.eliminar(id)}
      />
    </>
  );
}
