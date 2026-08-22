"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Stars } from "@components/ui/Stars";
import { useBackoffice } from "@lib/backoffice/store";
import type {
  CelularRecord,
  ComentarioRecord,
  EspecificacionRecord,
  MarcaRecord,
} from "@lib/backoffice/types";
import { formatFechaCorta, formatFechaLanzamiento, formatPrecio } from "@utils/format";
import { Miniatura, Miniaturas } from "./Miniatura";

/**
 * Últimos registros de cada entidad, incluidos los comentarios —que no tienen
 * CRUD en el panel porque se escriben desde el sitio público, pero sí conviene
 * vigilar desde aquí—.
 *
 * Son tablas de lectura: sin buscadores ni acciones. Para eso está la pantalla
 * de cada entidad, a un clic en "Ver todos".
 */

const TOPE = 10;

/** Descendente por fecha; el desempate por id mantiene el orden estable. */
const recientes = <T,>(filas: T[], fecha: (fila: T) => string, id: (fila: T) => string) =>
  [...filas]
    .sort((a, b) => fecha(b).localeCompare(fecha(a)) || id(a).localeCompare(id(b)))
    .slice(0, TOPE);

interface ColumnaResumen<T> {
  label: string;
  alinear?: "derecha";
  render: (fila: T) => ReactNode;
}

interface ResumenProps<T> {
  titulo: string;
  href?: string;
  columnas: ColumnaResumen<T>[];
  filas: T[];
  idDeFila: (fila: T) => string;
  vacio: string;
}

function TablaResumen<T>({
  titulo,
  href,
  columnas,
  filas,
  idDeFila,
  vacio,
}: ResumenProps<T>) {
  return (
    <section className="min-w-0">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="u-label text-ink">{titulo}</h3>
        {href && (
          <Link
            href={href}
            className="u-label text-[0.6em]! text-accent underline underline-offset-4 hover:text-ink"
          >
            Ver todos
          </Link>
        )}
      </div>

      <div className="overflow-x-auto border border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface">
              {columnas.map((columna) => (
                <th
                  key={columna.label}
                  scope="col"
                  className={`u-label px-3 py-3 text-[0.6em]! text-muted ${
                    columna.alinear === "derecha" ? "text-right" : ""
                  }`}
                >
                  {columna.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td
                  colSpan={columnas.length}
                  className="px-3 py-10 text-center text-xs text-muted"
                >
                  {vacio}
                </td>
              </tr>
            )}

            {filas.map((fila) => (
              <tr
                key={idDeFila(fila)}
                className="border-b border-line transition-colors last:border-b-0 hover:bg-surface/60"
              >
                {columnas.map((columna) => (
                  <td
                    key={columna.label}
                    className={`px-3 py-3 align-middle text-ink-soft ${
                      columna.alinear === "derecha" ? "text-right" : ""
                    }`}
                  >
                    {columna.render(fila)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function UltimosAgregados() {
  const {
    marcas,
    celulares,
    especificaciones,
    comentarios,
    marcaPorId,
    celularPorId,
  } = useBackoffice();

  const nombreDeCelular = (celularId: string) =>
    celularPorId(celularId)?.modelo ?? "— (celular eliminado)";

  return (
    <section aria-labelledby="ultimos-agregados" className="mt-20">
      <h2 id="ultimos-agregados" className="u-label text-muted">
        Últimos agregados
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Los {TOPE} registros más recientes de cada entidad, del más nuevo al más antiguo.
      </p>

      <div className="mt-8 grid gap-12 xl:grid-cols-2">
        <TablaResumen<CelularRecord>
          titulo="Celulares"
          href="/dashboard/celulares"
          filas={recientes(celulares, (c) => c.created_at, (c) => c.id)}
          idDeFila={(c) => c.id}
          vacio="Todavía no hay celulares"
          columnas={[
            {
              label: "Imágenes",
              render: (c) => <Miniaturas csv={c.images_urls} alt={c.modelo} maximo={2} />,
            },
            { label: "Modelo", render: (c) => <span className="text-ink">{c.modelo}</span> },
            { label: "Marca", render: (c) => marcaPorId(c.marca_id)?.nombre ?? "—" },
            {
              label: "Precio",
              alinear: "derecha",
              render: (c) => formatPrecio(c.precio),
            },
            {
              label: "Lanzamiento",
              alinear: "derecha",
              render: (c) => (
                <span className="whitespace-nowrap">
                  {formatFechaLanzamiento(c.fecha_lanzamiento)}
                </span>
              ),
            },
          ]}
        />

        <TablaResumen<MarcaRecord>
          titulo="Marcas"
          href="/dashboard/marcas"
          filas={recientes(marcas, (m) => m.created_at, (m) => m.id)}
          idDeFila={(m) => m.id}
          vacio="Todavía no hay marcas"
          columnas={[
            { label: "Logo", render: (m) => <Miniatura src={m.logo_url} alt={m.nombre} /> },
            { label: "Nombre", render: (m) => <span className="text-ink">{m.nombre}</span> },
            { label: "País", render: (m) => m.pais_origen },
            {
              label: "Registrada",
              alinear: "derecha",
              render: (m) => (
                <span className="whitespace-nowrap">{formatFechaCorta(m.created_at)}</span>
              ),
            },
          ]}
        />

        <TablaResumen<EspecificacionRecord>
          titulo="Especificaciones"
          href="/dashboard/especificaciones"
          filas={recientes(especificaciones, (e) => e.created_at, (e) => e.id)}
          idDeFila={(e) => e.id}
          vacio="Todavía no hay fichas técnicas"
          columnas={[
            {
              label: "Celular",
              render: (e) => <span className="text-ink">{nombreDeCelular(e.celular_id)}</span>,
            },
            { label: "Procesador", render: (e) => e.procesador },
            { label: "RAM", render: (e) => e.ram },
            { label: "Sistema", render: (e) => e.sistema_op },
            {
              label: "Registrada",
              alinear: "derecha",
              render: (e) => (
                <span className="whitespace-nowrap">{formatFechaCorta(e.created_at)}</span>
              ),
            },
          ]}
        />

        {/* Sin "Ver todos": los comentarios no tienen pantalla propia porque no
            se gestionan desde el panel. */}
        <TablaResumen<ComentarioRecord>
          titulo="Comentarios"
          filas={recientes(comentarios, (c) => c.fecha, (c) => c.id)}
          idDeFila={(c) => c.id}
          vacio="Todavía no hay comentarios"
          columnas={[
            {
              label: "Celular",
              render: (c) => <span className="text-ink">{nombreDeCelular(c.celular_id)}</span>,
            },
            { label: "Autor", render: (c) => c.nombre },
            {
              label: "Valoración",
              render: (c) => (
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Stars value={c.calificacion} />
                  <span className="text-xs text-muted">{c.calificacion}/5</span>
                </span>
              ),
            },
            {
              label: "Fecha",
              alinear: "derecha",
              render: (c) => (
                <span className="whitespace-nowrap">{formatFechaCorta(c.fecha)}</span>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
