"use client";

import type { PriceComparisonStatus, PricingEngineResult } from "@/types/pricing";
import { formatCurrency } from "./pricing-formatters";

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 4,
  });
}

const STATUS_LABEL: Record<PriceComparisonStatus, string> = {
  below_suggested: "Abaixo do ideal",
  at_suggested: "No ideal",
  above_suggested: "Acima do ideal",
};

interface PricingPrintableSheetProps {
  result: PricingEngineResult;
  recipeName: string;
  yieldQuantity: number;
  yieldUnit: string;
}

/**
 * Resumo visual da precificação. A ficha usa somente valores já devolvidos pelo
 * pricing engine; o único efeito do componente é abrir a impressão do navegador.
 */
export default function PricingPrintableSheet({
  result,
  recipeName,
  yieldQuantity,
  yieldUnit,
}: PricingPrintableSheetProps) {
  const channelPricing = result.channelPricing;
  const suggestedPrice = channelPricing?.suggestedPrice ?? result.suggestedPrice;
  const fixedCostAmount = channelPricing?.fixedCostAmount ?? result.fixedCostAmount;
  const expectedProfitAmount =
    channelPricing?.expectedProfitAmount ?? result.expectedProfitAmount;
  const comparison = result.practicedComparison;

  return (
    <section aria-labelledby="printable-pricing-title">
      <div className="pricing-print-hidden mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="printable-pricing-title"
            className="text-lg font-semibold text-stone-900 dark:text-stone-50"
          >
            Ficha interna de precificação
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Use esta ficha para controle interno. Ela mostra custos, mão de obra, embalagens,
            margem e preço sugerido.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="w-fit rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
        >
          Imprimir / salvar PDF
        </button>
      </div>

      <article
        className="pricing-print-sheet rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm sm:p-7 dark:border-stone-700 dark:bg-white dark:text-stone-950"
        aria-label={`Ficha interna de precificação de ${recipeName}`}
      >
        <header className="flex flex-col gap-3 border-b border-stone-300 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-tight text-rose-700">Minha Fatia</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-stone-500">
              Ficha interna de precificação
            </p>
          </div>
          <div className="sm:text-right">
            <h3 className="text-xl font-semibold text-stone-950">{recipeName}</h3>
            <p className="mt-1 text-sm text-stone-600">
              Rendimento: {formatNumber(yieldQuantity)} {yieldUnit}
            </p>
          </div>
        </header>

        <section className="mt-6" aria-labelledby="print-costs-title">
          <h4
            id="print-costs-title"
            className="text-sm font-semibold uppercase tracking-wide text-stone-700"
          >
            Custos por {yieldUnit}
          </h4>
          <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <SheetValue
              label="Custo unitário da receita"
              value={formatCurrency(result.baseDirectUnitCost)}
            />
            <SheetValue
              label="Custo de embalagens"
              value={formatCurrency(result.packagingCost)}
            />
            <SheetValue
              label="Custo de mão de obra"
              value={formatCurrency(result.laborCost)}
            />
            <SheetValue
              label="Custo direto total"
              value={formatCurrency(result.directUnitCost)}
            />
            <SheetValue
              label="Custo fixo estimado"
              value={formatCurrency(fixedCostAmount)}
            />
            <SheetValue
              label="Lucro / margem desejada"
              value={`${formatCurrency(expectedProfitAmount)} · ${formatPercent(result.desiredProfitRate)}`}
            />
          </dl>
        </section>

        <section className="mt-6 border-t border-stone-300 pt-5" aria-labelledby="print-channel-title">
          <h4
            id="print-channel-title"
            className="text-sm font-semibold uppercase tracking-wide text-stone-700"
          >
            Canal de venda
          </h4>
          <p className="mt-2 font-medium text-stone-950">
            {channelPricing?.channel.name ?? "Venda direta (sem taxas)"}
          </p>

          {channelPricing && (
            <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <SheetValue
                label="Comissão"
                value={formatCurrency(channelPricing.commissionAmount)}
              />
              <SheetValue
                label="Taxa de pagamento"
                value={formatCurrency(channelPricing.paymentAmount)}
              />
              <SheetValue label="Anúncio" value={formatCurrency(channelPricing.adAmount)} />
              <SheetValue
                label="Taxa fixa"
                value={formatCurrency(channelPricing.fixedFeeAmount)}
              />
              <SheetValue
                label="Total de taxas do canal"
                value={formatCurrency(channelPricing.totalChannelFees)}
              />
            </dl>
          )}
        </section>

        <section className="mt-6 border-t border-stone-300 pt-5" aria-labelledby="print-price-title">
          <h4
            id="print-price-title"
            className="text-sm font-semibold uppercase tracking-wide text-stone-700"
          >
            Preço de venda
          </h4>
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
              {channelPricing ? "Preço sugerido no canal" : "Preço sugerido"}
            </p>
            <p className="mt-1 text-3xl font-semibold text-rose-950">
              {formatCurrency(suggestedPrice)}
            </p>
          </div>

          {comparison && (
            <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <SheetValue
                label="Preço praticado"
                value={formatCurrency(comparison.practicedPrice)}
              />
              <SheetValue
                label="Comparação com o sugerido"
                value={`${STATUS_LABEL[comparison.status]} · ${formatCurrency(comparison.difference)} (${formatPercent(comparison.differencePercent)})`}
              />
            </dl>
          )}
        </section>
      </article>
    </section>
  );
}

interface SheetValueProps {
  label: string;
  value: string;
}

function SheetValue({ label, value }: SheetValueProps) {
  return (
    <div className="border-b border-stone-200 pb-2">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-stone-950">{value}</dd>
    </div>
  );
}
