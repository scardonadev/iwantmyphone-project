/**
 * Reglas de formato de las credenciales del backoffice.
 *
 * Las comparten el formulario de login (cliente) y los Route Handlers de
 * `/api/sesion` y `/api/usuarios` (servidor): el aviso que se ve al teclear es
 * el mismo que devuelve la API en `details.campos`. Sin dependencias de
 * servidor, para poder importarse desde un Client Component.
 */

/** Solo dígitos: el mismo patrón que el CHECK de `usuarios.documento` (seed.sql). */
export const DOCUMENTO_RE = /^\d{6,20}$/;

export const NOMBRE_MAX = 100;
export const PASSWORD_MIN = 8;
/** Tope defensivo: nadie teclea más, y evita derivar claves sobre cuerpos enormes. */
export const PASSWORD_MAX = 128;

export type ErroresCampos = Record<string, string>;

export function errorDocumento(valor: string): string | null {
  if (!valor) return "El documento es obligatorio.";
  if (!DOCUMENTO_RE.test(valor)) {
    return "El documento debe tener entre 6 y 20 dígitos, sin puntos ni espacios.";
  }
  return null;
}

export function errorNombre(valor: string): string | null {
  if (!valor) return "El nombre es obligatorio.";
  if (valor.length > NOMBRE_MAX) return `El nombre no puede pasar de ${NOMBRE_MAX} caracteres.`;
  return null;
}

/**
 * Contraseña al iniciar sesión: solo presencia y tope. La longitud mínima es
 * política de *alta*; aplicarla aquí dejaría fuera a usuarios creados antes de
 * un cambio de política.
 */
export function errorPasswordLogin(valor: string): string | null {
  if (!valor) return "La contraseña es obligatoria.";
  if (valor.length > PASSWORD_MAX) {
    return `La contraseña no puede pasar de ${PASSWORD_MAX} caracteres.`;
  }
  return null;
}

export function errorPasswordNueva(valor: string): string | null {
  if (valor.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (valor.length > PASSWORD_MAX) {
    return `La contraseña no puede pasar de ${PASSWORD_MAX} caracteres.`;
  }
  return null;
}

/** Descarta los campos sin error; `null` si no queda ninguno. */
export function soloErrores(errores: Record<string, string | null>): ErroresCampos | null {
  const conError = Object.entries(errores).filter(
    (entrada): entrada is [string, string] => entrada[1] !== null,
  );
  return conError.length > 0 ? Object.fromEntries(conError) : null;
}
