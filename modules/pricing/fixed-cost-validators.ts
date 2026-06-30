/**
 * Validações de custos fixos — Fase 1C-2. Funções puras, sem UI.
 *
 * Regras:
 *  - custo fixo: nome obrigatório, valor mensal ≥ 0;
 *  - faturamento estimado: > 0;
 *  - volume estimado (se informado): > 0;
 *  - mensalidade de canal (se incluída): ≥ 0;
 *  - lista vazia de custos fixos é permitida (total 0).
 */

import type {
  FixedCost,
  FixedCostCalculationInput,
  ValidationError,
} from "@/types/pricing";

/**
 * Valida um único custo fixo.
 * Retorna a lista de erros; lista vazia significa custo válido.
 */
export function validateFixedCost(cost: FixedCost): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!cost.name || cost.name.trim() === "") {
    errors.push({
      field: "name",
      code: "REQUIRED",
      message: "Informe o nome do custo fixo.",
    });
  }

  if (cost.monthlyValue < 0) {
    errors.push({
      field: "monthlyValue",
      code: "NEGATIVE",
      message: `O valor mensal do custo fixo "${cost.name}" não pode ser negativo.`,
    });
  }

  return errors;
}

/**
 * Valida a entrada completa do cálculo de custos fixos: cada custo, o
 * faturamento estimado, o volume estimado (se informado) e as mensalidades
 * de canais (se incluídas).
 */
export function validateFixedCostCalculation(
  input: FixedCostCalculationInput,
): ValidationError[] {
  const errors: ValidationError[] = [];

  input.fixedCosts.forEach((cost, index) => {
    const costErrors = validateFixedCost(cost);
    for (const e of costErrors) {
      errors.push({ ...e, field: `fixedCosts[${index}].${e.field}` });
    }
  });

  if (input.estimatedMonthlyRevenue <= 0) {
    errors.push({
      field: "estimatedMonthlyRevenue",
      code: "NON_POSITIVE",
      message: "O faturamento estimado precisa ser maior que zero.",
    });
  }

  if (
    input.estimatedMonthlyUnits !== undefined &&
    input.estimatedMonthlyUnits <= 0
  ) {
    errors.push({
      field: "estimatedMonthlyUnits",
      code: "NON_POSITIVE",
      message: "O volume estimado precisa ser maior que zero.",
    });
  }

  if (input.includeChannelMonthlyFees && input.channels) {
    input.channels.forEach((channel, index) => {
      if (channel.monthlyFee < 0) {
        errors.push({
          field: `channels[${index}].monthlyFee`,
          code: "NEGATIVE",
          message: `A mensalidade do canal "${channel.name}" não pode ser negativa.`,
        });
      }
    });
  }

  return errors;
}
