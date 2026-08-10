import type { Metadata } from "next";
import AcceptInviteClient from "@/components/auth/AcceptInviteClient";

export const metadata: Metadata = {
  title: "Criar senha — Minha Fatia",
  // Destino de link pessoal enviado por e-mail; não faz sentido em buscador.
  robots: { index: false, follow: false },
};

/**
 * Destino do "Accept invitation" do e-mail de convite — Fase 4-7G-convite.
 *
 * A página em si não faz nada: os tokens chegam no **fragment** da URL, que o
 * navegador nunca envia ao servidor. Toda a leitura acontece em
 * `AcceptInviteClient`.
 *
 * ⚠️ **Esta rota não pode ganhar guarda de acesso.** Quem chega aqui ainda não
 * tem sessão — é justamente o que ela vai criar. Um `requireAuthenticatedAccess`
 * aqui trancaria a porta na cara de quem acabou de comprar, o mesmo erro que a
 * Fase 4-5A evitou em `/acesso-bloqueado`.
 *
 * ⚠️ **A URL precisa estar em Redirect URLs no painel do Supabase**, senão o
 * link do e-mail cai no `Site URL` padrão e os tokens chegam na página errada.
 */
export default function AcceptInvitePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12 sm:px-6">
      <AcceptInviteClient />
    </div>
  );
}
