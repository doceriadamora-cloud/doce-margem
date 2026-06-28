/**
 * Validações de receita — Fase 1B-1. Funções puras, sem UI.
 *
 * Impede dados que quebrariam o cálculo da receita: sem nome, sem itens,
 * rendimento ≤ 0, perda fora de [0, 100), itens com quantidade ≤ 0,
 * unidade incompatível, ingrediente inexistente ou ingrediente inválido (Fase 1A).
 */

import type { Ingredient, Recipe, ValidationError } from "@/types/pricing";
import { areUnitsCompatible } from "./units";
import { validateIngredient } from "./validators";

/**
 * Valida uma receita contra a coleção de ingredientes disponíveis.
 * Retorna a lista de erros; lista vazia significa receita válida.
 */
export function validateRecipe(
  recipe: Recipe,
  ingredientsById: Record<string, Ingredient>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!recipe.name || recipe.name.trim() === "") {
    errors.push({
      field: "name",
      code: "REQUIRED",
      message: "Informe o nome da receita.",
    });
  }

  if (!recipe.items || recipe.items.length === 0) {
    errors.push({
      field: "items",
      code: "EMPTY",
      message: "A receita precisa ter pelo menos 1 item.",
    });
  }

  if (recipe.yieldQuantity <= 0) {
    errors.push({
      field: "yieldQuantity",
      code: "NON_POSITIVE",
      message: "O rendimento precisa ser maior que zero.",
    });
  }

  const loss = recipe.productionLossPercent ?? 0;
  if (loss < 0) {
    errors.push({
      field: "productionLossPercent",
      code: "NEGATIVE",
      message: "A perda de produção não pode ser negativa.",
    });
  } else if (loss >= 100) {
    errors.push({
      field: "productionLossPercent",
      code: "OUT_OF_RANGE",
      message: "A perda de produção deve ser menor que 100%.",
    });
  }

  (recipe.items ?? []).forEach((item, index) => {
    const field = `items[${index}]`;

    if (item.quantityUsed < 0) {
      errors.push({
        field: `${field}.quantityUsed`,
        code: "NEGATIVE",
        message: `A quantidade do item "${item.ingredientName}" não pode ser negativa.`,
      });
    } else if (item.quantityUsed === 0) {
      errors.push({
        field: `${field}.quantityUsed`,
        code: "ZERO",
        message: `A quantidade do item "${item.ingredientName}" não pode ser zero.`,
      });
    }

    const ingredient = ingredientsById[item.ingredientId];
    if (!ingredient) {
      errors.push({
        field: `${field}.ingredientId`,
        code: "NOT_FOUND",
        message: `Ingrediente "${item.ingredientName}" (${item.ingredientId}) não encontrado.`,
      });
      return;
    }

    const ingredientErrors = validateIngredient(ingredient);
    if (ingredientErrors.length > 0) {
      errors.push({
        field: `${field}.ingredient`,
        code: "INVALID_INGREDIENT",
        message: `Ingrediente "${ingredient.name}" é inválido: ${ingredientErrors
          .map((e) => e.message)
          .join("; ")}`,
      });
    }

    if (!areUnitsCompatible(item.unit, ingredient.baseUnit)) {
      errors.push({
        field: `${field}.unit`,
        code: "INCOMPATIBLE_UNIT",
        message: `Unidade "${item.unit}" do item "${item.ingredientName}" é incompatível com o ingrediente (base "${ingredient.baseUnit}").`,
      });
    }
  });

  return errors;
}
