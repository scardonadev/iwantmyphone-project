/**
 * Roles y permisos (Excel de alcance, native-android/docs).
 *
 * Los roles son un enum de la BD (`rol_usuario`) y la matriz vive aquí, en
 * código: el "gestor de usuarios y permisos" asigna un rol, y GET /api/roles
 * enseña lo que permite cada uno. Cada rol hereda lo del anterior.
 *
 * Las rutas nunca preguntan por el rol, sino por el permiso: así mover una
 * capacidad de rol es cambiar una línea de esta tabla.
 */

export const ROLES = ["visitante", "vendedor", "administrador"] as const;
export type Rol = (typeof ROLES)[number];

export const PERMISOS = {
  "pedidos:gestionar": "Ver, cambiar de estado y eliminar los pedidos de todos los clientes",
  "productos:gestionar": "Crear, editar y eliminar productos y marcas",
  "reportes:ver": "Reporte de ventas y resumen de ventas en el detalle de producto",
  "costos:ver": "Ver costos de productos, costo de lo vendido y utilidad",
  "usuarios:gestionar": "Crear, editar, desactivar y eliminar usuarios y asignar roles",
} as const;
export type Permiso = keyof typeof PERMISOS;

const VENDEDOR: Permiso[] = ["pedidos:gestionar", "productos:gestionar", "reportes:ver"];

const MATRIZ: Record<Rol, readonly Permiso[]> = {
  visitante: [],
  vendedor: VENDEDOR,
  administrador: [...VENDEDOR, "costos:ver", "usuarios:gestionar"],
};

export const NOMBRE_ROL: Record<Rol, string> = {
  visitante: "Visitante",
  vendedor: "Vendedor",
  administrador: "Administrador",
};

export function permisosDe(rol: Rol): readonly Permiso[] {
  return MATRIZ[rol];
}

export function tienePermiso(rol: Rol | undefined, permiso: Permiso): boolean {
  return rol !== undefined && MATRIZ[rol].includes(permiso);
}
