"use client";

import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { filtrarFilas, type FiltroTabla } from "@lib/backoffice/table-filter";

/**
 * Tabla CRUD del backoffice: la edición ocurre **dentro de la propia fila**, sin
 * modales ni rutas de formulario.
 *
 * El alta y la actualización son de dos pasos, a propósito:
 *
 *   1. La fila es un formulario. Botón `Guardar` / `Actualizar registro`.
 *   2. Las celdas pasan a `readonly` para releer lo escrito y el botón cambia a
 *      `Confirmar`. Solo entonces se escribe.
 *
 * La baja es el mismo gesto en un paso: el icono de papelera se convierte en
 * `Confirmar eliminado`.
 *
 * Solo puede haber **una fila activa a la vez**. No es una limitación técnica:
 * evita que un `Confirmar` caiga sobre la fila equivocada y le da a "cancelar"
 * un significado único.
 */

export type ModoEdicion = "siempre" | "solo-alta" | "nunca";

export interface ColumnaTabla<T> {
  key: string;
  label: string;
  /** La tabla scrollea en X dentro de su caja: el ancho es orientativo. */
  ancho?: string;
  /** `solo-alta`: se rellena al crear y queda fijo (p. ej. `celular_id`). */
  edicion?: ModoEdicion;
  requerida?: boolean;
  tipo?: "text" | "number" | "date" | "select";
  opciones?: { value: string; label: string }[];
  placeholder?: string;
  /** Por defecto `true`; se apaga en las columnas calculadas. */
  filtrable?: boolean;
  alinear?: "derecha";
  /** Valor crudo: alimenta el borrador y, sin `textoFiltro`, también el filtro. */
  valor: (fila: T) => string;
  /** Texto sobre el que busca el input de cabecera. */
  textoFiltro?: (fila: T) => string;
  /** Celda en modo lectura. Por defecto se pinta `valor(fila)`. */
  render?: (fila: T) => ReactNode;
  /**
   * Celda bloqueada de la fila de alta, donde todavía no hay registro que pasar
   * a `render`. Recibe el valor del borrador: así `celular_id` puede enseñar el
   * modelo del celular en vez del UUID que llega por `?new=`.
   */
  renderValor?: (valor: string) => ReactNode;
}

export type Borrador = Record<string, string>;

interface DataTableProps<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  idDeFila: (fila: T) => string;

  filtro: FiltroTabla;
  onFiltroChange: (filtro: FiltroTabla) => void;

  onCrear?: (borrador: Borrador) => Promise<unknown>;
  onActualizar?: (id: string, borrador: Borrador) => Promise<unknown>;
  onEliminar?: (id: string) => Promise<unknown>;

  /**
   * Validación de formato y entre campos (precio numérico, fecha válida…), más
   * allá de los obligatorios. Corre al pulsar `Guardar`/`Actualizar registro`,
   * no al confirmar: el error se ve mientras la fila todavía es editable.
   */
  validarBorrador?: (borrador: Borrador, accion: "alta" | "edicion") => string | null;

  /** Valores con los que arranca la fila de alta (p. ej. el `celular_id` de `?new=`). */
  borradorInicial?: Borrador;
  /** Abre la fila de alta nada más montar, sin pulsar el botón. */
  altaAlMontar?: boolean;
  /** El alta existe, pero no se ofrece desde esta pantalla (Especificaciones). */
  ocultarBotonAlta?: boolean;
  etiquetaAlta?: string;
  anchoMinimo?: string;
  vacio?: string;
}

type Accion = "alta" | "edicion" | "baja";

interface FilaActiva {
  id: string;
  accion: Accion;
  confirmando: boolean;
  borrador: Borrador;
  error: string | null;
  guardando: boolean;
}

/** Id sintético de la fila de alta: no colisiona con ningún UUID. */
const FILA_NUEVA = "__nueva__";

const mensajeDeError = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación";

/** En el alta hasta las columnas `solo-alta` son editables; al actualizar, no. */
const esEditable = (edicion: ModoEdicion | undefined, accion: Accion) =>
  accion === "alta" ? edicion !== "nunca" : (edicion ?? "siempre") === "siempre";

export function DataTable<T>({
  columnas,
  filas,
  idDeFila,
  filtro,
  onFiltroChange,
  onCrear,
  onActualizar,
  onEliminar,
  validarBorrador,
  borradorInicial,
  altaAlMontar = false,
  ocultarBotonAlta = false,
  etiquetaAlta = "Agregar registro",
  anchoMinimo = "64rem",
  vacio = "No hay registros que cumplan estos filtros",
}: DataTableProps<T>) {
  const nuevaFilaAlta = (borrador: Borrador): FilaActiva => ({
    id: FILA_NUEVA,
    accion: "alta",
    confirmando: false,
    borrador,
    error: null,
    guardando: false,
  });

  // `?new=<celular_id>` entra por aquí: la fila de alta nace abierta y con la FK
  // ya rellena. Es un inicializador y no un efecto porque el dato está desde el
  // primer render (el layout lo resuelve en servidor): abrirla después obligaría
  // a un segundo render y a un parpadeo de la tabla.
  const [activa, setActiva] = useState<FilaActiva | null>(() =>
    altaAlMontar ? nuevaFilaAlta({ ...borradorInicial }) : null,
  );
  const primeraCelda = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // El foco vuelve a la primera celda editable cada vez que la fila entra en un
  // paso editable (alta, edición, o vuelta atrás desde la confirmación).
  const pasoEditable =
    activa && !activa.confirmando && activa.accion !== "baja"
      ? `${activa.id}:${activa.accion}`
      : null;

  useEffect(() => {
    if (pasoEditable) primeraCelda.current?.focus();
  }, [pasoEditable]);

  const textoDeColumna = useMemo(() => {
    const porKey = new Map(columnas.map((columna) => [columna.key, columna]));
    return (fila: T, key: string): string | null => {
      const columna = porKey.get(key);
      if (!columna || columna.filtrable === false) return null;
      return (columna.textoFiltro ?? columna.valor)(fila);
    };
  }, [columnas]);

  const visibles = useMemo(() => {
    const filtradas = filtrarFilas(filas, filtro, textoDeColumna);

    // Si el filtro esconde la fila que se está editando, se reincorpora: perder
    // el borrador por teclear en la cabecera sería un fallo, no un filtro.
    if (activa && activa.id !== FILA_NUEVA) {
      const dentro = filtradas.some((fila) => idDeFila(fila) === activa.id);
      const original = filas.find((fila) => idDeFila(fila) === activa.id);
      if (!dentro && original) return [original, ...filtradas];
    }
    return filtradas;
  }, [filas, filtro, textoDeColumna, activa, idDeFila]);

  const primeraEditable = (accion: Accion) =>
    columnas.find((columna) => esEditable(columna.edicion, accion))?.key;

  const validar = ({ accion, borrador }: FilaActiva): string | null => {
    const faltan = columnas
      .filter(
        (columna) =>
          columna.requerida &&
          esEditable(columna.edicion, accion) &&
          !borrador[columna.key]?.trim(),
      )
      .map((columna) => columna.label);

    if (faltan.length > 0) return `Faltan campos obligatorios: ${faltan.join(", ")}`;
    return accion === "baja" ? null : (validarBorrador?.(borrador, accion) ?? null);
  };

  const irAConfirmacion = () =>
    setActiva((estado) => {
      if (!estado) return estado;
      const error = validar(estado);
      return error ? { ...estado, error } : { ...estado, confirmando: true, error: null };
    });

  const confirmar = async () => {
    if (!activa) return;
    setActiva({ ...activa, guardando: true, error: null });

    try {
      if (activa.accion === "alta") await onCrear?.(activa.borrador);
      else if (activa.accion === "edicion") await onActualizar?.(activa.id, activa.borrador);
      else await onEliminar?.(activa.id);

      setActiva(null);
    } catch (error) {
      // Se vuelve al paso editable para corregir lo que rechazó el servidor.
      // La baja no tiene paso editable: se queda donde está con el mensaje.
      setActiva({
        ...activa,
        guardando: false,
        confirmando: activa.accion === "baja",
        error: mensajeDeError(error),
      });
    }
  };

  const escribirCelda = (key: string, value: string) =>
    setActiva((estado) =>
      estado ? { ...estado, borrador: { ...estado.borrador, [key]: value } } : estado,
    );

  const hayFiltros = Object.values(filtro).some((value) => value.trim());
  const puedeCrear = Boolean(onCrear) && !ocultarBotonAlta;
  const totalColumnas = columnas.length + 1;

  const renderCelda = (columna: ColumnaTabla<T>, estado: FilaActiva, fila?: T) => {
    if (!esEditable(columna.edicion, estado.accion)) {
      // Bloqueada en este paso (id, created_at, `celular_id` al actualizar):
      // se enseña igual que en modo lectura.
      if (fila && columna.render) return columna.render(fila);
      if (columna.renderValor) return columna.renderValor(estado.borrador[columna.key] ?? "");
      return (
        <span className="text-ink-soft">
          {estado.borrador[columna.key] || <span className="text-muted">—</span>}
        </span>
      );
    }

    const bloqueado = estado.confirmando || estado.guardando;
    const esPrimera = primeraEditable(estado.accion) === columna.key;
    const comun = {
      value: estado.borrador[columna.key] ?? "",
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        escribirCelda(columna.key, event.target.value),
      "aria-label": columna.label,
      className: "u-input",
    };

    if (columna.tipo === "select") {
      return (
        <select
          {...comun}
          ref={
            esPrimera
              ? (elemento) => {
                  primeraCelda.current = elemento;
                }
              : undefined
          }
          // Los `<select>` no admiten readonly: en el paso de confirmación se
          // desactivan, que produce el mismo bloqueo con el mismo aspecto.
          disabled={bloqueado}
        >
          <option value="">—</option>
          {columna.opciones?.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        {...comun}
        ref={
          esPrimera
            ? (elemento) => {
                primeraCelda.current = elemento;
              }
            : undefined
        }
        type={
          columna.tipo === "number" ? "number" : columna.tipo === "date" ? "date" : "text"
        }
        step={columna.tipo === "number" ? "0.01" : undefined}
        min={columna.tipo === "number" ? "0" : undefined}
        placeholder={columna.placeholder}
        readOnly={bloqueado}
      />
    );
  };

  const renderAcciones = (estado: FilaActiva) => {
    const etiqueta =
      estado.accion === "baja"
        ? "Confirmar eliminado"
        : estado.confirmando
          ? "Confirmar"
          : estado.accion === "alta"
            ? "Guardar"
            : "Actualizar registro";

    const escribe = estado.confirmando || estado.accion === "baja";

    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={estado.guardando}
          onClick={escribe ? confirmar : irAConfirmacion}
          className={`u-label whitespace-nowrap border px-3 py-2 transition-colors disabled:opacity-40 ${
            estado.accion === "baja"
              ? "border-red-700 text-red-700 hover:bg-red-700 hover:text-paper"
              : escribe
                ? "border-accent text-accent hover:bg-accent hover:text-paper"
                : "border-ink text-ink hover:bg-ink hover:text-paper"
          }`}
        >
          {estado.guardando ? "Guardando…" : etiqueta}
        </button>

        <button
          type="button"
          onClick={() => setActiva(null)}
          disabled={estado.guardando}
          aria-label="Cancelar"
          title="Cancelar"
          className="inline-flex size-9 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    );
  };

  return (
    <div>
      {puedeCrear && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setActiva(nuevaFilaAlta({ ...borradorInicial }))}
            disabled={activa !== null}
            className="u-label inline-flex items-center gap-2 border border-ink px-6 py-3 text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
          >
            <PlusIcon className="size-4" />
            {etiquetaAlta}
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-line">
        <table
          style={{ minWidth: anchoMinimo }}
          className="w-full border-collapse text-left text-sm"
        >
          <thead>
            <tr className="border-b border-line bg-surface">
              {columnas.map((columna) => (
                <th
                  key={columna.key}
                  scope="col"
                  style={{ width: columna.ancho }}
                  className={`u-label px-3 py-3 text-muted ${
                    columna.alinear === "derecha" ? "text-right" : ""
                  }`}
                >
                  {columna.label}
                </th>
              ))}
              <th scope="col" className="u-label px-3 py-3 text-right text-muted">
                Acciones
              </th>
            </tr>

            {/* Buscador por columna: mismo formato de filtro que la API (§5),
                resuelto en cliente y con `onChange` en cada pulsación. */}
            <tr className="border-b border-line">
              {columnas.map((columna) => (
                <th key={columna.key} scope="col" className="px-3 py-2 font-normal">
                  {columna.filtrable === false ? null : (
                    <input
                      type="search"
                      className="u-input"
                      value={filtro[columna.key] ?? ""}
                      placeholder="Buscar…"
                      aria-label={`Buscar por ${columna.label}`}
                      onChange={(event) =>
                        onFiltroChange({ ...filtro, [columna.key]: event.target.value })
                      }
                    />
                  )}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-normal">
                {hayFiltros && (
                  <button
                    type="button"
                    onClick={() => onFiltroChange({})}
                    className="u-label whitespace-nowrap text-ink underline underline-offset-4 hover:text-muted"
                  >
                    Limpiar
                  </button>
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {activa?.accion === "alta" && (
              <tr className="border-b border-line bg-accent/5">
                {columnas.map((columna) => (
                  <td key={columna.key} className="px-3 py-3 align-middle">
                    {renderCelda(columna, activa)}
                  </td>
                ))}
                <td className="px-3 py-3">
                  {renderAcciones(activa)}
                  {activa.error && (
                    <p className="mt-2 text-right text-xs text-red-700">{activa.error}</p>
                  )}
                </td>
              </tr>
            )}

            {visibles.length === 0 && activa?.accion !== "alta" && (
              <tr>
                <td colSpan={totalColumnas} className="px-3 py-16 text-center text-muted">
                  {vacio}
                </td>
              </tr>
            )}

            {visibles.map((fila) => {
              const id = idDeFila(fila);
              const estado = activa?.id === id ? activa : null;
              const enFormulario = estado !== null && estado.accion !== "baja";

              return (
                <tr
                  key={id}
                  className={`border-b border-line transition-colors last:border-b-0 ${
                    estado ? "bg-surface" : "hover:bg-surface/60"
                  }`}
                >
                  {columnas.map((columna) => (
                    <td
                      key={columna.key}
                      className={`px-3 py-3 align-middle ${
                        columna.alinear === "derecha" ? "text-right" : ""
                      }`}
                    >
                      {enFormulario
                        ? renderCelda(columna, estado, fila)
                        : (columna.render?.(fila) ?? (
                            <span className="text-ink-soft">
                              {columna.valor(fila) || <span className="text-muted">—</span>}
                            </span>
                          ))}
                    </td>
                  ))}

                  <td className="px-3 py-3">
                    {estado ? (
                      <div>
                        {renderAcciones(estado)}
                        {estado.error && (
                          <p className="mt-2 text-right text-xs text-red-700">
                            {estado.error}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {onActualizar && (
                          <button
                            type="button"
                            disabled={activa !== null}
                            aria-label={`Actualizar registro ${id}`}
                            title="Actualizar"
                            onClick={() =>
                              setActiva({
                                id,
                                accion: "edicion",
                                confirmando: false,
                                error: null,
                                guardando: false,
                                borrador: Object.fromEntries(
                                  columnas.map((columna) => [
                                    columna.key,
                                    columna.valor(fila),
                                  ]),
                                ),
                              })
                            }
                            className="inline-flex size-9 items-center justify-center border border-line text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                        )}

                        {onEliminar && (
                          <button
                            type="button"
                            disabled={activa !== null}
                            aria-label={`Eliminar registro ${id}`}
                            title="Eliminar"
                            onClick={() =>
                              setActiva({
                                id,
                                accion: "baja",
                                // La baja nace confirmando: un solo paso.
                                confirmando: true,
                                borrador: {},
                                error: null,
                                guardando: false,
                              })
                            }
                            className="inline-flex size-9 items-center justify-center border border-line text-muted transition-colors hover:border-red-700 hover:text-red-700 disabled:opacity-40"
                          >
                            <Trash2Icon className="size-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        {visibles.length} de {filas.length} registros{hayFiltros ? " (filtrados)" : ""}
      </p>
    </div>
  );
}
