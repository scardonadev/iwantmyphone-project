import { Banner } from "@components/home/Banner";
import { Filtros } from "@components/home/Filtros";
import { ListadoCelulares } from "@components/home/ListadoCelulares";
import { listarCelulares } from "@lib/queries/celulares";
import { obtenerOpciones } from "@lib/queries/especificaciones";
import { parseFilter, type FiltroEntry } from "@utils/parse-filter";
import { DEFAULT_LIMIT } from "@utils/pagination";
import { HttpError } from "@lib/http";

/** Depende de `searchParams` y de la BD: se resuelve en cada petición. */
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { filter } = await searchParams;
  const rawFilter = Array.isArray(filter) ? filter[0] : filter;

  // Un `filter` corrupto en la URL no debe tumbar la vista: se ignora y se
  // muestra el catálogo completo (en la API sí es un 400).
  let filtros: FiltroEntry[];
  try {
    filtros = parseFilter(rawFilter ?? null);
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    filtros = [];
  }

  const pagination = { page: 1, limit: DEFAULT_LIMIT, offset: 0 };

  const [opciones, listado] = await Promise.all([
    obtenerOpciones(),
    listarCelulares({ filtros, pagination }),
  ]);

  const activos = Object.fromEntries(
    filtros.map(({ key, value }) => [key, value]),
  );

  return (
    <>
      <Banner />
      <Filtros opciones={opciones.options} activos={activos} />
      <ListadoCelulares
        // Remonta el listado cuando cambian los filtros: reinicia páginas
        // Se fuerza cambiando el key con el JSON de los filtros activos. Siendo más eficiente que un state global
        key={JSON.stringify(activos)}
        initialData={listado.data}
        initialMeta={listado.meta}
        filtros={activos}
      />
    </>
  );
}
