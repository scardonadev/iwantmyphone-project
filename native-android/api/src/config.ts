/**
 * Única lectura de `process.env`. El resto del código importa `config`.
 *
 * Lo imprescindible para arrancar (BD y secretos JWT) falla al importar, con
 * un mensaje que dice qué falta: mejor no arrancar que responder 500 en cada
 * login. SMTP y ePayco son opcionales: sin ellos la API arranca y lo avisa.
 */

const errores: string[] = [];

function texto(nombre: string): string | undefined;
function texto(nombre: string, porDefecto: string): string;
function texto(nombre: string, porDefecto?: string): string | undefined {
  const valor = process.env[nombre]?.trim();
  return valor ? valor : porDefecto;
}

function obligatorio(nombre: string): string {
  const valor = texto(nombre);
  if (!valor) errores.push(`${nombre} es obligatorio`);
  return valor ?? "";
}

function secreto(nombre: string): string {
  const valor = obligatorio(nombre);
  if (valor && valor.length < 32) errores.push(`${nombre} debe tener al menos 32 caracteres`);
  return valor;
}

function entero(nombre: string, porDefecto: number): number {
  const crudo = texto(nombre);
  if (crudo === undefined) return porDefecto;
  const n = Number(crudo);
  if (!Number.isInteger(n) || n <= 0) {
    errores.push(`${nombre} debe ser un entero positivo`);
    return porDefecto;
  }
  return n;
}

function booleano(nombre: string, porDefecto: boolean): boolean {
  const crudo = texto(nombre);
  if (crudo === undefined) return porDefecto;
  return ["1", "true", "si", "sí", "yes"].includes(crudo.toLowerCase());
}

export const config = {
  port: entero("PORT", 4000),
  publicUrl: texto("PUBLIC_URL", "http://localhost:4000").replace(/\/+$/, ""),
  timezone: texto("APP_TIMEZONE", "America/Bogota"),
  moneda: texto("MONEDA", "USD").toUpperCase(),

  db: {
    url: obligatorio("DATABASE_URL"),
    ssl: booleano("DATABASE_SSL", false),
  },

  jwt: {
    accessSecret: secreto("JWT_ACCESS_SECRET"),
    refreshSecret: secreto("JWT_REFRESH_SECRET"),
    accessTtl: entero("JWT_ACCESS_TTL", 900),
    refreshTtl: entero("JWT_REFRESH_TTL", 60 * 60 * 24 * 30),
  },

  smtp: {
    host: texto("SMTP_HOST"),
    port: entero("SMTP_PORT", 587),
    secure: booleano("SMTP_SECURE", false),
    user: texto("SMTP_USER"),
    password: texto("SMTP_PASSWORD"),
    from: texto("SMTP_FROM", "iwantmyphone <no-reply@localhost>"),
    rejectUnauthorized: booleano("SMTP_TLS_REJECT_UNAUTHORIZED", true),
  },

  epayco: {
    custId: texto("EPAYCO_P_CUST_ID_CLIENTE"),
    pKey: texto("EPAYCO_P_KEY"),
    publicKey: texto("EPAYCO_PUBLIC_KEY"),
    test: booleano("EPAYCO_TEST", true),
  },
} as const;

if (config.jwt.accessSecret && config.jwt.accessSecret === config.jwt.refreshSecret) {
  errores.push("JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos");
}

if (errores.length) {
  throw new Error(`Configuración inválida (revisa .env):\n  - ${errores.join("\n  - ")}`);
}

/** ePayco solo se ofrece si están las tres llaves. */
export const epaycoConfigurado = Boolean(
  config.epayco.custId && config.epayco.pKey && config.epayco.publicKey,
);
