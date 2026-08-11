import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUserAccess } from "@/lib/auth/dal";
import { ALL_FEATURES, type FeatureDefinition } from "@/lib/features";
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
 * ⚠️ **Não é a página de preços** (Fase 4-6): sem valores, sem botão de compra.
 * Aqui só se explica o que cada plano abre.
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
  blocked: "Sua conta está bloqueada",
  no_license: "Você ainda não tem uma licença ativa",
  no_pro: "Este recurso faz parte do Pro Anual",
  none: "Seu acesso está em dia",
};

const EXPLANATION: Record<DeniedReason, string> = {
  unauthenticated:
    "Esta parte do Minha Fatia precisa de uma conta. Entre com seu e-mail e senha, ou crie uma conta em um minuto.",
  blocked:
    "O acesso desta conta foi suspenso, e por isso nenhuma licença está valendo agora. Se você acha que houve engano, fale com o suporte — a gente resolve.",
  no_license:
    "Sua conta existe e está tudo certo com ela: falta apenas uma licença para liberar esta parte do app.",
  no_pro:
    "Sua licença do Essencial continua valendo normalmente. O recurso que você tentou abrir é do Pro Anual.",
  none: "Você tem acesso liberado. Provavelmente chegou aqui por um link antigo ou digitando o endereço.",
};

/** Um item da lista de plano. `planned` recebe selo — não prometer o que não existe. */
function FeatureItem({ feature }: { feature: FeatureDefinition }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-stone-700 dark:text-stone-300">{feature.label}</span>
      {feature.status === "planned" && (
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          em breve
        </span>
      )}
    </li>
  );
}

export default async function AcessoBloqueadoPage() {
  const access = await getCurrentUserAccess();
  const reason = resolveReason(access);

  // As duas listas saem da matriz da Fase 4-4A — fonte única da verdade. Se um
  // recurso mudar de plano lá, esta tela acompanha sozinha, sem risco de a
  // página prometer uma divisão diferente da que o gating aplica.
  const essentialFeatures = ALL_FEATURES.filter((f) => f.minimumPlan === "essential");
  const proFeatures = ALL_FEATURES.filter((f) => f.minimumPlan === "pro_annual");

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
            Enquanto o bloqueio estiver ativo, nenhuma licença é considerada — nem a compra única,
            nem a assinatura Pro.
          </p>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
            Minha Fatia Essencial
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Compra única, acesso vitalício à versão Essencial atual.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {essentialFeatures.map((feature) => (
              <FeatureItem key={feature.key} feature={feature} />
            ))}
            <li className="text-stone-700 dark:text-stone-300">
              Cadastro e custo de embalagens
            </li>
            <li className="text-stone-700 dark:text-stone-300">
              Mão de obra e tempo de produção
            </li>
            <li className="text-stone-700 dark:text-stone-300">
              Ficha interna de precificação
            </li>
            <li className="text-stone-700 dark:text-stone-300">
              Orçamento simples para cliente
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
            Minha Fatia Pro Anual
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Tudo do Essencial, mais os recursos de nuvem, automação, inteligência artificial e
            relatórios — todos ainda em desenvolvimento.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {proFeatures.map((feature) => (
              <FeatureItem key={feature.key} feature={feature} />
            ))}
          </ul>
        </section>

        <nav aria-label="O que fazer agora" className="flex flex-wrap items-center gap-3">
          {access.isAuthenticated ? (
            <Link
              href="/conta"
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
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
