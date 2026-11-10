import { createPublicKey, verify, type KeyObject } from "node:crypto";

/**
 * Clave pública de la huella: SPKI DER en base64, tal cual la da
 * `KeyPair.public.encoded` en Android. Solo se acepta EC P-256 (la curva que
 * el Keystore de Android garantiza en todos los equipos con hardware seguro).
 */
export function leerClavePublica(base64: string): KeyObject | null {
  try {
    const clave = createPublicKey({ key: Buffer.from(base64, "base64"), format: "der", type: "spki" });
    if (clave.asymmetricKeyType !== "ec") return null;
    if (clave.asymmetricKeyDetails?.namedCurve !== "prime256v1") return null;
    return clave;
  } catch {
    return null;
  }
}

/**
 * Comprueba la firma del reto. En Android: `Signature.getInstance("SHA256withECDSA")`
 * sobre los bytes UTF-8 del reto, desbloqueada con BiometricPrompt. Esa firma
 * sale en DER, que es lo que espera `verify` por defecto.
 */
export function verificarFirma(clavePublicaB64: string, reto: string, firmaB64: string): boolean {
  const clave = leerClavePublica(clavePublicaB64);
  if (!clave) return false;
  try {
    return verify("sha256", Buffer.from(reto, "utf8"), { key: clave, dsaEncoding: "der" }, Buffer.from(firmaB64, "base64"));
  } catch {
    return false;
  }
}
