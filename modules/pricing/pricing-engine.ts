/**
 * Pricing engine — Fase 1C-3. Funções puras, sem UI.
 *
 * Orquestra os blocos das fases anteriores (custo de receita, custo fixo
 * percentual e taxas de canal) para produzir preço sugerido, margem e markup,
 * além da comparação com o preço praticado.
 *
 * Embalagens e mão de obra entram no custo direto antes dos percentuais:
 *   custo direto = custo base da receita/CMV + embalagens + mão de obra
 *
 * Preço sugerido SEM canal:
 *   preço = custo direto / (1 − fixedCostRate − desiredProfitRate)
 *   custo fixo rateado = preço × fixedCostRate
 *   lucro esperado     = preço × desiredProfitRate
 *
 * Preço sugerido COM canal (percentuais do canal entram no denominador):
 *   channelRates = (comissão + pagamento + anúncio) / 100      (taxa fixa fora do %)
 *   preço = (custo direto + taxa fixa) / (1 − fixedCostRate − desiredProfitRate − channelRates)
 *
 * Margem = lucro líquido / preço de venda.
 * Markup = preço de venda / custo direto.
 *
 * Identidades (validadas nos exemplos):
 *   sem canal:  preço = custo direto + custo fixo + lucro
 *   com canal:  preço = custo direto + custo fixo + lucro + comissão + pagamento + anúncio + taxa fixa
 *               líquido final = preço − taxas do canal = custo direto + custo fixo + lucro
 *
 * NÃO faz engenharia de cardápio nem qualquer coisa de UI/armazenamento.
 */

import type {
  CalculationResult,
  ChannelSuggestedPriceBreakdown,
  PracticedPriceComparison,
  PriceComparisonStatus,
  PricingEngineInput,
  PricingEngineResult,
  SalesChannel,
} from "@/types/pricing";
import { validatePricingEngineInput } from "./pricing-validators";
import { calculateTotalDirectCost } from "./labor";

/** Tolerância (1%) para considerar o preço praticado "no ideal" (at_suggested). */
export const PRICE_COMPARISON_TOLERANCE = 0.01;

/** Soma dos percentuais do canal (comissão + pagamento + anúncio), em decimal. */
function channelPercentRate(channel: SalesChannel): number {
  return (
    (channel.commissionPercent +
      channel.paymentPercent +
      channel.adPercent) /
    100
  );
}

/**
 * Calcula preço sugerido, margem, markup e comparação com o preço praticado.
 * Valida antes; se inválido, retorna { ok: false, errors }.
 */
export function calculatePricing(
  input: PricingEngineInput,
): CalculationResult<PricingEngineResult> {
  const errors = validatePricingEngineInput(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // A validação garante que ao menos um destes resolve para um número > 0.
  const baseDirectUnitCost = (input.directUnitCost ?? input.recipe?.unitCost) as number;
  const packagingCost = input.packagingCost ?? 0;
  const laborCost = input.laborCost ?? 0;
  const directCostResult = calculateTotalDirectCost({
    recipeUnitCost: baseDirectUnitCost,
    packagingCost,
    laborCostPerUnit: laborCost,
  });
  if (!directCostResult.ok) return directCostResult;
  const directUnitCost = directCostResult.value;
  const { fixedCostRate, desiredProfitRate } = input;

  // ── Cenário SEM canal ──
  const baseDenominator = 1 - fixedCostRate - desiredProfitRate;
  const suggestedPrice = directUnitCost / baseDenominator;
  const fixedCostAmount = suggestedPrice * fixedCostRate;
  const totalUnitCost = directUnitCost + fixedCostAmount;
  const expectedProfitAmount = suggestedPrice * desiredProfitRate;
  const expectedMargin = expectedProfitAmount / suggestedPrice;
  const expectedMarkup = suggestedPrice / directUnitCost;
  const expectedMarkupPercent =
    ((suggestedPrice - directUnitCost) / directUnitCost) * 100;

  const result: PricingEngineResult = {
    baseDirectUnitCost,
    packagingCost,
    laborCost,
    directUnitCost,
    fixedCostRate,
    desiredProfitRate,
    suggestedPrice,
    fixedCostAmount,
    totalUnitCost,
    expectedProfitAmount,
    expectedMargin,
    expectedMarkup,
    expectedMarkupPercent,
  };

  // ── Cenário COM canal ──
  let channelPricing: ChannelSuggestedPriceBreakdown | undefined;
  if (input.channel) {
    channelPricing = calculateChannelPricing(
      input.channel,
      directUnitCost,
      fixedCostRate,
      desiredProfitRate,
    );
    result.channelPricing = channelPricing;
  }

  // ── Comparação com o preço praticado ──
  if (input.practicedPrice !== undefined) {
    const referencePrice = channelPricing
      ? channelPricing.suggestedPrice
      : suggestedPrice;
    result.practicedComparison = comparePracticedPrice(
      input.practicedPrice,
      referencePrice,
      directUnitCost,
      fixedCostRate,
      input.channel,
    );
  }

  return { ok: true, value: result };
}

/** Calcula o preço sugerido com canal e o detalhamento das taxas. */
function calculateChannelPricing(
  channel: SalesChannel,
  directUnitCost: number,
  fixedCostRate: number,
  desiredProfitRate: number,
): ChannelSuggestedPriceBreakdown {
  const commissionRate = channel.commissionPercent / 100;
  const paymentRate = channel.paymentPercent / 100;
  const adRate = channel.adPercent / 100;
  const channelRates = commissionRate + paymentRate + adRate;

  const denominator =
    1 - fixedCostRate - desiredProfitRate - channelRates;
  const suggestedPrice = (directUnitCost + channel.fixedFee) / denominator;

  const fixedCostAmount = suggestedPrice * fixedCostRate;
  const totalUnitCost = directUnitCost + fixedCostAmount;
  const expectedProfitAmount = suggestedPrice * desiredProfitRate;

  const commissionAmount = suggestedPrice * commissionRate;
  const paymentAmount = suggestedPrice * paymentRate;
  const adAmount = suggestedPrice * adRate;
  const fixedFeeAmount = channel.fixedFee;
  const totalChannelFees =
    commissionAmount + paymentAmount + adAmount + fixedFeeAmount;
  const netFinal = suggestedPrice - totalChannelFees;

  const expectedMargin = expectedProfitAmount / suggestedPrice;
  const expectedMarkup = suggestedPrice / directUnitCost;
  const expectedMarkupPercent =
    ((suggestedPrice - directUnitCost) / directUnitCost) * 100;

  return {
    channel,
    suggestedPrice,
    directUnitCost,
    fixedCostAmount,
    totalUnitCost,
    expectedProfitAmount,
    commissionAmount,
    paymentAmount,
    adAmount,
    fixedFeeAmount,
    totalChannelFees,
    netFinal,
    expectedMargin,
    expectedMarkup,
    expectedMarkupPercent,
  };
}

/**
 * Compara o preço praticado com o preço sugerido de referência e calcula a
 * margem e o markup REAIS no preço praticado.
 *
 * Lucro líquido real = praticado − custo direto − custo fixo real − taxas do canal,
 * onde custo fixo real = praticado × fixedCostRate e as taxas do canal escalam
 * com o preço praticado (percentual) mais a taxa fixa por pedido.
 */
function comparePracticedPrice(
  practicedPrice: number,
  referencePrice: number,
  directUnitCost: number,
  fixedCostRate: number,
  channel: SalesChannel | undefined,
): PracticedPriceComparison {
  const difference = practicedPrice - referencePrice;
  const differencePercent = difference / referencePrice;

  const realFixedCostAmount = practicedPrice * fixedCostRate;
  const realChannelFees = channel
    ? practicedPrice * channelPercentRate(channel) + channel.fixedFee
    : 0;
  const realProfitAmount =
    practicedPrice - directUnitCost - realFixedCostAmount - realChannelFees;

  const realMargin = realProfitAmount / practicedPrice;
  const realMarkup = practicedPrice / directUnitCost;
  const realMarkupPercent =
    ((practicedPrice - directUnitCost) / directUnitCost) * 100;

  let status: PriceComparisonStatus;
  if (Math.abs(differencePercent) <= PRICE_COMPARISON_TOLERANCE) {
    status = "at_suggested";
  } else if (differencePercent < 0) {
    status = "below_suggested";
  } else {
    status = "above_suggested";
  }

  return {
    practicedPrice,
    referencePrice,
    difference,
    differencePercent,
    realFixedCostAmount,
    realChannelFees,
    realProfitAmount,
    realMargin,
    realMarkup,
    realMarkupPercent,
    status,
  };
}
