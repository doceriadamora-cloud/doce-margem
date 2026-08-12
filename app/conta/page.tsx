import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { requireAuthenticatedAccess } from "@/lib/auth/require-access";
import type { ActivePlan } from "@/types/access";

export const metadata: Metadata = {
  title: "Minha conta — Minha Fatia",
};

/** Nome comercial de cada plano, do jeito que a usuária reconhece. */
const PLAN_LABEL: Record<ActivePlan, string> = {
  none: "Acesso ao Essencial ainda não liberado",
  essential: "Minha Fatia Essencial",
  pro_annual: "Minha Fatia Pro Anual",
};

const PLAN_DESCRIPTION: Record<ActivePlan, string> = {
  none:
    "Sua conta está pronta, mas o acesso ainda não foi liberado. Se você ainda não comprou, conheça o Essencial; se já comprou, confirme se entrou com o mesmo e-mail usado no pagamento.",
  essential:
    "Compra única, sem mensalidade, com acesso vitalício à versão Essencial atual do Minha Fatia.",
  pro_annual:
    "Assinatura anual ativa, com o Essencial e os recursos avançados disponíveis no Pro.",
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
  const accessStatus = access.isBlocked
    ? "Suspenso"
    : access.hasEssential
      ? "Liberado"
      : "Ainda não liberado";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Minha conta
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Consulte sua conta e veja, em linguagem simples, qual acesso está disponível para você.
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
              <dt className="text-xs text-stone-400 dark:text-stone-500">Conta</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">
                {access.isBlocked ? "Bloqueada" : "Ativa"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400 dark:text-stone-500">
                Acesso ao Minha Fatia
              </dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">
                {accessStatus}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
            Seu plano
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
            Os dados do Essencial ficam salvos neste navegador. Exporte um backup em Configurações
            para manter uma cópia segura.
          </p>

          {access.plan === "none" && (
            <Link
              href="/precos"
              className="mt-4 inline-flex rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Ver planos
            </Link>
          )}

          {access.hasEssential && !access.isBlocked && (
            <Link
              href="/"
              className="mt-4 inline-flex rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Acessar Minha Fatia
            </Link>
          )}
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
