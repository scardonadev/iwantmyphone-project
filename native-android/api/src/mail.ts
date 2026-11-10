import nodemailer, { type Transporter } from "nodemailer";
import { config } from "./config.ts";

/**
 * Correo saliente por el SMTP propio (variables SMTP_* de .env).
 *
 * Sin SMTP_HOST no se envía nada: el correo se escribe en la consola. Sirve
 * para desarrollar sin servidor de correo, y la API avisa al arrancar para
 * que nadie lo deje así en producción.
 */

export const smtpConfigurado = Boolean(config.smtp.host);

let transporte: Transporter | null = null;

function obtenerTransporte(): Transporter {
  transporte ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    tls: { rejectUnauthorized: config.smtp.rejectUnauthorized },
  });
  return transporte;
}

interface Correo {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

export async function enviarCorreo(correo: Correo): Promise<void> {
  if (!smtpConfigurado) {
    console.info(
      `[mail] SMTP sin configurar: el correo NO se envía.\n  Para: ${correo.para}\n  Asunto: ${correo.asunto}\n  ${correo.texto.replace(/\n/g, "\n  ")}`,
    );
    return;
  }
  await obtenerTransporte().sendMail({
    from: config.smtp.from,
    to: correo.para,
    subject: correo.asunto,
    text: correo.texto,
    html: correo.html,
  });
}

/** Comprueba conexión y credenciales del SMTP al arrancar (no tumba la API si falla). */
export async function verificarSmtp(): Promise<string> {
  if (!smtpConfigurado) return "sin configurar: los correos se escriben en la consola";
  try {
    await obtenerTransporte().verify();
    return `OK (${config.smtp.host}:${config.smtp.port})`;
  } catch (error) {
    return `ERROR al conectar con ${config.smtp.host}:${config.smtp.port}: ${(error as Error).message}`;
  }
}

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Correo del código de recuperación. Misma línea gráfica que la app: papel
 * blanco, tinta #111, peso ligero, versales espaciadas y sin adornos.
 */
export function correoRecuperacion(nombre: string, codigo: string, minutos: number) {
  const texto = [
    `Hola, ${nombre}.`,
    "",
    `Tu código para restablecer la contraseña de iwantmyphone es: ${codigo}`,
    "",
    `Caduca en ${minutos} minutos y solo sirve una vez.`,
    "Si no lo pediste, ignora este correo: tu contraseña no cambia.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#111111;font-weight:300">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 20px">
    <table role="presentation" width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:12px;letter-spacing:.42em;text-transform:uppercase;padding-bottom:32px;border-bottom:1px solid #e8e8e8">
        <span style="color:#a52b34">&#9829;</span> iWantMyPhone
      </td></tr>
      <tr><td style="padding:32px 0 8px;font-size:15px;line-height:1.6;color:#4a4a4a">Hola, ${escapar(nombre)}. Este es tu código para restablecer la contraseña:</td></tr>
      <tr><td style="padding:24px 0;font-size:34px;letter-spacing:.3em;font-weight:300;color:#111111;background:#f3f3f3;text-align:center">${codigo}</td></tr>
      <tr><td style="padding:24px 0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8f8f8f">
        Caduca en ${minutos} minutos · un solo uso
      </td></tr>
      <tr><td style="padding-top:24px;border-top:1px solid #e8e8e8;font-size:13px;line-height:1.6;color:#8f8f8f">
        Si no lo pediste, ignora este correo: tu contraseña no cambia.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { texto, html };
}
