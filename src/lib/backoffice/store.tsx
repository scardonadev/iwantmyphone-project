"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { cargarDataset, celularesApi, especificacionesApi, marcasApi } from "./api";
import type {
  CelularInput,
  CelularRecord,
  ComentarioRecord,
  Dataset,
  EspecificacionInput,
  EspecificacionRecord,
  MarcaInput,
  MarcaRecord,
} from "./types";

/**
 * Estado compartido del dashboard.
 *
 * La carga inicial **no** ocurre aquí: llega ya resuelta desde el layout, que
 * es un Server Component, igual que el listado de la Home recibe su
 * `initialData` (AGENTS.md §6). Este proveedor solo mantiene el catálogo al día
 * tras cada escritura, así que no hay estado de carga que gestionar ni un
 * `useEffect` que dispare peticiones en cascada.
 *
 * Vive en el layout y no en cada página para que el estado sobreviva a la
 * navegación entre secciones: una marca recién creada aparece en el select de
 * Celulares sin volver a pedir nada.
 *
 * Las mutaciones **lanzan** en caso de error: quien las llama —la fila de la
 * tabla— es quien sabe dónde enseñar el mensaje.
 */

interface CrudEntidad<TInput> {
  crear: (input: TInput) => Promise<unknown>;
  actualizar: (id: string, input: TInput) => Promise<unknown>;
  eliminar: (id: string) => Promise<void>;
}

interface BackofficeContexto {
  marcas: MarcaRecord[];
  celulares: CelularRecord[];
  especificaciones: EspecificacionRecord[];
  comentarios: ComentarioRecord[];

  /** Índices: evitan recorrer arrays dentro del render de cada fila. */
  marcaPorId: (id: string) => MarcaRecord | undefined;
  celularPorId: (id: string) => CelularRecord | undefined;
  especificacionDeCelular: (celularId: string) => EspecificacionRecord | undefined;

  crudMarcas: CrudEntidad<MarcaInput>;
  crudCelulares: CrudEntidad<CelularInput>;
  /** `celular_id` no viaja en el update: la ficha no se reasigna. */
  crudEspecificaciones: CrudEntidad<EspecificacionInput> & {
    actualizar: (
      id: string,
      input: Omit<EspecificacionInput, "celular_id">,
    ) => Promise<unknown>;
  };
}

const Contexto = createContext<BackofficeContexto | null>(null);

interface BackofficeProviderProps {
  datosIniciales: Dataset;
  children: ReactNode;
}

export function BackofficeProvider({ datosIniciales, children }: BackofficeProviderProps) {
  const [dataset, setDataset] = useState<Dataset>(datosIniciales);

  const valor = useMemo<BackofficeContexto>(() => {
    const marcasIdx = new Map(dataset.marcas.map((m) => [m.id, m]));
    const celularesIdx = new Map(dataset.celulares.map((c) => [c.id, c]));
    const especIdx = new Map(dataset.especificaciones.map((e) => [e.celular_id, e]));

    // Tras cada escritura correcta se relee el catálogo entero: una sola fuente
    // de verdad y ninguna copia optimista que reconciliar. Si la escritura
    // falla, la excepción sube sin tocar el estado.
    const tras = async <T,>(operacion: Promise<T>): Promise<T> => {
      const resultado = await operacion;
      setDataset(await cargarDataset());
      return resultado;
    };

    return {
      ...dataset,
      marcaPorId: (id) => marcasIdx.get(id),
      celularPorId: (id) => celularesIdx.get(id),
      especificacionDeCelular: (celularId) => especIdx.get(celularId),

      crudMarcas: {
        crear: (input) => tras(marcasApi.crear(input)),
        actualizar: (id, input) => tras(marcasApi.actualizar(id, input)),
        eliminar: (id) => tras(marcasApi.eliminar(id)),
      },
      crudCelulares: {
        crear: (input) => tras(celularesApi.crear(input)),
        actualizar: (id, input) => tras(celularesApi.actualizar(id, input)),
        eliminar: (id) => tras(celularesApi.eliminar(id)),
      },
      crudEspecificaciones: {
        crear: (input) => tras(especificacionesApi.crear(input)),
        actualizar: (id, input) => tras(especificacionesApi.actualizar(id, input)),
        eliminar: (id) => tras(especificacionesApi.eliminar(id)),
      },
    };
  }, [dataset]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useBackoffice(): BackofficeContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useBackoffice debe usarse dentro de <BackofficeProvider>");
  }
  return contexto;
}
