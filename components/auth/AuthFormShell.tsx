"use client";

import type { AuthFormState } from "./form-state";

/**
 * Casca visual compartilhada por `LoginForm` e `SignupForm` — Fase 4-1B.
 *
 * Existe para os dois formulários não divergirem em estilo e em como mostram
 * erro/sucesso. Não contém regra de autenticação nenhuma: só layout, o bloco de
 * mensagem e o botão com estado de envio.
 */

interface AuthFormShellProps {
  title: string;
  description: string;
  state: AuthFormState;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  action: (formData: FormData) => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export default function AuthFormShell({
  title,
  description,
  state,
  pending,
  submitLabel,
  pendingLabel,
  action,
  children,
  footer,
}: AuthFormShellProps) {
  return (
    <form
      action={action}
      className="flex w-full flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {title}
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{description}</p>
      </div>

      {state.message !== "" && (
        <p
          // `aria-live` faz o leitor de tela anunciar a mensagem quando ela
          // aparece — sem isso, quem usa leitor não percebe o erro.
          aria-live="polite"
          className={
            state.status === "error"
              ? "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
              : "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          }
        >
          {state.message}
        </p>
      )}

      {children}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>

      <p className="text-sm text-stone-500 dark:text-stone-400">{footer}</p>
    </form>
  );
}

export const authInputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";

interface AuthFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function AuthField({ label, hint, children }: AuthFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
      {hint !== undefined && (
        <span className="text-xs text-stone-400 dark:text-stone-500">{hint}</span>
      )}
    </label>
  );
}
