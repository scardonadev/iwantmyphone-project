/**
 * Crea y prepara la base de la app.
 *
 *   npm run db:setup     crea la BD si falta, aplica schema.sql y siembra si está vacía
 *   npm run db:reset     DROP de las tablas y tipos de la app + schema + seed
 *
 * Usa solo DATABASE_URL (no importa src/config.ts: no necesita los secretos JWT).
 *
 * Salvaguarda: si la base ya tiene una tabla `usuarios` SIN columna `email`,
 * es la base del proyecto Next (mismo host, mismos nombres de tabla) y el
 * script se niega a tocarla.
 */
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("[db] Falta DATABASE_URL (copia .env.example a .env).");
  process.exit(1);
}
const ssl = ["1", "true"].includes((process.env.DATABASE_SSL ?? "").toLowerCase()) ? { rejectUnauthorized: false } : undefined;
const forzar = process.argv.includes("--force");

const destino = new URL(url);
const nombreBd = decodeURIComponent(destino.pathname.replace(/^\//, ""));
if (!/^[a-z_][a-z0-9_]*$/.test(nombreBd)) {
  console.error(`[db] Nombre de base no admitido: "${nombreBd}" (solo minúsculas, dígitos y _).`);
  process.exit(1);
}

const TABLAS = [
  "pagos", "pedido_items", "pedidos", "metodos_pago", "direcciones", "favoritos",
  "recuperaciones_password", "credenciales_biometricas", "usuarios",
  "comentarios", "especificaciones", "celulares", "marcas",
];
const TIPOS = ["estado_pago", "estado_pedido", "rol_usuario"];

async function crearBaseSiFalta() {
  const mantenimiento = new URL(url!);
  mantenimiento.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: mantenimiento.toString(), ssl });
  await admin.connect();
  try {
    const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [nombreBd]);
    if (existe.rowCount) {
      console.info(`[db] La base "${nombreBd}" ya existe.`);
    } else {
      // El nombre ya pasó la whitelist de arriba: es seguro como identificador.
      await admin.query(`CREATE DATABASE "${nombreBd}"`);
      console.info(`[db] Base "${nombreBd}" creada.`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  await crearBaseSiFalta();

  const db = new pg.Client({ connectionString: url, ssl });
  await db.connect();
  try {
    const next = await db.query(
      `SELECT 1 FROM information_schema.tables t
       WHERE t.table_schema = 'public' AND t.table_name = 'usuarios'
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns c
                         WHERE c.table_schema = 'public' AND c.table_name = 'usuarios' AND c.column_name = 'email')`,
    );
    if (next.rowCount) {
      throw new Error(`"${nombreBd}" parece la base del proyecto Next (usuarios sin email). No se toca: revisa DATABASE_URL.`);
    }

    if (forzar) {
      console.info("[db] --force: eliminando tablas y tipos de la app…");
      await db.query(`DROP TABLE IF EXISTS ${TABLAS.join(", ")} CASCADE`);
      await db.query(`DROP TYPE IF EXISTS ${TIPOS.join(", ")} CASCADE`);
    }

    await db.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));
    console.info("[db] Esquema aplicado.");

    const vacia = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM marcas");
    if (vacia.rows[0]?.n) {
      console.info("[db] Ya hay datos: no se siembra (usa npm run db:reset para recargar).");
      return;
    }

    console.info("[db] Sembrando…");
    await db.query("BEGIN");
    try {
      await db.query(await readFile(new URL("./seed.sql", import.meta.url), "utf8"));
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }

    const resumen = await db.query<{ tabla: string; n: number }>(
      `SELECT 'celulares' AS tabla, COUNT(*)::int AS n FROM celulares
       UNION ALL SELECT 'especificaciones', COUNT(*)::int FROM especificaciones
       UNION ALL SELECT 'comentarios', COUNT(*)::int FROM comentarios
       UNION ALL SELECT 'usuarios', COUNT(*)::int FROM usuarios
       UNION ALL SELECT 'pedidos', COUNT(*)::int FROM pedidos
       UNION ALL SELECT 'pagos', COUNT(*)::int FROM pagos`,
    );
    console.info(`[db] Listo: ${resumen.rows.map((r) => `${r.n} ${r.tabla}`).join(", ")}.`);
  } finally {
    await db.end();
  }
}

main().catch((error: Error) => {
  console.error(`[db] ${error.message}`);
  process.exit(1);
});
