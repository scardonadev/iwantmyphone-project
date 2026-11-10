import type { NextFunction, Request, RequestHandler, Response } from "express";
import { queryOne } from "../db.ts";
import { forbidden, unauthorized } from "../http.ts";
import { tienePermiso, type Permiso, type Rol } from "../permisos.ts";
import { verificarAccess } from "./tokens.ts";

export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

function tokenDe(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const [tipo, token] = h.split(" ");
  return tipo?.toLowerCase() === "bearer" && token ? token : null;
}

/**
 * Resuelve el usuario del token CONTRA LA BD: un usuario borrado o desactivado
 * deja de entrar al instante, aunque su JWT siga vigente.
 *   null      -> no hay token
 *   "invalido" / "inactivo" -> hay token pero no vale
 */
async function resolver(req: Request): Promise<UsuarioSesion | null | "invalido" | "inactivo"> {
  const token = tokenDe(req);
  if (!token) return null;
  const id = await verificarAccess(token);
  if (!id) return "invalido";
  const u = await queryOne<UsuarioSesion & { is_active: boolean }>(
    "SELECT id, email, nombre, rol, is_active FROM usuarios WHERE id = $1",
    [id],
  );
  if (!u) return "invalido";
  if (!u.is_active) return "inactivo";
  return { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol };
}

/** Exige sesión: 401 sin token o con token inválido, 403 si el usuario está desactivado. */
export const autenticar: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  const r = await resolver(req);
  if (r === null || r === "invalido") throw unauthorized();
  if (r === "inactivo") throw forbidden("Tu cuenta está desactivada");
  req.usuario = r;
  next();
};

/**
 * Para lecturas públicas que cambian con la sesión (costo para el
 * administrador, `es_favorito`): un token inválido o caducado no rompe la
 * petición, simplemente se responde como a un anónimo.
 */
export const sesionOpcional: RequestHandler = async (req, _res, next) => {
  const r = await resolver(req);
  if (r && typeof r === "object") req.usuario = r;
  next();
};

/** Exige sesión y un permiso concreto (ver src/permisos.ts). */
export function requerir(permiso: Permiso): RequestHandler[] {
  return [
    autenticar,
    (req, _res, next) => {
      if (!tienePermiso(req.usuario?.rol, permiso)) throw forbidden();
      next();
    },
  ];
}

/** Atajo para las rutas que recortan campos según el rol de quien pregunta. */
export function puede(req: Request, permiso: Permiso): boolean {
  return tienePermiso(req.usuario?.rol, permiso);
}

/** El usuario de una ruta que ya pasó por `autenticar`. */
export function usuarioDe(req: Request): UsuarioSesion {
  if (!req.usuario) throw unauthorized();
  return req.usuario;
}
