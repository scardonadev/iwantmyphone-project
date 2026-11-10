import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { config } from "../config.ts";
import { query, queryOne, transaccion } from "../db.ts";
import { badRequest, conflict, created, forbidden, notFound, ok, tooManyRequests, unauthorized } from "../http.ts";
import { correoRecuperacion, enviarCorreo } from "../mail.ts";
import { NOMBRE_ROL, permisosDe, type Rol } from "../permisos.ts";
import { Validador, idDeRuta, leerCuerpo, soloCampos } from "../validacion.ts";
import { leerClavePublica, verificarFirma } from "../auth/biometria.ts";
import { autenticar, usuarioDe } from "../auth/middleware.ts";
import { hashPassword, verificarPassword } from "../auth/password.ts";
import { emitirReto, emitirTokens, verificarRefresh, verificarReto } from "../auth/tokens.ts";

export const authRouter = Router();

interface FilaUsuario {
  id: string;
  email: string;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  rol: Rol;
  is_active: boolean;
  created_at: Date;
}

const COLUMNAS_USUARIO = "id, email, nombre, documento, telefono, rol, is_active, created_at";

/** El usuario tal cual lo ve la app. Nunca lleva `password_hash`. */
export function usuarioDto(u: FilaUsuario) {
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    documento: u.documento,
    telefono: u.telefono,
    rol: u.rol,
    rol_nombre: NOMBRE_ROL[u.rol],
    permisos: permisosDe(u.rol),
    is_active: u.is_active,
    created_at: u.created_at,
  };
}

async function sesion(u: FilaUsuario) {
  return { usuario: usuarioDto(u), ...(await emitirTokens(u.id)) };
}

/** Lee `{ dispositivo, public_key }` de la credencial biométrica, acumulando errores. */
function leerBiometria(v: Validador, valor: unknown, prefijo: string) {
  if (valor === undefined || valor === null) {
    v.error(prefijo, "Biometría: obligatoria. Registra tu huella para crear la cuenta.");
    return undefined;
  }
  if (typeof valor !== "object" || Array.isArray(valor)) {
    v.error(prefijo, "Biometría: debe ser un objeto { dispositivo, public_key }.");
    return undefined;
  }
  const b = new Validador(valor as Record<string, unknown>);
  const dispositivo = b.texto("dispositivo", "Dispositivo", { obligatorio: true, max: 100 });
  const publicKey = b.texto("public_key", "Clave pública", { obligatorio: true, max: 1000 });
  if (typeof publicKey === "string" && !leerClavePublica(publicKey)) {
    b.error("public_key", "Clave pública: debe ser EC P-256 en SPKI DER base64.");
  }
  for (const [campo, mensaje] of Object.entries(b.errores)) v.error(`${prefijo}.${campo}`, mensaje);
  return b.valido && dispositivo && publicKey ? { dispositivo, publicKey } : undefined;
}

// ---------------------------------------------------------------- Registro

/**
 * Alta pública: nace como `visitante` y activo. La huella es OBLIGATORIA
 * (Excel, fila 17): sin `biometria` no hay cuenta, también aquí y no solo en
 * la app. Responde con la sesión ya abierta.
 */
authRouter.post("/registro", async (req, res) => {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["email", "nombre", "password", "documento", "telefono", "biometria"]);
  const v = new Validador(cuerpo);
  const email = v.email("email", "Correo", { obligatorio: true });
  const nombre = v.texto("nombre", "Nombre", { obligatorio: true, max: 100 });
  const password = v.password("password", "Contraseña", { obligatorio: true });
  const documento = v.documento("documento", { nulo: true });
  const telefono = v.telefono("telefono", { nulo: true });
  const bio = leerBiometria(v, cuerpo.biometria, "biometria");
  v.comprobar("Datos de registro no válidos");

  const hash = await hashPassword(password!);
  const resultado = await transaccion(async (cx) => {
    const u = await queryOne<FilaUsuario>(
      `INSERT INTO usuarios (email, nombre, documento, telefono, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING ${COLUMNAS_USUARIO}`,
      [email, nombre, documento ?? null, telefono ?? null, hash],
      cx,
    );
    if (!u) throw conflict("Ya existe una cuenta con ese correo");
    const cred = await queryOne<{ id: string }>(
      `INSERT INTO credenciales_biometricas (usuario_id, dispositivo, public_key) VALUES ($1, $2, $3) RETURNING id`,
      [u.id, bio!.dispositivo, bio!.publicKey],
      cx,
    );
    return { u, credencialId: cred!.id };
  });

  created(res, { ...(await sesion(resultado.u)), credencial_biometrica_id: resultado.credencialId });
});

// ---------------------------------------------------------------- Login con contraseña

/**
 * 401 con el mismo mensaje para correo inexistente y contraseña errónea, y el
 * mismo tiempo (hash de relleno). El 403 de cuenta desactivada solo se da
 * DESPUÉS de verificar la contraseña: antes revelaría que el correo existe.
 */
authRouter.post("/login", async (req, res) => {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["email", "password"]);
  const v = new Validador(cuerpo);
  const email = v.email("email", "Correo", { obligatorio: true });
  const password = v.texto("password", "Contraseña", { obligatorio: true, max: 128, recortar: false });
  v.comprobar("Credenciales con formato no válido");

  const u = await queryOne<FilaUsuario & { password_hash: string }>(
    `SELECT ${COLUMNAS_USUARIO}, password_hash FROM usuarios WHERE email = $1`,
    [email],
  );
  const correcta = await verificarPassword(password!, u?.password_hash ?? null);
  if (!u || !correcta) throw unauthorized("Correo o contraseña incorrectos");
  if (!u.is_active) throw forbidden("Tu cuenta está desactivada");

  ok(res, await sesion(u));
});

// ---------------------------------------------------------------- Refresh

/**
 * Cambia un refresh token por un par nuevo. Sin estado en servidor: un refresh
 * robado vale hasta su `exp`. Para cortar el acceso de verdad está `is_active`,
 * que se comprueba aquí y en cada petición.
 */
authRouter.post("/refresh", async (req, res) => {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["refresh_token"]);
  const token = cuerpo.refresh_token;
  if (typeof token !== "string" || !token) throw badRequest("Falta refresh_token");
  const id = await verificarRefresh(token);
  if (!id) throw unauthorized("Refresh token no válido o caducado");
  const u = await queryOne<FilaUsuario>(`SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE id = $1`, [id]);
  if (!u) throw unauthorized("Refresh token no válido o caducado");
  if (!u.is_active) throw forbidden("Tu cuenta está desactivada");
  ok(res, await sesion(u));
});

// ---------------------------------------------------------------- Perfil propio

authRouter.get("/yo", autenticar, async (req, res) => {
  const u = await queryOne<FilaUsuario>(`SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE id = $1`, [usuarioDe(req).id]);
  if (!u) throw unauthorized();
  ok(res, usuarioDto(u));
});

/** Datos propios que el comprador puede cambiar (el checkout los usa). El rol no. */
authRouter.patch("/yo", autenticar, async (req, res) => {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["nombre", "documento", "telefono", "password_actual", "password"]);
  const v = new Validador(cuerpo);
  const cambios: Record<string, unknown> = {};
  const nombre = v.texto("nombre", "Nombre", { max: 100 });
  const documento = v.documento("documento", { nulo: true });
  const telefono = v.telefono("telefono", { nulo: true });
  const password = v.password("password", "Contraseña nueva");
  const actual = v.texto("password_actual", "Contraseña actual", { max: 128, recortar: false, obligatorio: password !== undefined });
  v.comprobar();

  if (nombre !== undefined) cambios.nombre = nombre;
  if (documento !== undefined) cambios.documento = documento;
  if (telefono !== undefined) cambios.telefono = telefono;
  if (password) {
    const fila = await queryOne<{ password_hash: string }>("SELECT password_hash FROM usuarios WHERE id = $1", [usuarioDe(req).id]);
    if (!(await verificarPassword(actual!, fila?.password_hash ?? null))) {
      throw badRequest("Datos no válidos", { campos: { password_actual: "Contraseña actual: no coincide." } });
    }
    cambios.password_hash = await hashPassword(password);
  }
  if (!Object.keys(cambios).length) throw badRequest("No hay nada que actualizar");

  const columnas = Object.keys(cambios);
  const u = await queryOne<FilaUsuario>(
    `UPDATE usuarios SET ${columnas.map((c, i) => `${c} = $${i + 2}`).join(", ")}, updated_at = now()
     WHERE id = $1 RETURNING ${COLUMNAS_USUARIO}`,
    [usuarioDe(req).id, ...columnas.map((c) => cambios[c])],
  );
  ok(res, usuarioDto(u!));
});

// ---------------------------------------------------------------- Biometría

/** Registrar la huella de otro teléfono (o la primera, si la cuenta la creó un administrador). */
authRouter.post("/biometria/credenciales", autenticar, async (req, res) => {
  const v = new Validador({});
  const bio = leerBiometria(v, leerCuerpo(req), "biometria");
  v.comprobar("Credencial biométrica no válida");
  const fila = await queryOne(
    `INSERT INTO credenciales_biometricas (usuario_id, dispositivo, public_key) VALUES ($1, $2, $3)
     RETURNING id, dispositivo, created_at, last_used_at`,
    [usuarioDe(req).id, bio!.dispositivo, bio!.publicKey],
  );
  created(res, fila);
});

authRouter.get("/biometria/credenciales", autenticar, async (req, res) => {
  ok(
    res,
    await query(
      `SELECT id, dispositivo, created_at, last_used_at FROM credenciales_biometricas
       WHERE usuario_id = $1 ORDER BY created_at DESC`,
      [usuarioDe(req).id],
    ),
  );
});

authRouter.delete("/biometria/credenciales/:id", autenticar, async (req, res) => {
  const id = idDeRuta(req.params.id);
  const r = await query("DELETE FROM credenciales_biometricas WHERE id = $1 AND usuario_id = $2 RETURNING id", [id, usuarioDe(req).id]);
  if (!r.length) throw notFound("Credencial no encontrada");
  ok(res, null);
});

/** Paso 1 del login con huella: el teléfono pide un reto para su credencial. */
authRouter.post("/biometria/reto", async (req, res) => {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["credencial_id"]);
  const v = new Validador(cuerpo);
  const credencialId = v.uuid("credencial_id", "Credencial", { obligatorio: true });
  v.comprobar();
  // No se comprueba que exista: así el reto no sirve para sondear credenciales.
  ok(res, await emitirReto(credencialId!));
});

/**
 * Paso 2: el teléfono firma el reto con la clave del Keystore (desbloqueada
 * con la huella). Un reto vale una sola vez: tras usarlo, `last_used_at`
 * queda por encima de su `iat` y una segunda firma del mismo reto se rechaza.
 */
authRouter.post("/biometria/login", async (req, res) => {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["credencial_id", "reto", "firma"]);
  const v = new Validador(cuerpo);
  const credencialId = v.uuid("credencial_id", "Credencial", { obligatorio: true });
  const reto = v.texto("reto", "Reto", { obligatorio: true, max: 2000 });
  const firma = v.texto("firma", "Firma", { obligatorio: true, max: 1000 });
  v.comprobar();

  const r = await verificarReto(reto!);
  if (!r || r.credencialId !== credencialId) throw unauthorized("Reto no válido o caducado");

  const cred = await queryOne<{ public_key: string; usuario_id: string }>(
    "SELECT public_key, usuario_id FROM credenciales_biometricas WHERE id = $1",
    [credencialId],
  );
  if (!cred || !verificarFirma(cred.public_key, reto!, firma!)) throw unauthorized("Huella no reconocida");

  const usada = await queryOne(
    `UPDATE credenciales_biometricas SET last_used_at = now()
     WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < to_timestamp($2))
     RETURNING id`,
    [credencialId, r.iat],
  );
  if (!usada) throw unauthorized("Este reto ya se usó");

  const u = await queryOne<FilaUsuario>(`SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE id = $1`, [cred.usuario_id]);
  if (!u) throw unauthorized();
  if (!u.is_active) throw forbidden("Tu cuenta está desactivada");
  ok(res, await sesion(u));
});

// ---------------------------------------------------------------- Recuperación de contraseña

const MINUTOS_CODIGO = 15;
const MAX_INTENTOS = 5;
const MAX_SOLICITUDES = 3; // por usuario y ventana de MINUTOS_CODIGO

/** HMAC con el secreto de refresh: el hash de 6 dígitos no se puede tabular sin él. */
const hashCodigo = (usuarioId: string, codigo: string) =>
  createHmac("sha256", config.jwt.refreshSecret).update(`${usuarioId}:${codigo}`).digest("hex");

/**
 * Pide un código por correo. Responde SIEMPRE lo mismo, exista o no el correo:
 * si no, el endpoint serviría para averiguar quién tiene cuenta.
 */
authRouter.post("/recuperacion", async (req, res) => {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["email"]);
  const v = new Validador(cuerpo);
  const email = v.email("email", "Correo", { obligatorio: true });
  v.comprobar();

  const respuesta = {
    mensaje: "Si el correo está registrado, te enviamos un código para restablecer la contraseña.",
    expira_en_minutos: MINUTOS_CODIGO,
  };

  const u = await queryOne<{ id: string; nombre: string; is_active: boolean }>(
    "SELECT id, nombre, is_active FROM usuarios WHERE email = $1",
    [email],
  );
  if (!u || !u.is_active) return ok(res, respuesta);

  const recientes = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM recuperaciones_password
     WHERE usuario_id = $1 AND created_at > now() - make_interval(mins => $2)`,
    [u.id, MINUTOS_CODIGO],
  );
  if ((recientes?.n ?? 0) >= MAX_SOLICITUDES) {
    throw tooManyRequests(`Demasiadas solicitudes. Espera ${MINUTOS_CODIGO} minutos.`);
  }

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await transaccion(async (cx) => {
    // Un código nuevo anula los anteriores.
    await query("UPDATE recuperaciones_password SET usado_at = now() WHERE usuario_id = $1 AND usado_at IS NULL", [u.id], cx);
    await query(
      `INSERT INTO recuperaciones_password (usuario_id, codigo_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3))`,
      [u.id, hashCodigo(u.id, codigo), MINUTOS_CODIGO],
      cx,
    );
  });

  const { texto, html } = correoRecuperacion(u.nombre, codigo, MINUTOS_CODIGO);
  await enviarCorreo({ para: email!, asunto: "Tu código para restablecer la contraseña", texto, html });
  ok(res, respuesta);
});

/** Cambia la contraseña con el código. 5 intentos por código, un solo uso. */
authRouter.post("/recuperacion/confirmar", async (req, res) => {
  const cuerpo = leerCuerpo(req);
  soloCampos(cuerpo, ["email", "codigo", "password"]);
  const v = new Validador(cuerpo);
  const email = v.email("email", "Correo", { obligatorio: true });
  const codigo = v.texto("codigo", "Código", { obligatorio: true, max: 6 });
  const password = v.password("password", "Contraseña nueva", { obligatorio: true });
  if (typeof codigo === "string" && !/^\d{6}$/.test(codigo)) v.error("codigo", "Código: son 6 dígitos.");
  v.comprobar();

  const invalido = () => badRequest("El código no es válido o ya caducó");

  const u = await queryOne<{ id: string }>("SELECT id FROM usuarios WHERE email = $1 AND is_active", [email]);
  if (!u) throw invalido();

  const rec = await queryOne<{ id: string; codigo_hash: string; intentos: number }>(
    `SELECT id, codigo_hash, intentos FROM recuperaciones_password
     WHERE usuario_id = $1 AND usado_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [u.id],
  );
  if (!rec || rec.intentos >= MAX_INTENTOS) throw invalido();

  const esperado = Buffer.from(rec.codigo_hash, "hex");
  const recibido = Buffer.from(hashCodigo(u.id, codigo!), "hex");
  if (!timingSafeEqual(esperado, recibido)) {
    await query("UPDATE recuperaciones_password SET intentos = intentos + 1 WHERE id = $1", [rec.id]);
    throw invalido();
  }

  const hash = await hashPassword(password!);
  await transaccion(async (cx) => {
    await query("UPDATE recuperaciones_password SET usado_at = now() WHERE id = $1", [rec.id], cx);
    await query("UPDATE usuarios SET password_hash = $2, updated_at = now() WHERE id = $1", [u.id, hash], cx);
  });
  ok(res, { mensaje: "Contraseña actualizada. Ya puedes iniciar sesión." });
});
