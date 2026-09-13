"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BackofficeError, sesionApi } from "@lib/backoffice/api";
import { errorDocumento, errorPasswordLogin } from "@utils/credenciales";

/**
 * Acceso al panel: documento de identidad + contraseña.
 *
 * El formato se valida en cliente con las mismas reglas que la API
 * (`@utils/credenciales`), y las credenciales van a `POST /api/sesion` a través
 * de `sesionApi`. El servidor deja el JWT en una cookie HttpOnly: el formulario
 * no guarda ningún token, solo navega a `destino`.
 *
 * Los rechazos del servidor (credenciales incorrectas, usuario pendiente de
 * activación, BD caída) llegan como `BackofficeError` y salen en el mismo aviso
 * que los errores de formato.
 */

interface LoginFormProps {
  /** Ruta del panel a la que volver; la página ya la ha validado. */
  destino: string;
}

export function LoginForm({ destino }: LoginFormProps) {
  const router = useRouter();
  const [documento, setDocumento] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const doc = documento.trim();
    const errorFormato = errorDocumento(doc) ?? errorPasswordLogin(password);
    if (errorFormato) {
      setError(errorFormato);
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await sesionApi.iniciar(doc, password);
      // `enviando` se queda en true: el botón sigue bloqueado hasta que la
      // navegación desmonte el formulario.
      router.replace(destino);
    } catch (causa) {
      setError(causa instanceof BackofficeError ? causa.message : "No se pudo iniciar sesión.");
      setEnviando(false);
    }
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
