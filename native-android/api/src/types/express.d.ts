import type { UsuarioSesion } from "../auth/middleware.ts";

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado. Lo rellenan `autenticar` y `sesionOpcional`. */
      usuario?: UsuarioSesion;
    }
  }
}

export {};
