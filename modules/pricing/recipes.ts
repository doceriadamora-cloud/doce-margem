/**
 * Cálculo de receitas — Fase 1B-1 + sub-receitas (Fase 1B-2). Funções puras, sem UI.
 *
 * Itens de ingrediente (Fase 1A/1B-1):
 *   quantidade base    = converter(quantidade usada, unidade do item → base do ingrediente)
 *   quantidade corrig. = quantidade base × fator de correção
 *   custo do item      = quantidade corrigida × custo por unidade-base
 *
 * Itens de sub-receita (Fase 1B-2):
 *   custo por rendimento = custo total com perda da sub-receita / rendimento
 *   quantidade           = converter(quantidade usada, unidade do item → unidade de rendimento)
 *   custo do item        = quantidade × custo por rendimento
 *
 * Para a receita:
 *   custo total bruto = Σ custo dos itens
 *   custo com perda   = custo total bruto / (1 − perda%/100)
 *   custo unitário    = custo com perda / rendimento
 *
 * Referências circulares são bloqueadas na validação; aqui há um guard de
 * invariante por segurança. Não inclui medidas caseiras, canais nem pricing engine.
 */

import type {
  CalculatedIngredientItem,
  CalculatedRecipe,
  CalculatedRecipeItem,
  CalculatedSubRecipeItem,
  CalculationResult,
  Ingredient,
  IngredientRecipeItem,
  Recipe,
  SubRecipeItem,
} from "@/types/pricing";
import { convert, isPurchaseUnit } from "./units";
import { applyCorrectionFactor, calculateIngredient } from "./ingredients";
import { validateRecipe } from "./recipe-validators";

/**
 * Calcula custo total, custo com perda e custo unitário de uma receita,
 * incluindo sub-receitas. Valida antes; se inválida, retorna { ok: false, errors }.
 *
 * `ingredientsById` mapeia id → ingrediente; `recipesById` mapeia id → receita
 * (necessário para resolver sub-receitas).
 */
export function calculateRecipe(
  recipe: Recipe,
  ingredientsById: Record<string, Ingredient>,
  recipesById: Record<string, Recipe> = {},
): CalculationResult<CalculatedRecipe> {
  const errors = validateRecipe(recipe, ingredientsById, recipesById);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: calculateRecipeUnchecked(
      recipe,
      ingredientsById,
      recipesById,
      new Set<string>(),
    ),
  };
}

function calculateRecipeUnchecked(
  recipe: Recipe,
  ingredientsById: Record<string, Ingredient>,
  recipesById: Record<string, Recipe>,
  ancestry: ReadonlySet<string>,
): CalculatedRecipe {
  // Invariante: validateRecipe já garantiu ausência de ciclo.
  if (ancestry.has(recipe.id)) {
    throw new Error(
      `Referência circular não detectada na validação: ${recipe.id}`,
    );
  }
  const nextAncestry = new Set(ancestry);
  nextAncestry.add(recipe.id);

  const items: CalculatedRecipeItem[] = recipe.items.map((item) =>
    item.kind === "ingredient"
      ? calculateIngredientItem(item, ingredientsById)
      : calculateSubRecipeItem(item, ingredientsById, recipesById, nextAncestry),
  );

  const grossCost = items.reduce((sum, i) => sum + i.itemCost, 0);
  const productionLossPercent = recipe.productionLossPercent ?? 0;
  const totalCostWithLoss = grossCost / (1 - productionLossPercent / 100);
  const unitCost = totalCostWithLoss / recipe.yieldQuantity;

  return {
    recipe,
    items,
    grossCost,
    productionLossPercent,
    totalCostWithLoss,
    unitCost,
  };
}

function calculateIngredientItem(
  item: IngredientRecipeItem,
  ingredientsById: Record<string, Ingredient>,
): CalculatedIngredientItem {
  const ingredient = ingredientsById[item.ingredientId];
  const calc = calculateIngredient(ingredient);
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
    kind: "ingredient",
    item,
    correctionFactor,
    quantityInBaseUnit,
    correctedQuantity,
    costPerBaseUnit,
    itemCost,
  };
}

function calculateSubRecipeItem(
  item: SubRecipeItem,
  ingredientsById: Record<string, Ingredient>,
  recipesById: Record<string, Recipe>,
  ancestry: ReadonlySet<string>,
): CalculatedSubRecipeItem {
  const sub = recipesById[item.subRecipeId];
  const subRecipe = calculateRecipeUnchecked(
    sub,
    ingredientsById,
    recipesById,
    ancestry,
  );

  const costPerYieldUnit = subRecipe.totalCostWithLoss / sub.yieldQuantity;
  const quantityInYieldUnit = isPurchaseUnit(sub.yieldUnit)
    ? convert(item.quantityUsed, item.unit, sub.yieldUnit)
    : item.quantityUsed;
  const itemCost = quantityInYieldUnit * costPerYieldUnit;

  return {
    kind: "subRecipe",
    item,
    costPerYieldUnit,
    quantityInYieldUnit,
    itemCost,
    subRecipe,
  };
}
