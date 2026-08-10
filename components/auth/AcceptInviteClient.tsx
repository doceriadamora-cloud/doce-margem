"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { setInvitedPasswordAction } from "@/app/auth/actions";
import { createSupabaseBrowserClient } from "@/services/supabase/client";
import { initialAuthFormState } from "./form-state";
import AuthFormShell, { AuthField, authInputClass } from "./AuthFormShell";

/**
 * Aceite de convite — Fase 4-7G-convite.
 *
 * O Supabase entrega os tokens do convite no **fragment** da URL
 * (`#access_token=…&refresh_token=…&type=invite`). Fragment não é enviado ao
 * servidor, então nenhum Server Component consegue lê-lo — daí este componente
 * ser de cliente. É o único jeito.
 *
 * Ordem que importa: **o hash é apagado antes de qualquer `await`**. Se ficasse
 * na barra de endereço durante a criação da sessão, o token viajaria em
 * `Referer` para qualquer recurso externo carregado no meio, ficaria no
 * histórico do navegador e apareceria em print de tela. Apagar primeiro custa
 * nada e fecha os três.
 *
 * Nenhum token é registrado em log, nem truncado, nem colocado em estado.
 */

type Phase =
  | { kind: "verificando" }
  | { kind: "definir-senha" }
  | { kind: "erro"; message: string };

/** Mensagens em português, sem eco do erro cru do Supabase. */
const MESSAGES = {
  semToken:
    "Este link não trouxe as informações de acesso. Ele pode ter sido aberto pela metade ou já ter sido usado — peça um novo convite ao suporte.",
  expirado:
    "Este convite expirou ou já foi utilizado. Peça um novo ao suporte para criar sua senha.",
  invalido:
    "Não foi possível validar este convite. Ele pode ter expirado — peça um novo ao suporte.",
  semSupabase:
    "O acesso por conta não está disponível neste ambiente. Fale com o suporte.",
} as const;

export default function AcceptInviteClient() {
  const [phase, setPhase] = useState<Phase>({ kind: "verificando" });
  const [state, formAction, pending] = useActionState(
    setInvitedPasswordAction,
    initialAuthFormState,
  );

  useEffect(() => {
    let cancelled = false;

    async function consumeInvite(): Promise<void> {
      const rawHash = window.location.hash.replace(/^#/, "");

      // Limpa a URL ANTES de qualquer await — ver a nota no topo.
      if (rawHash !== "") {
        window.history.replaceState(null, "", window.location.pathname);
      }

      const params = new URLSearchParams(rawHash);

      // O Supabase devolve o próprio erro no hash quando o link já foi usado ou
      // venceu. `error_description` não é exibida: vem em inglês e pode conter
      // detalhe interno.
      const hashError = params.get("error") ?? params.get("error_code");
      if (hashError !== null) {
        if (!cancelled) setPhase({ kind: "erro", message: MESSAGES.expirado });
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) {
        if (!cancelled) setPhase({ kind: "erro", message: MESSAGES.semToken });
        return;
      }

      const supabase = createSupabaseBrowserClient();
      if (supabase === null) {
        if (!cancelled) setPhase({ kind: "erro", message: MESSAGES.semSupabase });
        return;
      }

      // Grava a sessão em cookie — é o que faz o servidor passar a enxergar a
      // usuária e, em seguida, a Server Action conseguir trocar a senha.
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
    }

    void consumeInvite();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "verificando") {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <p aria-live="polite" className="text-sm text-stone-600 dark:text-stone-400">
          Validando seu convite…
        </p>
      </div>
    );
  }

  if (phase.kind === "erro") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Convite não validado
        </h1>
        <p
          aria-live="polite"
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          {phase.message}
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Se você já criou sua senha antes,{" "}
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
      title="Crie sua senha"
      description="Sua compra foi confirmada. Defina uma senha para acessar o Minha Fatia."
      state={state}
      pending={pending}
      action={formAction}
      submitLabel="Salvar senha e entrar"
      pendingLabel="Salvando…"
      footer={<>Você poderá trocar essa senha depois, na sua conta.</>}
    >
      <AuthField label="Senha" hint="Mínimo de 6 caracteres.">
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          className={authInputClass}
        />
      </AuthField>
      <AuthField label="Repita a senha">
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
