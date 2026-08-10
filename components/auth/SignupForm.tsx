"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";
import { initialAuthFormState } from "./form-state";
import AuthFormShell, { AuthField, authInputClass } from "./AuthFormShell";

/**
 * Formulário de cadastro — Fase 4-1B. Mesmo padrão do `LoginForm`.
 *
 * O nome completo é opcional e viaja no metadata do signup; quem o grava em
 * `profiles.full_name` é o trigger `handle_new_user` da migration 0001 — a
 * interface não escreve em `profiles` diretamente.
 */
export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialAuthFormState);

  return (
    <AuthFormShell
      title="Criar conta"
      description="Crie sua conta para guardar seu acesso ao Minha Fatia."
      state={state}
      pending={pending}
      action={formAction}
      submitLabel="Criar conta"
      pendingLabel="Criando…"
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
            Entrar
          </Link>
        </>
      }
    >
      <AuthField label="Nome completo (opcional)">
        <input
          type="text"
          name="fullName"
          autoComplete="name"
          placeholder="Como podemos te chamar?"
          className={authInputClass}
        />
      </AuthField>

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

      <AuthField label="Senha" hint="Pelo menos 6 caracteres.">
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          className={authInputClass}
        />
      </AuthField>
    </AuthFormShell>
  );
}
