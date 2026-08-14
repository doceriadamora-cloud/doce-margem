import type { PriceComparisonStatus, PricingEngineResult } from "@/types/pricing";
import { formatCurrency } from "./pricing-formatters";
import PricingPrintableSheet from "./PricingPrintableSheet";

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** A perda vem em porcentagem (10 = 10%), não em decimal como as taxas. */
function formatLossPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

const STATUS_LABEL: Record<PriceComparisonStatus, string> = {
  below_suggested: "Abaixo do ideal",
  at_suggested: "No ideal",
  above_suggested: "Acima do ideal",
};

const STATUS_CLASS: Record<PriceComparisonStatus, string> = {
  below_suggested: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  at_suggested: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  above_suggested: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
};

interface PricingResultProps {
  result: PricingEngineResult;
  recipeName: string;
  yieldQuantity: number;
  yieldUnit: string;
  /**
   * Perda de produção da receita, em porcentagem — Modo avançado (P0-9A).
   *
   * Só exibição: o valor já está embutido no custo da receita que o pricing
   * engine recebeu. Existe para um ajuste que mexe no custo não ficar invisível
   * na tela onde o preço é decidido.
   */
  productionLossPercent?: number;
}

/**
 * Mostra o resultado do pricing engine (Fase 1C-3) em linguagem simples. Só
 * exibe valores já calculados por `calculatePricing` — nenhuma soma/divisão
 * própria aqui.
 */
export default function PricingResult({
  result,
  recipeName,
  yieldQuantity,
  yieldUnit,
  productionLossPercent = 0,
}: PricingResultProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="pricing-print-hidden rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950">
        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Preço sugerido</p>
        <p className="mt-1 text-3xl font-semibold text-rose-900 dark:text-rose-100">
          {formatCurrency(result.suggestedPrice)}
        </p>
        <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
          Esse é o valor mínimo para cobrir seus custos e o lucro desejado, sem taxas de canal.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <DL label="Custo da receita" value={formatCurrency(result.baseDirectUnitCost)} />
          <DL label="Custo de embalagens" value={formatCurrency(result.packagingCost)} />
          <DL label="Custo de mão de obra" value={formatCurrency(result.laborCost)} />
          <DL label="Custo direto total" value={formatCurrency(result.directUnitCost)} />
          <DL label="Custo fixo estimado" value={formatCurrency(result.fixedCostAmount)} />
          <DL label="Lucro esperado" value={formatCurrency(result.expectedProfitAmount)} />
          <DL label="Margem esperada" value={formatPercent(result.expectedMargin)} />
          <DL label="Markup esperado" value={`${result.expectedMarkup.toFixed(2)}x`} />
        </dl>
        {productionLossPercent > 0 && (
          <p className="mt-3 text-xs text-rose-700 dark:text-rose-300">
            O custo da receita já inclui {formatLossPercent(productionLossPercent)} de perda de
            produção, definida no Modo avançado da receita.
          </p>
        )}
      </section>

      {result.channelPricing && (
        <section className="pricing-print-hidden rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Preço sugerido no canal: {result.channelPricing.channel.name}
          </p>
          <p className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">
            {formatCurrency(result.channelPricing.suggestedPrice)}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Esse valor já cobre as taxas do canal, além dos seus custos e lucro desejado.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <DL label="Comissão" value={formatCurrency(result.channelPricing.commissionAmount)} />
            <DL
              label="Taxa de pagamento"
              value={formatCurrency(result.channelPricing.paymentAmount)}
            />
            <DL label="Anúncio" value={formatCurrency(result.channelPricing.adAmount)} />
            <DL label="Taxa fixa" value={formatCurrency(result.channelPricing.fixedFeeAmount)} />
            <DL
              label="Total de taxas do canal"
              value={formatCurrency(result.channelPricing.totalChannelFees)}
            />
            <DL label="O que sobra líquido" value={formatCurrency(result.channelPricing.netFinal)} />
            <DL label="Margem esperada" value={formatPercent(result.channelPricing.expectedMargin)} />
            <DL label="Markup esperado" value={`${result.channelPricing.expectedMarkup.toFixed(2)}x`} />
          </dl>
        </section>
      )}

      {result.practicedComparison && (
        <section className="pricing-print-hidden rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Preço praticado</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[result.practicedComparison.status]}`}
            >
              {STATUS_LABEL[result.practicedComparison.status]}
            </span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">
            {formatCurrency(result.practicedComparison.practicedPrice)}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Diferença em relação ao sugerido: {formatCurrency(result.practicedComparison.difference)}{" "}
            ({formatPercent(result.practicedComparison.differencePercent)})
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <DL label="Margem real" value={formatPercent(result.practicedComparison.realMargin)} />
            <DL label="Markup real" value={`${result.practicedComparison.realMarkup.toFixed(2)}x`} />
          </dl>
        </section>
      )}

      <PricingPrintableSheet
        result={result}
        recipeName={recipeName}
        yieldQuantity={yieldQuantity}
        yieldUnit={yieldUnit}
        productionLossPercent={productionLossPercent}
      />
    </div>
  );
}

interface DLProps {
  label: string;
  value: string;
}

function DL({ label, value }: DLProps) {
  return (
    <div>
      <dt className="text-xs text-stone-400 dark:text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-800 dark:text-stone-200">{value}</dd>
    </div>
  );
}
