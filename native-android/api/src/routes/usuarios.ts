import { Router } from "express";
import { query, queryOne, transaccion } from "../db.ts";
import { badRequest, conRestricciones, conflict, created, meta, notFound, ok, paginacion } from "../http.ts";
import { requerir, usuarioDe } from "../auth/middleware.ts";
import { hashPassword } from "../auth/password.ts";
import { NOMBRE_ROL, PERMISOS, ROLES, permisosDe, type Rol } from "../permisos.ts";
import { Validador, definidos, idDeRuta, leerCuerpo, soloCampos } from "../validacion.ts";

/** Gestor de usuarios y permisos (Excel fila 16): solo administrador. */
export const usuariosRouter = Router();
export const rolesRouter = Router();

/** GET /api/roles — qué permite cada rol, para la pantalla de permisos. */
rolesRouter.get("/", ...requerir("usuarios:gestionar"), (_req, res) => {
  ok(
    res,
    ROLES.map((rol) => ({
      rol,
      nombre: NOMBRE_ROL[rol],
      permisos: permisosDe(rol).map((codigo) => ({ codigo, descripcion: PERMISOS[codigo] })),
    })),
  );
});

usuariosRouter.use(...requerir("usuarios:gestionar"));

const COLUMNAS = "id, email, nombre, documento, telefono, rol, is_active, created_at, updated_at";
const CAMPOS = ["email", "nombre", "password", "rol", "documento", "telefono", "is_active"] as const;
const RESTRICCIONES = { usuarios_email_key: () => conflict("Ya existe un usuario con ese correo") };

const conNombreRol = <T extends { rol: Rol }>(u: T) => ({ ...u, rol_nombre: NOMBRE_ROL[u.rol] });

/**
 * GET /api/usuarios — lista (nombre, rol, fecha de registro).
 *   q    nombre o correo · rol   filtra por rol
 */
usuariosRouter.get("/", async (req, res) => {
  const p = paginacion(req.query, 20);
  const valores: unknown[] = [];
  const condiciones = ["TRUE"];
  if (req.query.rol !== undefined) {
    if (!ROLES.includes(req.query.rol as Rol)) throw badRequest("rol no válido", { permitidos: ROLES });
    valores.push(req.query.rol);
    condiciones.push(`rol = $${valores.length}`);
  }
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    valores.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    condiciones.push(`(nombre ILIKE $${valores.length} OR email ILIKE $${valores.length})`);
  }
  valores.push(p.limit, p.offset);
  const filas = await query<{ rol: Rol; total_filas: number }>(
    `SELECT id, email, nombre, rol, is_active, created_at, COUNT(*) OVER() AS total_filas
     FROM usuarios WHERE ${condiciones.join(" AND ")}
     ORDER BY created_at DESC, email ASC
     LIMIT $${valores.length - 1} OFFSET $${valores.length}`,
    valores,
  );
  ok(res, filas.map(({ total_filas: _t, ...u }) => conNombreRol(u)), meta(p, filas[0]?.total_filas ?? 0));
});

usuariosRouter.get("/:id", async (req, res) => {
  const u = await queryOne<{ rol: Rol }>(
    `SELECT ${COLUMNAS},
            (SELECT COUNT(*) FROM pedidos WHERE usuario_id = usuarios.id) AS total_pedidos,
            (SELECT COUNT(*) FROM credenciales_biometricas WHERE usuario_id = usuarios.id) AS credenciales_biometricas
     FROM usuarios WHERE id = $1`,
    [idDeRuta(req.params.id)],
  );
  if (!u) throw notFound("Usuario no encontrado");
  ok(res, conNombreRol(u));
});

function leerUsuario(cuerpo: Record<string, unknown>, alta: boolean) {
  soloCampos(cuerpo, CAMPOS, { password_hash: "password", activo: "is_active" });
  const v = new Validador(cuerpo);
  const password = v.password("password", "Contraseña", { obligatorio: alta });
  const datos = definidos({
    email: v.email("email", "Correo", { obligatorio: alta }),
    nombre: v.texto("nombre", "Nombre", { obligatorio: alta, max: 100 }),
    rol: v.opcion("rol", "Rol", ROLES, { obligatorio: alta }),
    documento: v.documento("documento", { nulo: true }),
    telefono: v.telefono("telefono", { nulo: true }),
    is_active: v.booleano("is_active", "Activo"),
  });
  v.comprobar("Datos de usuario no válidos");
  return { datos, password };
}

/**
 * Alta desde el panel. No pide huella: la app obliga a registrarla en el
 * primer inicio de sesión (POST /api/auth/biometria/credenciales).
 */
usuariosRouter.post("/", async (req, res) => {
  const { datos, password } = leerUsuario(leerCuerpo(req), true);
  const fila = { ...datos, password_hash: await hashPassword(password!) };
  const columnas = Object.keys(fila);
  const u = await conRestricciones(
    () =>
      queryOne<{ rol: Rol }>(
        `INSERT INTO usuarios (${columnas.join(", ")}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING ${COLUMNAS}`,
        columnas.map((c) => fila[c as keyof typeof fila]),
      ),
    RESTRICCIONES,
  );
  created(res, conNombreRol(u!));
});

/**
 * Nunca puede quedar el sistema sin un administrador activo: ni quitándose el
 * rol a uno mismo, ni desactivándolo, ni borrando al último. Se comprueba
 * dentro de la transacción, con los administradores bloqueados.
 */
async function quedaAdministrador(cx: Parameters<Parameters<typeof transaccion>[0]>[0]) {
  const r = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM (SELECT 1 FROM usuarios WHERE rol = 'administrador' AND is_active FOR UPDATE) a",
    [],
    cx,
  );
  if ((r?.n ?? 0) === 0) throw conflict("Debe quedar al menos un administrador activo");
}

usuariosRouter.patch("/:id", async (req, res) => {
  const id = idDeRuta(req.params.id);
  const { datos, password } = leerUsuario(leerCuerpo(req), false);
  const cambios: Record<string, unknown> = { ...datos };
  if (password) cambios.password_hash = await hashPassword(password);
  const columnas = Object.keys(cambios);
  if (!columnas.length) throw badRequest("No hay nada que actualizar", { permitidos: CAMPOS });

  const esUnoMismo = id === usuarioDe(req).id;
  if (esUnoMismo && (cambios.is_active === false || (cambios.rol && cambios.rol !== "administrador"))) {
    throw conflict("No puedes desactivarte ni quitarte el rol de administrador a ti mismo");
  }

  const u = await conRestricciones(
    () =>
      transaccion(async (cx) => {
        const fila = await queryOne<{ rol: Rol }>(
          `UPDATE usuarios SET ${columnas.map((c, i) => `${c} = $${i + 2}`).join(", ")}, updated_at = now()
           WHERE id = $1 RETURNING ${COLUMNAS}`,
          [id, ...columnas.map((c) => cambios[c])],
          cx,
        );
        if (!fila) throw notFound("Usuario no encontrado");
        await quedaAdministrador(cx);
        return fila;
      }),
    RESTRICCIONES,
  );
  ok(res, conNombreRol(u));
});

/** Sus pedidos se conservan (usuario_id pasa a NULL, el pedido guarda la foto del cliente). */
usuariosRouter.delete("/:id", async (req, res) => {
  const id = idDeRuta(req.params.id);
  if (id === usuarioDe(req).id) throw conflict("No puedes eliminar tu propia cuenta desde el gestor");
  await transaccion(async (cx) => {
    const r = await query("DELETE FROM usuarios WHERE id = $1 RETURNING id", [id], cx);
    if (!r.length) throw notFound("Usuario no encontrado");
    await quedaAdministrador(cx);
  });
  ok(res, null);
});
