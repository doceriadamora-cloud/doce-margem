"use client";

import { useEffect } from "react";
import { ACCEPT_INVITE_PATH, NEW_PASSWORD_PATH } from "./auth-routes";

/**
 * Resgate de convite que caiu em `/login` — Fase 4-7G-convite, ampliado na P0-8A.
 *
 * Existe por causa de um caso real: antes de `/auth/accept-invite` existir, o
 * convite do Supabase mandava a compradora para `/login#access_token=…`. Ela via
 * o formulário de login comum, sem senha para digitar, com o token pendurado na
 * URL — e ficava presa tendo pago.
 *
 * Convites já enviados continuam apontando para lá, e o Site URL do painel pode
 * voltar a mandar gente para cá se `redirectTo` não estiver na lista de Redirect
 * URLs. Este componente cobre os dois: detecta o fragment e reencaminha,
 * preservando-o.
 *
 * **P0-8A:** com a recuperação de senha, o mesmo fragment passou a ter dois
 * destinos possíveis. O `type` decide: `recovery` vai para a tela de nova senha,
 * qualquer outro caso segue para o convite — que era o único destino até aqui e
 * continua sendo o padrão. Sem isso, quem pedisse nova senha cairia numa tela
 * escrita "Sua compra foi confirmada".
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
    const tipo = params.get("type");
    // Só reencaminha quando há de fato o que consumir. Um `#secao` qualquer na
    // URL de login não pode virar redirecionamento.
    const temToken = params.get("access_token") !== null && params.get("refresh_token") !== null;
    const temErroConhecido =
      params.get("error") !== null && (tipo === "invite" || tipo === "recovery");
    if (!temToken && !temErroConhecido) return;

    const destino = tipo === "recovery" ? NEW_PASSWORD_PATH : ACCEPT_INVITE_PATH;
    window.location.replace(`${destino}#${rawHash}`);
  }, []);

  return null;
}
