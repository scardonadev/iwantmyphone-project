import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarToken } from "@lib/auth/jwt";

/**
 * Guarda del backoffice: toda petición a `/dashboard/*` necesita un JWT válido
 * en la cookie de sesión. Si no lo hay, redirige a `/login?next=<ruta pedida>`.
 *
 * Es la comprobación **optimista** que recomienda Next: firma y caducidad, sin
 * tocar la BD, porque el proxy también corre en cada prefetch. La segura (el
 * usuario existe y sigue activo) la hace `verificarSesion()` en el layout del
 * panel.
 *
 * `/login` queda fuera a propósito. Si se mandara al panel a quien ya trae
 * token, un usuario desactivado en la BD entraría en un bucle: su JWT sigue
 * siendo válido, pero el layout lo devuelve al login.
 */
export async function proxy(request: NextRequest) {
  const sesion = await verificarToken(request.cookies.get(COOKIE_SESION)?.value);
  if (sesion) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
