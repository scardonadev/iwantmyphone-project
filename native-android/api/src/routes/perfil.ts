import { Router } from "express";
import { query, queryOne } from "../db.ts";
import { badRequest, conRestricciones, created, notFound, ok } from "../http.ts";
import { autenticar, puede, usuarioDe } from "../auth/middleware.ts";
import { SELECT_CELULAR, celularDto, type FilaCelular } from "../catalogo.ts";
import { Validador, definidos, idDeRuta, leerCuerpo, soloCampos } from "../validacion.ts";

/**
 * Lo que es de cada comprador: favoritos y direcciones. Todo con sesión y solo
 * lo propio. Dos routers con su propio prefijo: un `use(autenticar)` montado en
 * `/api` exigiría sesión también a las rutas que no existen (401 en vez de 404).
 */
export const favoritosRouter = Router();
export const direccionesRouter = Router();
favoritosRouter.use(autenticar);
direccionesRouter.use(autenticar);

// ---------------------------------------------------------------- Favoritos

favoritosRouter.get("/", async (req, res) => {
  const filas = await query<FilaCelular>(
    `SELECT ${SELECT_CELULAR}
     FROM favoritos f
     JOIN celulares c ON c.id = f.celular_id
     JOIN marcas m ON m.id = c.marca_id
     WHERE f.usuario_id = $1
     ORDER BY f.created_at DESC`,
    [usuarioDe(req).id],
  );
  const verCostos = puede(req, "costos:ver");
  ok(res, filas.map((f) => celularDto(f, verCostos)));
});

/** Idempotente: marcar dos veces no es un error. */
favoritosRouter.put("/:celularId", async (req, res) => {
  const celularId = idDeRuta(req.params.celularId, "celular");
  await conRestricciones(
    () =>
      query("INSERT INTO favoritos (usuario_id, celular_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
        usuarioDe(req).id,
        celularId,
      ]),
    { fk_favoritos_celulares: () => notFound("Celular no encontrado") },
  );
  ok(res, { celular_id: celularId, es_favorito: true });
});

favoritosRouter.delete("/:celularId", async (req, res) => {
  const celularId = idDeRuta(req.params.celularId, "celular");
  await query("DELETE FROM favoritos WHERE usuario_id = $1 AND celular_id = $2", [usuarioDe(req).id, celularId]);
  ok(res, { celular_id: celularId, es_favorito: false });
});

// ---------------------------------------------------------------- Direcciones

const COLUMNAS_DIR = "id, alias, direccion, ciudad, departamento, indicaciones, telefono, created_at";
const CAMPOS_DIR = ["alias", "direccion", "ciudad", "departamento", "indicaciones", "telefono"] as const;

function leerDireccion(cuerpo: Record<string, unknown>, alta: boolean) {
  soloCampos(cuerpo, CAMPOS_DIR);
  const v = new Validador(cuerpo);
  const datos = definidos({
    alias: v.texto("alias", "Alias", { obligatorio: alta, max: 50 }),
    direccion: v.texto("direccion", "Dirección", { obligatorio: alta, max: 200 }),
    ciudad: v.texto("ciudad", "Ciudad", { obligatorio: alta, max: 100 }),
    departamento: v.texto("departamento", "Departamento", { obligatorio: alta, max: 100 }),
    indicaciones: v.texto("indicaciones", "Indicaciones", { nulo: true, max: 300 }),
    telefono: v.telefono("telefono", { obligatorio: alta }),
  });
  v.comprobar("Datos de dirección no válidos");
  return datos;
}

direccionesRouter.get("/", async (req, res) => {
  ok(res, await query(`SELECT ${COLUMNAS_DIR} FROM direcciones WHERE usuario_id = $1 ORDER BY created_at DESC`, [usuarioDe(req).id]));
});

direccionesRouter.post("/", async (req, res) => {
  const datos = leerDireccion(leerCuerpo(req), true);
  const columnas = Object.keys(datos);
  const fila = await queryOne(
    `INSERT INTO direcciones (usuario_id, ${columnas.join(", ")})
     VALUES ($1, ${columnas.map((_, i) => `$${i + 2}`).join(", ")}) RETURNING ${COLUMNAS_DIR}`,
    [usuarioDe(req).id, ...columnas.map((c) => datos[c as keyof typeof datos])],
  );
  created(res, fila);
});

direccionesRouter.patch("/:id", async (req, res) => {
  const id = idDeRuta(req.params.id);
  const datos = leerDireccion(leerCuerpo(req), false);
  const columnas = Object.keys(datos);
  if (!columnas.length) throw badRequest("No hay nada que actualizar", { permitidos: CAMPOS_DIR });
  const fila = await queryOne(
    `UPDATE direcciones SET ${columnas.map((c, i) => `${c} = $${i + 3}`).join(", ")}
     WHERE id = $1 AND usuario_id = $2 RETURNING ${COLUMNAS_DIR}`,
    [id, usuarioDe(req).id, ...columnas.map((c) => datos[c as keyof typeof datos])],
  );
  if (!fila) throw notFound("Dirección no encontrada");
  ok(res, fila);
});

/** Los pedidos guardan su propia copia de la dirección: borrarla no los toca. */
direccionesRouter.delete("/:id", async (req, res) => {
  const id = idDeRuta(req.params.id);
  const r = await query("DELETE FROM direcciones WHERE id = $1 AND usuario_id = $2 RETURNING id", [id, usuarioDe(req).id]);
  if (!r.length) throw notFound("Dirección no encontrada");
  ok(res, null);
});
