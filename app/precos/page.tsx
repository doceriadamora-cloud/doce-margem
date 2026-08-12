import type { Metadata } from "next";
import Link from "next/link";
import { ALL_FEATURES, type FeatureDefinition } from "@/lib/features";

export const metadata: Metadata = {
  title: "Planos — Minha Fatia",
  description:
    "Conheça o Minha Fatia Essencial, com compra única e sem mensalidade, e saiba o que poderá fazer parte de um Pro Anual futuro.",
};

const essentialFeatures = ALL_FEATURES.filter(
  (feature) => feature.minimumPlan === "essential",
);
const proFeatures = ALL_FEATURES.filter(
  (feature) => feature.minimumPlan === "pro_annual",
);

interface FeatureListProps {
  features: readonly FeatureDefinition[];
  includeP0Features?: boolean;
  plannedLabel: string;
}

function FeatureList({
  features,
  includeP0Features = false,
  plannedLabel,
}: FeatureListProps) {
  return (
    <ul className="grid gap-3">
      {features.map((feature) => (
        <li key={feature.key} className="flex items-start gap-3 text-sm">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              feature.status === "planned"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            {feature.status === "planned" ? "•" : "✓"}
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
                {plannedLabel}
              </span>
            )}
          </span>
        </li>
      ))}
      {includeP0Features && (
        <>
          <li className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ✓
            </span>
            <span>
              <strong className="font-medium text-stone-800 dark:text-stone-200">
                Embalagens
              </strong>
              <span className="mt-0.5 block text-stone-500 dark:text-stone-400">
                Cadastre caixas, saquinhos, etiquetas e outros itens para incluir esse custo na precificação.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ✓
            </span>
            <span>
              <strong className="font-medium text-stone-800 dark:text-stone-200">
                Mão de obra e tempo de produção
              </strong>
              <span className="mt-0.5 block text-stone-500 dark:text-stone-400">
                Calcule o custo do seu tempo por receita e inclua-o na precificação.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ✓
            </span>
            <span>
              <strong className="font-medium text-stone-800 dark:text-stone-200">
                Ficha interna de precificação
              </strong>
              <span className="mt-0.5 block text-stone-500 dark:text-stone-400">
                Use para controle interno dos custos, margem e preço sugerido; imprima ou salve
                em PDF pelo navegador.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ✓
            </span>
            <span>
              <strong className="font-medium text-stone-800 dark:text-stone-200">
                Ficha técnica da receita
              </strong>
              <span className="mt-0.5 block text-stone-500 dark:text-stone-400">
                Imprima ingredientes, rendimento e custos da receita para consultar na produção.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ✓
            </span>
            <span>
              <strong className="font-medium text-stone-800 dark:text-stone-200">
                Orçamento para cliente
              </strong>
              <span className="mt-0.5 block text-stone-500 dark:text-stone-400">
                Monte uma proposta comercial com itens e valores finais para imprimir ou salvar
                em PDF.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ✓
            </span>
            <span>
              <strong className="font-medium text-stone-800 dark:text-stone-200">
                Identidade visual do orçamento
              </strong>
              <span className="mt-0.5 block text-stone-500 dark:text-stone-400">
                Use nome da marca, logo, cores e contatos no documento enviado ao cliente.
              </span>
            </span>
          </li>
        </>
      )}
    </ul>
  );
}

interface PurchaseCtaProps {
  href: string | undefined;
  label: string;
  unavailableLabel: string;
}

function PurchaseCta({ href, label, unavailableLabel }: PurchaseCtaProps) {
  if (!href) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-lg bg-stone-200 px-4 py-3 text-sm font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-500"
      >
        {unavailableLabel}
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
      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Oferta atual</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl dark:text-white">
          Comece com o Minha Fatia Essencial
        </h1>
        <p className="mt-3 text-base leading-7 text-stone-600 dark:text-stone-400">
          Uma ferramenta prática de apoio à gestão e precificação para quem produz doces,
          salgados e encomendas artesanais. Organize custos, forme preços e prepare documentos
          para o dia a dia do negócio.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            Compra única
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            Sem mensalidade no Essencial
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            Acesso vitalício à versão Essencial atual
          </span>
        </div>
      </header>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-rose-300 bg-white p-6 shadow-sm dark:border-rose-800 dark:bg-stone-900">
          <header className="border-b border-stone-200 pb-5 dark:border-stone-800">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              Oferta disponível agora
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-950 dark:text-white">
              Minha Fatia Essencial
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
              Pague uma vez e tenha acesso vitalício à versão Essencial atual. Não há mensalidade
              nem renovação no Essencial.
            </p>
            <p className="mt-5 text-lg font-semibold text-stone-900 dark:text-stone-100">
              R$ 97 à vista no crédito ou Pix, ou 12x de R$ 10,03
            </p>
          </header>

          <div className="py-6">
            <p className="mb-4 text-sm font-medium text-stone-700 dark:text-stone-300">
              O que está incluído no Essencial:
            </p>
            <FeatureList
              features={essentialFeatures}
              includeP0Features
              plannedLabel="Em desenvolvimento — incluído no Essencial"
            />
          </div>

          <PurchaseCta
            href={essentialUrl}
            label="Comprar acesso ao Essencial"
            unavailableLabel="Compra indisponível no momento"
          />
          <p className="mt-3 text-center text-xs leading-5 text-stone-500 dark:text-stone-400">
            Depois da aprovação, o acesso é enviado para o e-mail usado na compra. Use esse mesmo
            e-mail para entrar no Minha Fatia e confira também a caixa de spam.
          </p>
          <p className="mt-3 text-center text-sm text-stone-600 dark:text-stone-400">
            Já comprou ou já tem acesso?{" "}
            <Link href="/login" className="font-semibold text-rose-600 hover:underline dark:text-rose-400">
              Entrar
            </Link>
          </p>
        </article>

        <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <header className="border-b border-stone-200 pb-5 dark:border-stone-800">
            <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">
              {proAnnualUrl ? "Plano anual" : "Futuro — ainda não disponível"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-950 dark:text-white">
              Minha Fatia Pro Anual
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
              Recursos avançados que dependem de serviços contínuos, como nuvem, automação, IA e
              relatórios, poderão fazer parte de um plano anual separado no futuro.
            </p>
            <p className="mt-5 text-lg font-semibold text-stone-900 dark:text-stone-100">
              {proAnnualUrl ? "Consulte as condições atuais" : "Sem preço ou data anunciados"}
            </p>
          </header>

          <div className="py-6">
            <p className="mb-4 text-sm font-medium text-stone-700 dark:text-stone-300">
              Recursos planejados para o Pro futuro:
            </p>
            <FeatureList features={proFeatures} plannedLabel="Planejado para o Pro futuro" />
          </div>

          <PurchaseCta
            href={proAnnualUrl}
            label="Assinar Pro Anual"
            unavailableLabel="Pro Anual ainda não disponível"
          />
          <p className="mt-3 text-center text-xs leading-5 text-stone-500 dark:text-stone-400">
            A compra do Essencial dá acesso à versão Essencial atual. Recursos novos e avançados
            poderão pertencer ao Pro Anual futuro.
          </p>
        </article>
      </div>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          Antes de comprar
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              1. Compra e acesso
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Use seu melhor e-mail no checkout. É por ele que você recebe o convite e acessa sua
              conta.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              2. Dados neste navegador
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
              No Essencial, seus cadastros ficam salvos neste navegador. Exporte um backup em
              Configurações antes de trocar de aparelho ou limpar os dados do navegador.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              3. Apoio à decisão
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
              O Minha Fatia organiza os números que você informa e ajuda a formar preços; o valor
              final continua sendo uma decisão do seu negócio.
            </p>
          </div>
        </div>
      </section>

      <aside className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-stone-500 dark:text-stone-500">
        O Minha Fatia é uma ferramenta de apoio à gestão e precificação e não substitui a
        orientação de um contador. Impostos, regime tributário e obrigações fiscais variam conforme
        o negócio e devem ser avaliados separadamente.
      </aside>
    </div>
  );
}
