/**
 * Validações de receita — Fase 1B-1 + sub-receitas (Fase 1B-2). Funções puras, sem UI.
 *
 * Valida receitas com itens de ingrediente e/ou sub-receita. Sub-receitas são
 * validadas recursivamente; referências circulares (diretas e indiretas) são
 * detectadas via um conjunto de ancestrais no caminho de cálculo.
 */

import type {
  IngredientRecipeItem,
  Ingredient,
  PurchaseUnit,
  Recipe,
  SubRecipeItem,
  ValidationError,
} from "@/types/pricing";
import { areUnitsCompatible, isPurchaseUnit } from "./units";
import { validateIngredient } from "./validators";

/**
 * Compatibilidade entre a unidade usada de uma sub-receita e a unidade de
 * rendimento dela. Se o rendimento estiver numa unidade conhecida (g/ml/un...),
 * exige mesma dimensão; caso contrário (unidade livre, ex.: "porções"), exige
 * que a unidade usada seja exatamente igual à de rendimento.
 */
export function isUnitCompatibleWithYield(
  itemUnit: PurchaseUnit,
  yieldUnit: string,
): boolean {
  if (isPurchaseUnit(yieldUnit)) {
    return areUnitsCompatible(itemUnit, yieldUnit);
  }
  return itemUnit === yieldUnit;
}

/**
 * Valida uma receita (e suas sub-receitas) contra as coleções de ingredientes
 * e de receitas. Retorna a lista de erros; lista vazia significa receita válida.
 */
export function validateRecipe(
  recipe: Recipe,
  ingredientsById: Record<string, Ingredient>,
  recipesById: Record<string, Recipe> = {},
): ValidationError[] {
  return validateRecipeWithAncestry(
    recipe,
    ingredientsById,
    recipesById,
    new Set<string>(),
  );
}

function validateRecipeWithAncestry(
  recipe: Recipe,
  ingredientsById: Record<string, Ingredient>,
  recipesById: Record<string, Recipe>,
  ancestry: ReadonlySet<string>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Referência circular: a receita já aparece no caminho que levou até ela.
  if (ancestry.has(recipe.id)) {
    errors.push({
      field: "id",
      code: "CIRCULAR_REFERENCE",
      message: `Referência circular detectada: a receita "${recipe.name}" (${recipe.id}) depende de si mesma.`,
    });
    return errors; // não recursar para evitar laço infinito
  }

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

  const nextAncestry = new Set(ancestry);
  nextAncestry.add(recipe.id);

  (recipe.items ?? []).forEach((item, index) => {
    const field = `items[${index}]`;
    if (item.kind === "ingredient") {
      validateIngredientItem(item, field, ingredientsById, errors);
    } else {
      validateSubRecipeItem(
        item,
        field,
        ingredientsById,
        recipesById,
        nextAncestry,
        errors,
      );
    }
  });

  return errors;
}

function validateQuantity(
  quantityUsed: number,
  label: string,
  field: string,
  errors: ValidationError[],
): void {
  if (quantityUsed < 0) {
    errors.push({
      field: `${field}.quantityUsed`,
      code: "NEGATIVE",
      message: `A quantidade do item "${label}" não pode ser negativa.`,
    });
  } else if (quantityUsed === 0) {
    errors.push({
      field: `${field}.quantityUsed`,
      code: "ZERO",
      message: `A quantidade do item "${label}" não pode ser zero.`,
    });
  }
}

function validateIngredientItem(
  item: IngredientRecipeItem,
  field: string,
  ingredientsById: Record<string, Ingredient>,
  errors: ValidationError[],
): void {
  validateQuantity(item.quantityUsed, item.ingredientName, field, errors);

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
}

function validateSubRecipeItem(
  item: SubRecipeItem,
  field: string,
  ingredientsById: Record<string, Ingredient>,
  recipesById: Record<string, Recipe>,
  ancestry: ReadonlySet<string>,
  errors: ValidationError[],
): void {
  validateQuantity(item.quantityUsed, item.subRecipeName, field, errors);

  const sub = recipesById[item.subRecipeId];
  if (!sub) {
    errors.push({
      field: `${field}.subRecipeId`,
      code: "NOT_FOUND",
      message: `Sub-receita "${item.subRecipeName}" (${item.subRecipeId}) não encontrada.`,
    });
    return;
  }

  if (!isUnitCompatibleWithYield(item.unit, sub.yieldUnit)) {
    errors.push({
      field: `${field}.unit`,
      code: "INCOMPATIBLE_UNIT",
      message: `Unidade "${item.unit}" do item "${item.subRecipeName}" é incompatível com o rendimento da sub-receita (em "${sub.yieldUnit}").`,
    });
  }

  // Valida a sub-receita recursivamente: pega sub-receita inválida, rendimento
  // inválido e referência circular indireta. Erros são prefixados com o caminho.
  const subErrors = validateRecipeWithAncestry(
    sub,
    ingredientsById,
    recipesById,
    ancestry,
  );
  for (const subError of subErrors) {
    errors.push({
      ...subError,
      field: `${field}.subRecipe.${subError.field}`,
    });
  }
}
