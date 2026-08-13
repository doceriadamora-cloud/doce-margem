"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { setRecoveryPasswordAction } from "@/app/auth/actions";
import { createSupabaseBrowserClient } from "@/services/supabase/client";
import SupportLink from "@/components/support/SupportLink";
import { FORGOT_PASSWORD_PATH } from "./auth-routes";
import { initialAuthFormState } from "./form-state";
import AuthFormShell, { AuthField, authInputClass } from "./AuthFormShell";

/**
 * Definição da nova senha — Fase P0-8A.
 *
 * Client Component pela mesma razão de `AcceptInviteClient`: o Supabase pode
 * entregar a sessão no **fragment** da URL (`#access_token=…&type=recovery`), e
 * fragment não é enviado ao servidor. Nenhum Server Component consegue lê-lo.
 *
 * Aceita as três formas em que a sessão de recuperação pode chegar, porque o
 * formato depende de configuração do painel do Supabase que este código não
 * controla — e uma tela de recuperação que só funciona num dos formatos é uma
 * tela que trava exatamente quem já está travada:
 *
 *  1. **Fragment** (`#access_token=…`) — fluxo implícito, o mesmo do convite.
 *  2. **`?code=`** — fluxo PKCE, trocado aqui pelo cliente de navegador.
 *  3. **Sessão já ativa** — `/auth/callback` já trocou o code, ou a sessão ainda
 *     vale (caso de quem fechou o convite antes de salvar a senha).
 *
 * Segurança, igual ao convite: **o hash é apagado antes de qualquer `await`**.
 * Se ficasse na barra de endereço durante a criação da sessão, o token viajaria
 * em `Referer`, ficaria no histórico e apareceria em print de tela. Nenhum token
 * é registrado em log, truncado ou colocado em estado.
 */

type Phase =
  | { kind: "verificando" }
  | { kind: "definir-senha" }
  | { kind: "erro"; message: string };

/** Mensagens em português, sem eco do erro cru do Supabase. */
const MESSAGES = {
  expirado:
    "Este link de recuperação expirou ou já foi utilizado. Peça um novo para criar sua senha.",
  semSessao:
    "Não encontramos um pedido de nova senha válido nesta tela. Peça um novo link para continuar.",
  invalido:
    "Não foi possível validar este link. Ele pode ter expirado — peça um novo para criar sua senha.",
  semSupabase: "O acesso por conta não está disponível neste ambiente. Fale com o suporte.",
} as const;

export default function NewPasswordClient() {
  const [phase, setPhase] = useState<Phase>({ kind: "verificando" });
  const [state, formAction, pending] = useActionState(
    setRecoveryPasswordAction,
    initialAuthFormState,
  );

  useEffect(() => {
    let cancelled = false;

    async function consumeRecovery(): Promise<void> {
      const currentUrl = new URL(window.location.href);
      const rawHash = window.location.hash.replace(/^#/, "");
      const code = currentUrl.searchParams.get("code");

      // Limpa a URL ANTES de qualquer await — ver a nota no topo. Vale para o
      // fragment e para o `code`, que também é credencial de uso único.
      if (rawHash !== "" || code !== null) {
        window.history.replaceState(null, "", currentUrl.pathname);
      }

      const params = new URLSearchParams(rawHash);

      // O Supabase devolve o próprio erro no hash quando o link venceu ou já foi
      // usado. `error_description` não é exibida: vem em inglês e pode conter
      // detalhe interno.
      if (params.get("error") !== null || params.get("error_code") !== null) {
        if (!cancelled) setPhase({ kind: "erro", message: MESSAGES.expirado });
        return;
      }

      const supabase = createSupabaseBrowserClient();
      if (supabase === null) {
        if (!cancelled) setPhase({ kind: "erro", message: MESSAGES.semSupabase });
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      // 1. Fluxo implícito: tokens no fragment.
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        setPhase(
          error === null
            ? { kind: "definir-senha" }
            : { kind: "erro", message: MESSAGES.invalido },
        );
        return;
      }

      // 2. Fluxo PKCE: `?code=` trocado por sessão.
      if (code !== null) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        setPhase(
          error === null
            ? { kind: "definir-senha" }
            : { kind: "erro", message: MESSAGES.invalido },
        );
        return;
      }

      // 3. Sessão já ativa. `getUser()` revalida com o servidor Auth — nunca
      //    `getSession()`, que só lê o cookie e é forjável.
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      setPhase(
        error === null && data.user !== null
          ? { kind: "definir-senha" }
          : { kind: "erro", message: MESSAGES.semSessao },
      );
    }

    void consumeRecovery();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "verificando") {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <p aria-live="polite" className="text-sm text-stone-600 dark:text-stone-400">
          Validando seu link…
        </p>
      </div>
    );
  }

  if (phase.kind === "erro") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Link não validado
        </h1>
        <p
          aria-live="polite"
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          {phase.message}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={FORGOT_PASSWORD_PATH}
            className="inline-flex w-fit items-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Pedir um novo link
          </Link>
          <SupportLink label="Falar com suporte" />
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Se você já lembrou a senha,{" "}
          <Link href="/login" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
            entre normalmente
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <AuthFormShell
      title="Criar nova senha"
      description="Escolha uma senha nova para entrar no Minha Fatia."
      state={state}
      pending={pending}
      action={formAction}
      submitLabel="Salvar nova senha e entrar"
      pendingLabel="Salvando…"
      footer={<>Depois de salvar, você entra direto na sua conta.</>}
    >
      <AuthField label="Nova senha" hint="Mínimo de 6 caracteres.">
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          className={authInputClass}
        />
      </AuthField>
      <AuthField label="Repita a nova senha">
        <input
          type="password"
          name="passwordConfirm"
          required
          minLength={6}
          autoComplete="new-password"
          className={authInputClass}
        />
      </AuthField>
    </AuthFormShell>
  );
}
