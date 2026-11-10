import { crearApp } from "./app.ts";
import { config, epaycoConfigurado } from "./config.ts";
import { pool } from "./db.ts";
import { verificarSmtp } from "./mail.ts";

const app = crearApp();

const servidor = app.listen(config.port, async () => {
  console.info(`[api] escuchando en http://localhost:${config.port} (pública: ${config.publicUrl})`);
  try {
    const r = await pool.query<{ db: string }>("SELECT current_database() AS db");
    console.info(`[api] base de datos: ${r.rows[0]?.db}`);
  } catch (error) {
    console.error(`[api] sin conexión a la BD: ${(error as Error).message}`);
  }
  console.info(`[api] SMTP: ${await verificarSmtp()}`);
  console.info(`[api] ePayco: ${epaycoConfigurado ? `configurado (${config.epayco.test ? "modo test" : "PRODUCCIÓN"})` : "sin llaves: no se ofrece como método de pago"}`);
});

function cerrar(senal: string) {
  console.info(`[api] ${senal}: cerrando`);
  servidor.close(() => void pool.end().finally(() => process.exit(0)));
}
process.on("SIGINT", () => cerrar("SIGINT"));
process.on("SIGTERM", () => cerrar("SIGTERM"));
