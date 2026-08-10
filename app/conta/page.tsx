import type { Metadata } from "next";
import { signOutAction } from "@/app/auth/actions";
import { requireAuthenticatedAccess } from "@/lib/auth/require-access";
import type { ActivePlan } from "@/types/access";

export const metadata: Metadata = {
  title: "Minha conta — Minha Fatia",
};

/** Nome comercial de cada plano, do jeito que a usuária reconhece. */
const PLAN_LABEL: Record<ActivePlan, string> = {
  none: "Sem licença ativa",
  essential: "Minha Fatia Essencial",
  pro_annual: "Minha Fatia Pro Anual",
};

const PLAN_DESCRIPTION: Record<ActivePlan, string> = {
  none:
    "Você ainda não tem uma licença ativa. O Minha Fatia continua funcionando no seu navegador — seus ingredientes, receitas e cálculos estão todos aqui.",
  essential:
    "Acesso vitalício à versão Essencial atual: ingredientes, receitas, embalagens, mão de obra, custos fixos, canais e precificação.",
  pro_annual:
    "Assinatura anual ativa, com tudo do Essencial mais os recursos avançados do Pro.",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function ContaPage() {
  // Exige só sessão — sem licença e mesmo bloqueada, a usuária precisa chegar
  // aqui para ver o próprio status e sair da conta. O guarda já devolve o
  // `UserAccess` resolvido (identidade, perfil, bloqueio e licenças).
  const access = await requireAuthenticatedAccess();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Minha conta
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Seus dados de acesso ao Minha Fatia.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {access.isBlocked && (
          <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            Sua conta está bloqueada. Fale com o suporte para entender o motivo.
          </p>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-stone-400 dark:text-stone-500">E-mail</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">
                {access.email ?? "—"}
              </dd>
            </div>
            {access.fullName !== null && (
              <div>
                <dt className="text-xs text-stone-400 dark:text-stone-500">Nome</dt>
                <dd className="font-medium text-stone-800 dark:text-stone-200">
                  {access.fullName}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-stone-400 dark:text-stone-500">Status da conta</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">
                {access.isBlocked ? "Bloqueada" : "Ativa"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
            Plano e licença
          </h2>

          <p className="mt-2 text-lg font-semibold text-rose-600 dark:text-rose-400">
            {PLAN_LABEL[access.plan]}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {PLAN_DESCRIPTION[access.plan]}
          </p>

          {access.proExpiresAt !== null && (
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
              Assinatura Pro válida até{" "}
              <strong className="text-stone-800 dark:text-stone-200">
                {formatDate(access.proExpiresAt)}
              </strong>
              .
            </p>
          )}

          <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
            Nenhuma tela do app está bloqueada por plano ainda — o controle de acesso por licença
            entra numa próxima etapa.
          </p>
        </section>

        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
