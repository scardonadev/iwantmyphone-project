import { queryOne } from "@lib/db";
import type { Usuario } from "@/src/types/api";

/**
 * Usuarios del backoffice.
 *
 * `password_hash` solo sale de esta capa por `buscarCredenciales`, que es la
 * que necesita el login. El resto devuelve el DTO `Usuario`, sin hash.
 */

interface UsuarioRow {
  id: string;
  documento: string;
  nombre: string;
  is_active: boolean;
  created_at: Date | string;
}

interface CredencialesRow extends UsuarioRow {
  password_hash: string;
}

/** Constante del módulo, nunca entrada del usuario: se puede interpolar. */
const COLUMNAS = "id, documento, nombre, is_active, created_at";

function toUsuario(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    documento: row.documento,
    nombre: row.nombre,
    is_active: row.is_active,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

export interface Credenciales {
  usuario: Usuario;
  passwordHash: string;
}

export async function buscarCredenciales(documento: string): Promise<Credenciales | null> {
  const row = await queryOne<CredencialesRow>(
    `SELECT ${COLUMNAS}, password_hash FROM usuarios WHERE documento = $1`,
    [documento],
  );
  return row ? { usuario: toUsuario(row), passwordHash: row.password_hash } : null;
}

export async function buscarUsuario(id: string): Promise<Usuario | null> {
  const row = await queryOne<UsuarioRow>(`SELECT ${COLUMNAS} FROM usuarios WHERE id = $1`, [id]);
  return row ? toUsuario(row) : null;
}

/**
 * Alta de usuario. `is_active` no se envía: el `DEFAULT FALSE` de la columna
 * es la regla, no una convención de la API.
 *
 * Devuelve `null` si el documento ya existe. El `ON CONFLICT` evita la carrera
 * entre comprobar e insertar que tendría un `SELECT` previo.
 */
export async function crearUsuario(input: {
  documento: string;
  nombre: string;
  passwordHash: string;
}): Promise<Usuario | null> {
  const row = await queryOne<UsuarioRow>(
    `INSERT INTO usuarios (documento, nombre, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (documento) DO NOTHING
     RETURNING ${COLUMNAS}`,
    [input.documento, input.nombre, input.passwordHash],
  );
  return row ? toUsuario(row) : null;
}
