"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
import { initialAuthFormState } from "./form-state";
import AuthFormShell, { AuthField, authInputClass } from "./AuthFormShell";

/**
 * Formulário de login — Fase 4-1B.
 *
 * `useActionState` (React 19) liga o formulário à Server Action: a senha vai
 * direto para o servidor via `FormData`, sem passar por estado de cliente nosso.
 * O `pending` do próprio hook desabilita o botão durante o envio.
 */
export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialAuthFormState);

  return (
    <AuthFormShell
      title="Entrar"
      description="Acesse sua conta do Doce Margem."
      state={state}
      pending={pending}
      action={formAction}
      submitLabel="Entrar"
      pendingLabel="Entrando…"
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
            Criar conta
          </Link>
        </>
      }
    >
      <AuthField label="E-mail">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="voce@exemplo.com"
          className={authInputClass}
        />
      </AuthField>

      <AuthField label="Senha">
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={authInputClass}
        />
      </AuthField>
    </AuthFormShell>
  );
}
