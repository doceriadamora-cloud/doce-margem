/**
 * Cálculo de custo de ingrediente — Fase 1A. Funções puras, sem UI.
 *
 * Calcula o custo por unidade-base a partir do que foi comprado.
 * Perdas de produção NÃO entram aqui — elas pertencem a receitas (Fase 1B+).
 */

import type {
  CalculatedIngredient,
  CalculationResult,
  Ingredient,
} from "@/types/pricing";
import { convert } from "./units";
import { validateIngredient } from "./validators";

/**
 * Aplica o fator de correção a uma quantidade usada.
 * quantidade corrigida = quantidade usada × fator de correção.
 */
export function applyCorrectionFactor(
  quantity: number,
  correctionFactor: number,
): number {
  return quantity * correctionFactor;
}

/**
 * Calcula o custo por unidade-base de um ingrediente.
 *
 * Valida a entrada antes; se inválida, retorna { ok: false, errors }.
 * Ex.: 1 kg por R$ 38, base "g" → custo por g = 38 / 1000 = 0,038.
 */
export function calculateIngredient(
  input: Ingredient,
): CalculationResult<CalculatedIngredient> {
  const errors = validateIngredient(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const correctionFactor = input.correctionFactor ?? 1;
  const quantityInBaseUnit = convert(
    input.purchaseQuantity,
    input.purchaseUnit,
    input.baseUnit,
  );
  const costPerBaseUnit = input.purchasePrice / quantityInBaseUnit;

  return {
    ok: true,
    value: {
      ingredient: input,
      baseUnit: input.baseUnit,
      quantityInBaseUnit,
      costPerBaseUnit,
      correctionFactor,
    },
  };
}

/**
 * Custo de uma quantidade usada de um ingrediente já calculado,
 * aplicando o fator de correção. Helper de nível de ingrediente,
 * preparado para uso em receitas na Fase 1B (sem perdas de produção).
 */
export function costForQuantity(
  calc: CalculatedIngredient,
  quantityUsed: number,
): number {
  const correctedQuantity = applyCorrectionFactor(
    quantityUsed,
    calc.correctionFactor,
  );
  return correctedQuantity * calc.costPerBaseUnit;
}
