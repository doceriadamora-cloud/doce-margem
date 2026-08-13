import type { Metadata } from "next";
import PricingForm from "@/components/pricing/PricingForm";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export const metadata: Metadata = {
  title: "Precificação — Minha Fatia",
};

export default async function PrecificacaoPage() {
  // Exige licença Essencial antes de renderizar (Fase 4-5B).
  await requireEssentialAccess();

  return (
    <div className="pricing-page mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="pricing-print-hidden mb-8 max-w-lg">
        <p className="mb-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
          Etapa 4 de 5
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Precificação
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Escolha uma receita, inclua embalagens e mão de obra e descubra por quanto vender. A
          Ficha interna de precificação fica disponível com o resultado.
        </p>
      </header>
      <PricingForm />

      {/*
        Aviso fiscal — Fase P0-8A.

        Fica na página, e não dentro de `PricingForm`, para não encostar em nada
        que participe do cálculo: este bloco é texto puro, sem estado e sem
        dependência do pricing engine.

        `pricing-print-hidden` é obrigatório aqui. A Ficha interna de
        precificação é impressa a partir desta mesma página, e um aviso solto no
        papel confundiria mais do que ajudaria.

        Não é um CTA: não leva a lugar nenhum, não indica profissional e não
        promete encaminhamento. É informação, por decisão registrada em
        DECISIONS.md.
      */}
      <aside className="pricing-print-hidden mt-8 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-6 text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
        O Minha Fatia ajuda a organizar custos e formar preços com mais clareza. Impostos, regime
        tributário e obrigações fiscais podem variar conforme o negócio e não entram
        automaticamente neste cálculo — se você paga imposto sobre o faturamento, considere
        incluí-lo no campo de custo fixo. Em caso de dúvida, consulte um contador.
      </aside>
    </div>
  );
}
