import type { Metadata } from "next";
import { ALL_FEATURES, type FeatureDefinition } from "@/lib/features";

export const metadata: Metadata = {
  title: "Planos — Doce Margem",
  description:
    "Conheça o Doce Margem Essencial, com compra única, e o Doce Margem Pro Anual.",
};

const essentialFeatures = ALL_FEATURES.filter(
  (feature) => feature.minimumPlan === "essential",
);
const proFeatures = ALL_FEATURES.filter(
  (feature) => feature.minimumPlan === "pro_annual",
);

interface FeatureListProps {
  features: readonly FeatureDefinition[];
}

function FeatureList({ features }: FeatureListProps) {
  return (
    <ul className="grid gap-3">
      {features.map((feature) => (
        <li key={feature.key} className="flex items-start gap-3 text-sm">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          >
            ✓
          </span>
          <span>
            <strong className="font-medium text-stone-800 dark:text-stone-200">
              {feature.label}
            </strong>
            <span className="mt-0.5 block text-stone-500 dark:text-stone-400">
              {feature.description}
            </span>
            {feature.status === "planned" && (
              <span className="mt-1 inline-block text-xs font-medium text-amber-700 dark:text-amber-300">
                Planejado
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface PurchaseCtaProps {
  href: string | undefined;
  label: string;
}

function PurchaseCta({ href, label }: PurchaseCtaProps) {
  if (!href) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-lg bg-stone-200 px-4 py-3 text-sm font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-500"
      >
        Em breve
      </button>
    );
  }

  return (
    <a
      href={href}
      className="block w-full rounded-lg bg-rose-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
    >
      {label}
    </a>
  );
}

export default function PrecosPage() {
  const essentialUrl = process.env.NEXT_PUBLIC_BUY_ESSENTIAL_URL?.trim() || undefined;
  const proAnnualUrl = process.env.NEXT_PUBLIC_BUY_PRO_ANNUAL_URL?.trim() || undefined;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Planos</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl dark:text-white">
          Planos do Doce Margem
        </h1>
        <p className="mt-3 text-base leading-7 text-stone-600 dark:text-stone-400">
          Comece com a precificação completa do Essencial ou escolha o Pro Anual para os
          recursos futuros de nuvem, automação, IA e relatórios.
        </p>
        <p className="mt-2 text-sm font-medium text-stone-700 dark:text-stone-300">
          Não existe plano mensal.
        </p>
      </header>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <header className="border-b border-stone-200 pb-5 dark:border-stone-800">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              Compra única
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-950 dark:text-white">
              Doce Margem Essencial
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
              Acesso vitalício à versão Essencial atual, com os dados salvos neste navegador e
              backup manual.
            </p>
            <p className="mt-5 text-lg font-semibold text-stone-900 dark:text-stone-100">
              R$97 à vista (crédito ou pix) ou 12x de R$10,03
            </p>
          </header>

          <div className="py-6">
            <FeatureList features={essentialFeatures} />
          </div>

          <PurchaseCta href={essentialUrl} label="Comprar Essencial" />
        </article>

        <article className="rounded-lg border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900 dark:bg-stone-900">
          <header className="border-b border-stone-200 pb-5 dark:border-stone-800">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Plano anual</p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-950 dark:text-white">
              Doce Margem Pro Anual
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
              Tudo do Essencial, mais recursos planejados para acompanhar o negócio ao longo do
              tempo. Renovação anual, sem opção mensal.
            </p>
            <p className="mt-5 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Preço de lançamento em breve
            </p>
          </header>

          <div className="py-6">
            <p className="mb-4 text-sm font-medium text-stone-700 dark:text-stone-300">
              Inclui tudo do Essencial e, quando disponíveis:
            </p>
            <FeatureList features={proFeatures} />
          </div>

          <PurchaseCta href={proAnnualUrl} label="Assinar Pro Anual" />
        </article>
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-stone-500 dark:text-stone-500">
        Os recursos marcados como planejados ainda não estão disponíveis. A compra única garante
        acesso vitalício à versão Essencial atual; novidades futuras podem pertencer ao Pro Anual.
      </p>
    </div>
  );
}
