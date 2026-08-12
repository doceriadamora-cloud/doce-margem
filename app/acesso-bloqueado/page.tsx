import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUserAccess } from "@/lib/auth/dal";
import type { UserAccess } from "@/types/access";

export const metadata: Metadata = {
  title: "Acesso bloqueado — Minha Fatia",
  // Página de destino de um redirecionamento; não faz sentido em buscador.
  robots: { index: false, follow: false },
};

/**
 * Tela para onde os guardas de `lib/auth/require-access.ts` mandam quem está
 * logada mas não tem o direito exigido — Fase 4-5A.
 *
 * Duas decisões que a mantêm segura e sem armadilha:
 *
 * 1. **Não redireciona ninguém.** Uma página cujo trabalho é explicar um
 *    bloqueio não pode ela mesma bloquear: seria um beco sem saída. Cobre os
 *    cinco estados possíveis, inclusive o de quem chegou aqui digitando a URL
 *    com acesso completo.
 * 2. **O motivo é recalculado, não recebido.** Nada de `?motivo=bloqueada`: um
 *    parâmetro na URL é escrito por quem quiser e mostraria à usuária um
 *    diagnóstico falso. O estado real vem do DAL, na mesma requisição.
 *
 * A página não executa compra nem muda acesso. Ela explica o estado atual e
 * encaminha para `/precos`, `/login`, `/conta` ou o Painel conforme o caso.
 */

type DeniedReason = "unauthenticated" | "blocked" | "no_license" | "no_pro" | "none";

/** Por que esta usuária está vendo esta tela. Ordem = prioridade do diagnóstico. */
function resolveReason(access: UserAccess): DeniedReason {
  if (!access.isAuthenticated) return "unauthenticated";
  if (access.isBlocked) return "blocked";
  if (!access.hasEssential) return "no_license";
  if (!access.hasPro) return "no_pro";
  return "none";
}

const HEADLINE: Record<DeniedReason, string> = {
  unauthenticated: "Entre na sua conta para continuar",
  blocked: "Seu acesso está suspenso",
  no_license: "Seu acesso ao Minha Fatia ainda não está liberado",
  no_pro: "Este recurso não faz parte do Essencial atual",
  none: "Seu acesso está em dia",
};

const EXPLANATION: Record<DeniedReason, string> = {
  unauthenticated:
    "Esta parte do Minha Fatia precisa de uma conta. Entre com o e-mail usado na compra ou crie uma conta para continuar.",
  blocked:
    "Esta conta não pode acessar o app neste momento. Consulte a página Minha conta e, se você acredita que houve um engano, procure o suporte.",
  no_license:
    "Sua conta está pronta, mas ainda não tem acesso ao Essencial. Veja a oferta de compra única ou, se já comprou, confirme se entrou com o mesmo e-mail usado no pagamento.",
  no_pro:
    "Seu acesso ao Essencial continua funcionando normalmente. Recursos avançados de nuvem, automação, IA e relatórios poderão fazer parte de um Pro Anual futuro.",
  none: "Você tem acesso liberado. Provavelmente chegou aqui por um link antigo ou digitando o endereço.",
};

export default async function AcessoBloqueadoPage() {
  const access = await getCurrentUserAccess();
  const reason = resolveReason(access);

  // O link para o painel só aparece para quem realmente entra lá. Hoje o painel
  // é aberto, mas a Fase 4-5B pode exigir Essencial nele — e aí este botão
  // devolveria a usuária para esta mesma tela.
  const showPanelLink = access.hasEssential;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {HEADLINE[reason]}
        </h1>
        <p className="mt-3 text-stone-600 dark:text-stone-400">{EXPLANATION[reason]}</p>
      </header>

      <div className="flex flex-col gap-4">
        {reason === "blocked" && (
          <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            Enquanto a suspensão estiver ativa, o acesso ao Minha Fatia permanece indisponível.
            Comprar novamente não remove esse bloqueio.
          </p>
        )}

        {reason === "no_license" && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950">
            <h2 className="text-base font-semibold text-rose-900 dark:text-rose-100">
              Minha Fatia Essencial
            </h2>
            <p className="mt-1 text-sm leading-6 text-rose-800 dark:text-rose-200">
              Compra única, sem mensalidade, com acesso vitalício à versão Essencial atual para
              organizar custos, precificar e gerar documentos para o seu negócio.
            </p>
          </section>
        )}

        {reason === "no_pro" && (
          <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
              Sobre o Pro Anual futuro
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
              O Pro ainda não faz parte da oferta atual. Quando existir, será um plano anual
              separado para recursos que dependem de serviços contínuos. Nenhuma data está sendo
              prometida neste momento.
            </p>
          </section>
        )}

        <nav aria-label="O que fazer agora" className="flex flex-wrap items-center gap-3">
          {(reason === "no_license" || reason === "no_pro") && (
            <Link
              href="/precos"
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              Ver planos
            </Link>
          )}

          {access.isAuthenticated ? (
            <Link
              href="/conta"
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Ir para minha conta
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Criar conta
              </Link>
            </>
          )}

          {showPanelLink && (
            <Link
              href="/"
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Voltar ao painel
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
