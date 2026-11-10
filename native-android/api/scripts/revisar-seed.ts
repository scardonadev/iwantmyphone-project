/**
 * Comprobaciones de coherencia de los datos sembrados. Solo lectura.
 *   node --env-file=.env scripts/revisar-seed.ts
 */
import pg from "pg";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const checks: Array<[string, string]> = [
  ["costo entre 55% y 70% del precio", "SELECT MIN(costo / precio)::numeric(4,2) AS min, MAX(costo / precio)::numeric(4,2) AS max FROM celulares"],
  ["celulares en promoción", "SELECT COUNT(*) FILTER (WHERE descuento_pct > 0) AS en_promo, string_agg(DISTINCT descuento_pct::text, ',') AS descuentos FROM celulares"],
  ["sin descripción", "SELECT COUNT(*) AS n FROM celulares WHERE descripcion IS NULL"],
  ["pedidos sin líneas", "SELECT COUNT(*) AS n FROM pedidos p WHERE NOT EXISTS (SELECT 1 FROM pedido_items WHERE pedido_id = p.id)"],
  ["totales incoherentes", `SELECT COUNT(*) AS n FROM pedidos p WHERE total <> (SELECT SUM((precio_unitario - descuento_unitario) * cantidad) FROM pedido_items WHERE pedido_id = p.id)`],
  ["vendido antes del lanzamiento", "SELECT COUNT(*) AS n FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id JOIN celulares c ON c.id = i.celular_id WHERE p.created_at::date < c.fecha_lanzamiento"],
  ["pedidos por periodo", `SELECT COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS hoy,
     COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()) - interval '1 day' AND created_at < date_trunc('day', now())) AS ayer,
     COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS mes, COUNT(*) AS total, MIN(numero) AS primero, MAX(numero) AS ultimo FROM pedidos`],
  ["números en orden cronológico", "SELECT COUNT(*) AS desordenados FROM (SELECT numero, lag(created_at) OVER (ORDER BY numero) > created_at AS mal FROM pedidos) x WHERE mal"],
  ["estados", "SELECT string_agg(estado || '=' || n, ', ' ORDER BY estado) AS estados FROM (SELECT estado::text, COUNT(*) n FROM pedidos GROUP BY 1) x"],
  ["pagos ePayco", "SELECT string_agg(estado || '=' || n, ', ' ORDER BY estado) AS pagos FROM (SELECT estado::text, COUNT(*) n FROM pagos GROUP BY 1) x"],
  ["pedidos de futuro", "SELECT COUNT(*) AS n FROM pedidos WHERE created_at > now()"],
  ["zona horaria de la sesión", "SELECT current_setting('TimeZone') AS tz"],
];

for (const [nombre, sql] of checks) {
  const r = await db.query(sql);
  console.log(`${nombre.padEnd(34)} ${JSON.stringify(r.rows[0])}`);
}
await db.end();
