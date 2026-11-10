import express from "express";
import { pool } from "./db.ts";
import { manejadorErrores, notFound, ok } from "./http.ts";
import { authRouter } from "./routes/auth.ts";
import { catalogoExtraRouter } from "./routes/catalogo-extra.ts";
import { celularesRouter } from "./routes/celulares.ts";
import { marcasRouter } from "./routes/marcas.ts";
import { pagosRouter } from "./routes/pagos.ts";
import { metodosPagoRouter, pedidosRouter } from "./routes/pedidos.ts";
import { direccionesRouter, favoritosRouter } from "./routes/perfil.ts";
import { reportesRouter } from "./routes/reportes.ts";
import { rolesRouter, usuariosRouter } from "./routes/usuarios.ts";

/**
 * La app de Express, sin `listen`: así los scripts de prueba pueden montarla
 * sin abrir un puerto. Sin CORS: el cliente es una app nativa, no un navegador
 * de otro origen (las páginas de ePayco se sirven desde la propia API).
 */
export function crearApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/salud", async (_req, res) => {
    await pool.query("SELECT 1");
    ok(res, { estado: "ok", hora: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/celulares", celularesRouter);
  app.use("/api/marcas", marcasRouter);
  app.use("/api", catalogoExtraRouter); // /home, /especificaciones/opciones, /comentarios
  app.use("/api/metodos-pago", metodosPagoRouter);
  app.use("/api/pedidos", pedidosRouter);
  app.use("/api/pagos", pagosRouter);
  app.use("/api/reportes", reportesRouter);
  app.use("/api/usuarios", usuariosRouter);
  app.use("/api/roles", rolesRouter);
  app.use("/api/favoritos", favoritosRouter);
  app.use("/api/direcciones", direccionesRouter);

  app.use((req, _res, next) => next(notFound(`No existe ${req.method} ${req.path}`)));
  app.use(manejadorErrores);
  return app;
}
