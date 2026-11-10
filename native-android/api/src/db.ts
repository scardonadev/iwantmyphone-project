import pg, { type PoolClient, type QueryResultRow } from "pg";
import { config } from "./config.ts";

/**
 * Pool único. Las trampas de `pg` se resuelven aquí, una vez (como en el Next,
 * src/lib/db.ts):
 *   - NUMERIC (1700) llega como string: "799.00" -> 799.
 *   - DATE (1082) se convertiría en medianoche local y podría retroceder un día
 *     al serializar: se deja el "YYYY-MM-DD" crudo.
 *   - INT8 (20), el tipo de COUNT/SUM de enteros, también llega como string.
 *
 * La sesión fija la zona horaria de la app: `date_trunc('day', now())` corta
 * "hoy" donde están los clientes y no en UTC.
 */
pg.types.setTypeParser(1700, (v) => Number(v));
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: config.db.url,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  options: `-c timezone=${config.timezone}`,
  max: 10,
});

/** Lo común a `pool` y a un `PoolClient` dentro de una transacción. */
export type Ejecutor = Pick<PoolClient, "query">;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  ejecutor: Ejecutor = pool,
): Promise<T[]> {
  const r = await ejecutor.query<T>(text, params);
  return r.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  ejecutor: Ejecutor = pool,
): Promise<T | undefined> {
  return (await query<T>(text, params, ejecutor))[0];
}

/** Ejecuta `fn(client)` en una transacción: cualquier error hace ROLLBACK y se relanza. */
export async function transaccion<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * `col1 = $n, col2 = $n+1` para un PATCH parcial. Las columnas salen siempre de
 * una whitelist del llamador (el validador), nunca de claves del cuerpo sin filtrar.
 */
export function clausulaSet(cambios: Record<string, unknown>, desde = 1) {
  const columnas = Object.keys(cambios);
  return {
    sql: columnas.map((c, i) => `${c} = $${desde + i}`).join(", "),
    valores: columnas.map((c) => cambios[c]),
  };
}
