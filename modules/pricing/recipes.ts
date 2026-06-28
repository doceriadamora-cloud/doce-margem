/**
 * Cálculo de receitas simples — Fase 1B-1. Funções puras, sem UI.
 *
 * Usa os ingredientes calculados da Fase 1A. Para cada item:
 *   quantidade base   = converter(quantidade usada, unidade do item → base do ingrediente)
 *   quantidade corrig.= quantidade base × fator de correção
 *   custo do item     = quantidade corrigida × custo por unidade-base
 *
 * Para a receita:
 *   custo total bruto = Σ custo dos itens
 *   custo com perda   = custo total bruto / (1 − perda%/100)
 *   custo unitário    = custo com perda / rendimento
 *
 * Não inclui sub-receitas, medidas caseiras, canais nem pricing engine.
 */

import type {
  CalculatedRecipe,
  CalculatedRecipeItem,
  CalculationResult,
  Ingredient,
  Recipe,
} from "@/types/pricing";
import { convert } from "./units";
import { applyCorrectionFactor, calculateIngredient } from "./ingredients";
import { validateRecipe } from "./recipe-validators";

/**
 * Calcula o custo total, o custo com perda e o custo unitário de uma receita.
 *
 * Valida a receita e os ingredientes antes; se inválida, retorna
 * { ok: false, errors }. A coleção `ingredientsById` mapeia id → ingrediente.
 */
export function calculateRecipe(
  recipe: Recipe,
  ingredientsById: Record<string, Ingredient>,
): CalculationResult<CalculatedRecipe> {
  const errors = validateRecipe(recipe, ingredientsById);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const items: CalculatedRecipeItem[] = recipe.items.map((item) => {
    const ingredient = ingredientsById[item.ingredientId];
    const calc = calculateIngredient(ingredient);
    // Invariante: validateRecipe já garantiu ingrediente existente e válido.
    if (!calc.ok) {
      throw new Error(
        `Ingrediente inválido não detectado na validação: ${item.ingredientId}`,
      );
    }

    const { costPerBaseUnit, correctionFactor } = calc.value;
    const quantityInBaseUnit = convert(
      item.quantityUsed,
      item.unit,
      ingredient.baseUnit,
    );
    const correctedQuantity = applyCorrectionFactor(
      quantityInBaseUnit,
      correctionFactor,
    );
    const itemCost = correctedQuantity * costPerBaseUnit;

    return {
      item,
      correctionFactor,
      quantityInBaseUnit,
      correctedQuantity,
      costPerBaseUnit,
      itemCost,
    };
  });

  const grossCost = items.reduce((sum, i) => sum + i.itemCost, 0);
  const productionLossPercent = recipe.productionLossPercent ?? 0;
  const totalCostWithLoss = grossCost / (1 - productionLossPercent / 100);
  const unitCost = totalCostWithLoss / recipe.yieldQuantity;

  return {
    ok: true,
    value: {
      recipe,
      items,
      grossCost,
      productionLossPercent,
      totalCostWithLoss,
      unitCost,
    },
  };
}
