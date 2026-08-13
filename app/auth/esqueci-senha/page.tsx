import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import SupportLink from "@/components/support/SupportLink";

export const metadata: Metadata = {
  title: "Esqueci minha senha — Minha Fatia",
  // Tela de recuperação não tem por que aparecer em buscador.
  robots: { index: false, follow: false },
};

/**
 * Pedido de nova senha — Fase P0-8A.
 *
 * Pública e **sem guarda de acesso**, pelo mesmo motivo de `/acesso-bloqueado`:
 * quem chega aqui é justamente quem não consegue entrar. Exigir sessão seria um
 * beco sem saída.
 *
 * Também não redireciona quem já está logada — se a sessão ainda vale mas a
 * senha se perdeu (caso real de quem fechou o convite antes de salvá-la), esta
 * é a tela certa.
 */
export default function EsqueciSenhaPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12 sm:px-6">
      <ForgotPasswordForm />

      <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
          O link não chegou?
        </p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Confira a caixa de spam ou lixo eletrônico e confirme se digitou o mesmo e-mail usado na
          compra. Se ainda assim não chegar, fale com a gente.
        </p>
        <SupportLink
          className="mt-3"
          label="Preciso de ajuda com meu acesso"
          message="Olá! Pedi o link de nova senha do Minha Fatia e não recebi. Pode me ajudar?"
        />
      </div>
    </div>
  );
}
