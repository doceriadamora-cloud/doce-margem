"use client";

import { useEffect } from "react";

/**
 * Resgate de convite que caiu em `/login` — Fase 4-7G-convite.
 *
 * Existe por causa de um caso real: antes de `/auth/accept-invite` existir, o
 * convite do Supabase mandava a compradora para `/login#access_token=…`. Ela via
 * o formulário de login comum, sem senha para digitar, com o token pendurado na
 * URL — e ficava presa tendo pago.
 *
 * Convites já enviados continuam apontando para lá, e o Site URL do painel pode
 * voltar a mandar gente para cá se `redirectTo` não estiver na lista de Redirect
 * URLs. Este componente cobre os dois: detecta o fragment de convite e
 * reencaminha, preservando-o.
 *
 * `window.location.replace` em vez do router do Next, por dois motivos: o
 * fragment sobrevive à navegação, e a entrada some do histórico — voltar não
 * traz o token de volta.
 *
 * Não renderiza nada e não registra nada em log.
 */
export default function InviteHashRescue() {
  useEffect(() => {
    const rawHash = window.location.hash.replace(/^#/, "");
    if (rawHash === "") return;

    const params = new URLSearchParams(rawHash);
    // Só reencaminha quando há de fato o que consumir. Um `#secao` qualquer na
    // URL de login não pode virar redirecionamento.
    const temToken = params.get("access_token") !== null && params.get("refresh_token") !== null;
    const temErroDeConvite = params.get("error") !== null && params.get("type") === "invite";
    if (!temToken && !temErroDeConvite) return;

    window.location.replace(`/auth/accept-invite#${rawHash}`);
  }, []);

  return null;
}
