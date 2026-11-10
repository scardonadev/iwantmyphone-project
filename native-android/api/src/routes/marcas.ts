import { Router } from "express";
import { query, queryOne } from "../db.ts";
import { badRequest, conRestricciones, conflict, created, notFound, ok } from "../http.ts";
import { requerir } from "../auth/middleware.ts";
import { Validador, definidos, idDeRuta, leerCuerpo, soloCampos } from "../validacion.ts";

export const marcasRouter = Router();

const COLUMNAS = "id, nombre, logo_url AS logo, pais_origen, created_at";
const CAMPOS = ["nombre", "pais_origen", "logo"] as const;

/**
 * Sin paginar: son pocas y la app las necesita todas para el select del
 * formulario de producto. Incluye cuántos celulares tiene cada una.
 */
marcasRouter.get("/", async (_req, res) => {
  ok(
    res,
    await query(
      `SELECT m.id, m.nombre, m.logo_url AS logo, m.pais_origen, m.created_at,
              (SELECT COUNT(*) FROM celulares c WHERE c.marca_id = m.id) AS total_celulares
       FROM marcas m ORDER BY m.nombre`,
    ),
  );
});

marcasRouter.get("/:id", async (req, res) => {
  const fila = await queryOne(`SELECT ${COLUMNAS} FROM marcas WHERE id = $1`, [idDeRuta(req.params.id)]);
  if (!fila) throw notFound("Marca no encontrada");
  ok(res, fila);
});

function leerMarca(cuerpo: Record<string, unknown>, alta: boolean) {
  soloCampos(cuerpo, CAMPOS, { logo_url: "logo" });
  const v = new Validador(cuerpo);
  const datos = definidos({
    nombre: v.texto("nombre", "Nombre", { obligatorio: alta, max: 100 }),
    pais_origen: v.texto("pais_origen", "País de origen", { obligatorio: alta, max: 100 }),
    logo_url: v.url("logo", "Logo", { nulo: true }),
  });
  v.comprobar("Datos de marca no válidos");
  return datos;
}

/**
 * El UNIQUE de la columna distingue mayúsculas ("Apple" y "apple" cabrían):
 * la unicidad real se comprueba sin distinguirlas, y el UNIQUE cubre la carrera.
 */
async function nombreLibre(nombre: string, excepto?: string) {
  const otra = await queryOne(
    "SELECT 1 FROM marcas WHERE lower(nombre) = lower($1) AND ($2::uuid IS NULL OR id <> $2)",
    [nombre, excepto ?? null],
  );
  if (otra) throw conflict("Ya existe una marca con ese nombre");
}

const RESTRICCIONES = { marcas_nombre_key: () => conflict("Ya existe una marca con ese nombre") };

marcasRouter.post("/", ...requerir("productos:gestionar"), async (req, res) => {
  const datos = leerMarca(leerCuerpo(req), true);
  await nombreLibre(datos.nombre!);
  const columnas = Object.keys(datos);
  const fila = await conRestricciones(
    () =>
      queryOne(
        `INSERT INTO marcas (${columnas.join(", ")}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING ${COLUMNAS}`,
        columnas.map((c) => datos[c as keyof typeof datos]),
      ),
    RESTRICCIONES,
  );
  created(res, fila);
});

marcasRouter.patch("/:id", ...requerir("productos:gestionar"), async (req, res) => {
  const id = idDeRuta(req.params.id);
  const datos = leerMarca(leerCuerpo(req), false);
  const columnas = Object.keys(datos);
  if (!columnas.length) throw badRequest("No hay nada que actualizar", { permitidos: CAMPOS });
  if (datos.nombre) await nombreLibre(datos.nombre, id);
  const fila = await conRestricciones(
    () =>
      queryOne(
        `UPDATE marcas SET ${columnas.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1 RETURNING ${COLUMNAS}`,
        [id, ...columnas.map((c) => datos[c as keyof typeof datos])],
      ),
    RESTRICCIONES,
  );
  if (!fila) throw notFound("Marca no encontrada");
  ok(res, fila);
});

marcasRouter.delete("/:id", ...requerir("productos:gestionar"), async (req, res) => {
  const id = idDeRuta(req.params.id);
  const r = await conRestricciones(() => query("DELETE FROM marcas WHERE id = $1 RETURNING id", [id]), {
    fk_celulares_marcas: () => conflict("La marca tiene celulares: bórralos o reasígnalos antes"),
  });
  if (!r.length) throw notFound("Marca no encontrada");
  ok(res, null);
});
