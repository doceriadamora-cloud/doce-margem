"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/auth/actions";
import { initialAuthFormState } from "./form-state";
import AuthFormShell, { AuthField, authInputClass } from "./AuthFormShell";

/**
 * Pedido de nova senha — Fase P0-8A.
 *
 * Mesmo padrão de `LoginForm`: `useActionState` liga o formulário à Server
 * Action, e o `pending` do próprio hook desabilita o botão durante o envio.
 *
 * A mensagem de sucesso é idêntica para e-mail existente e inexistente — a
 * decisão mora na action, e esta tela apenas a exibe.
 */
export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialAuthFormState,
  );

  return (
    <AuthFormShell
      title="Esqueci minha senha"
      description="Informe o e-mail que você usa para entrar no Minha Fatia. Enviamos um link para você criar uma nova senha."
      state={state}
      pending={pending}
      action={formAction}
      submitLabel="Enviar link de nova senha"
      pendingLabel="Enviando…"
      footer={
        <>
          Lembrou a senha?{" "}
          <Link href="/login" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
            Voltar para o login
          </Link>
        </>
      }
    >
      <AuthField
        label="E-mail"
        hint="Use o mesmo e-mail da sua compra. O link chega em alguns minutos — confira a caixa de spam ou lixo eletrônico."
      >
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="voce@exemplo.com"
          className={authInputClass}
        />
      </AuthField>
    </AuthFormShell>
  );
}
