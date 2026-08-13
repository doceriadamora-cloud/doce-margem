import type { Metadata } from "next";
import NewPasswordClient from "@/components/auth/NewPasswordClient";

export const metadata: Metadata = {
  title: "Criar nova senha — Minha Fatia",
  robots: { index: false, follow: false },
};

/**
 * Destino do link de recuperação — Fase P0-8A.
 *
 * **Sem guarda de acesso**, como `/auth/accept-invite`: quem chega aqui pode não
 * ter sessão ainda; é o próprio link do e-mail que vai criá-la.
 *
 * ⚠️ Configuração externa: `NEW_PASSWORD_PATH` precisa estar na lista de
 * **Redirect URLs** do painel do Supabase. Se não estiver, o Supabase manda a
 * usuária para o Site URL — e aí `InviteHashRescue`, montado em `/login`,
 * reconhece `type=recovery` e reencaminha para cá preservando o fragment.
 * O fluxo se conserta, mas com um salto a mais; registrar a URL é o certo.
 */
export default function NovaSenhaPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12 sm:px-6">
      <NewPasswordClient />
    </div>
  );
}
