import { specLabel } from "@utils/spec-labels";
import type { SpecEntry } from "@/src/types/api";

interface TablaEspecificacionesProps {
  especificaciones: SpecEntry[];
}

export function TablaEspecificaciones({
  especificaciones,
}: TablaEspecificacionesProps) {
  if (especificaciones.length === 0) return null;

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h2 className="u-label text-center text-muted">Especificaciones</h2>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <tbody>
              {especificaciones.map((spec) => (
                <tr
                  key={spec.key}
                  className="border-b border-line last:border-b-0"
                >
                  <th
                    scope="row"
                    className="w-2/5 py-4 pr-6 align-top text-[0.7em] font-normal uppercase tracking-[0.16em] text-muted"
                  >
                    {specLabel(spec.key)}
                  </th>
                  <td className="py-4 align-top text-ink">{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
