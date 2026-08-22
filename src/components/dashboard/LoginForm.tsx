"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * Acceso al panel: documento de identidad + contraseña.
 *
 * **No hay autenticación todavía** —no existe endpoint de sesión en el
 * contrato—, así que el formulario valida el formato en cliente y entra al
 * panel. El aviso al pie lo dice explícitamente en vez de simular una
 * comprobación que no ocurre, igual que hace `Newsletter` en el sitio público
 * (AGENTS.md §6).
 *
 * Cuando exista el backend, el único cambio es el cuerpo de `onSubmit`: el
 * `router.push` pasa a ser la respuesta correcta de la petición de sesión.
 */

const SOLO_DIGITOS = /^\d+$/;

export function LoginForm() {
  const router = useRouter();
  const [documento, setDocumento] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const doc = documento.trim();
    if (!SOLO_DIGITOS.test(doc) || doc.length < 6) {
      setError(
        "El documento debe tener al menos 6 dígitos, sin puntos ni espacios.",
      );
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setError(null);
    setEnviando(true);
    // TODO(backend): POST de credenciales y sesión antes de navegar.
    router.push("/dashboard");
  };

  return (
    <form onSubmit={onSubmit} noValidate className="mt-12">
      <div>
        <label
          htmlFor="documento"
          className="u-label text-[0.6em]! block text-muted"
        >
          Documento de identidad
        </label>
        <input
          id="documento"
          name="documento"
          type="text"
          inputMode="numeric"
          autoComplete="username"
          autoFocus
          value={documento}
          onChange={(event) => setDocumento(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? "login-error" : undefined}
          className="u-input mt-2 py-3"
          placeholder="1020304050"
        />
      </div>

      <div className="mt-8">
        <label
          htmlFor="password"
          className="u-label text-[0.6em]! block text-muted"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? "login-error" : undefined}
          className="u-input mt-2 py-3"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p id="login-error" role="alert" className="mt-6 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="u-label cursor-pointer mt-10 w-full border border-ink px-10 py-4 text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
      >
        {enviando ? "Entrando…" : "Entrar al panel"}
      </button>
    </form>
  );
}
