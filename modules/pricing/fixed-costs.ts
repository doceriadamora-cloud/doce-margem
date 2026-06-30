/**
 * Custos fixos e rateio — Fase 1C-2. Funções puras, sem UI.
 *
 * Calcula o total mensal de custos fixos (opcionalmente somando mensalidades de
 * canais), o percentual de custo fixo sobre o faturamento estimado e o custo
 * fixo médio por unidade (quando há volume estimado).
 *
 * Fórmulas:
 *   totalFixedCosts        = Σ custos fixos ATIVOS
 *   channelMonthlyFees     = Σ monthlyFee dos canais (se incluídas)
 *   totalConsidered        = totalFixedCosts + channelMonthlyFees
 *   fixedCostRate          = totalConsidered / faturamento estimado     (decimal)
 *   fixedCostPerUnit       = totalConsidered / volume estimado          (se houver)
 *
 * NÃO calcula preço sugerido, margem nem markup — apenas o percentual/rateio que
 * o pricing engine (fase futura) usará.
 */

import type {
  CalculationResult,
  FixedCost,
  FixedCostCalculationInput,
  FixedCostSummary,
  SalesChannel,
} from "@/types/pricing";
import { validateFixedCostCalculation } from "./fixed-cost-validators";

/** Soma o valor mensal dos custos fixos ATIVOS (inativos são ignorados). */
export function sumActiveFixedCosts(fixedCosts: FixedCost[]): number {
  return fixedCosts
    .filter((c) => c.active)
    .reduce((sum, c) => sum + c.monthlyValue, 0);
}

/** Soma as mensalidades (`monthlyFee`) de uma lista de canais. */
export function sumChannelMonthlyFees(channels: SalesChannel[]): number {
  return channels.reduce((sum, c) => sum + c.monthlyFee, 0);
}

/**
 * Calcula o resumo de custos fixos. Valida antes; se inválido, retorna
 * { ok: false, errors }.
 */
export function calculateFixedCostSummary(
  input: FixedCostCalculationInput,
): CalculationResult<FixedCostSummary> {
  const errors = validateFixedCostCalculation(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const totalFixedCosts = sumActiveFixedCosts(input.fixedCosts);
  const channelMonthlyFeesTotal =
    input.includeChannelMonthlyFees && input.channels
      ? sumChannelMonthlyFees(input.channels)
      : 0;
  const totalConsidered = totalFixedCosts + channelMonthlyFeesTotal;

  const fixedCostRate = totalConsidered / input.estimatedMonthlyRevenue;

  const fixedCostPerUnit =
    input.estimatedMonthlyUnits !== undefined
      ? totalConsidered / input.estimatedMonthlyUnits
      : undefined;

  return {
    ok: true,
    value: {
      totalFixedCosts,
      channelMonthlyFeesTotal,
      totalConsidered,
      estimatedMonthlyRevenue: input.estimatedMonthlyRevenue,
      fixedCostRate,
      estimatedMonthlyUnits: input.estimatedMonthlyUnits,
      fixedCostPerUnit,
    },
  };
}
