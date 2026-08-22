import { Pool, types, type QueryResultRow } from "pg";

/**
 * DATE (OID 1082) -> string crudo "YYYY-MM-DD".
 *
 * Con el parser por defecto pg construye un Date en medianoche *local*; al
 * serializar a JSON se convierte a UTC y `fecha_lanzamiento` retrocede un día
 * en cualquier zona horaria negativa. Ver AGENTS.md §3.
 */
types.setTypeParser(1082, (value) => value);

/** NUMERIC/DECIMAL (OID 1700) llega como string: `precio` sería "799.00". */
types.setTypeParser(1700, (value) => Number(value));

/** INT8/COUNT (OID 20) llega como string: afecta a `COUNT(*) OVER()`. */
types.setTypeParser(20, (value) => Number(value));

const globalForDb = globalThis as unknown as { __pgPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Crea un .env.local con la cadena de conexión a Postgres.",
    );
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    // Habilitar TLS solo en proveedores gestionados (Neon, Supabase, RDS...).
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

/** Pool cacheado en globalThis para sobrevivir al HMR de `next dev`. */
export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = createPool();
  }
  return globalForDb.__pgPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
