/**
 * Dados de exemplo e validação dos cálculos — Fase 1A.
 *
 * Serve para confirmar, com funções puras, que o custo por unidade-base bate
 * com o esperado. Usado pelo runner de validação (ver REVIEW.md / TASKS.md).
 */

import type { Ingredient, Recipe } from "@/types/pricing";
import { calculateIngredient } from "./ingredients";
import { calculateRecipe } from "./recipes";

/** Ingredientes de exemplo para teste manual e seed futuro. */
export const exampleIngredients: Ingredient[] = [
  {
    name: "Chocolate meio amargo",
    purchaseQuantity: 1,
    purchaseUnit: "kg",
    purchasePrice: 38,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Chocolate",
  },
  {
    name: "Leite",
    purchaseQuantity: 1,
    purchaseUnit: "l",
    purchasePrice: 6,
    baseUnit: "ml",
    correctionFactor: 1,
    category: "Laticínios",
  },
  {
    name: "Ovo",
    purchaseQuantity: 30,
    purchaseUnit: "un",
    purchasePrice: 24,
    baseUnit: "un",
    correctionFactor: 1,
    category: "Básicos",
  },
  {
    name: "Creme de leite",
    purchaseQuantity: 200,
    purchaseUnit: "g",
    purchasePrice: 4.5,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Laticínios",
  },
];

/** Custo por unidade-base esperado para cada exemplo. */
interface ExpectedCheck {
  name: string;
  expectedCostPerBaseUnit: number;
}

const expectedChecks: ExpectedCheck[] = [
  { name: "Chocolate meio amargo", expectedCostPerBaseUnit: 0.038 },
  { name: "Leite", expectedCostPerBaseUnit: 0.006 },
  { name: "Ovo", expectedCostPerBaseUnit: 0.8 },
  { name: "Creme de leite", expectedCostPerBaseUnit: 0.0225 },
];

/** Resultado de uma checagem de exemplo (esperado × obtido). */
export interface ValidationCheckResult {
  name: string;
  expected: number;
  actual: number | null;
  pass: boolean;
  detail?: string;
}

const EPSILON = 1e-9;

/**
 * Roda as checagens dos exemplos e retorna esperado × obtido para cada um.
 * Função pura: não imprime nada, só devolve os resultados.
 */
export function runExampleValidations(): ValidationCheckResult[] {
  return expectedChecks.map((check) => {
    const ingredient = exampleIngredients.find((i) => i.name === check.name);
    if (!ingredient) {
      return {
        name: check.name,
        expected: check.expectedCostPerBaseUnit,
        actual: null,
        pass: false,
        detail: "exemplo não encontrado",
      };
    }

    const result = calculateIngredient(ingredient);
    if (!result.ok) {
      return {
        name: check.name,
        expected: check.expectedCostPerBaseUnit,
        actual: null,
        pass: false,
        detail: result.errors.map((e) => e.message).join("; "),
      };
    }

    const actual = result.value.costPerBaseUnit;
    const pass = Math.abs(actual - check.expectedCostPerBaseUnit) < EPSILON;
    return { name: check.name, expected: check.expectedCostPerBaseUnit, actual, pass };
  });
}

/** Retorna true se todos os exemplos baterem com o esperado. */
export function allExamplesPass(): boolean {
  return runExampleValidations().every((r) => r.pass);
}

/* ─────────────────────────── Receitas (Fase 1B-1) ─────────────────────────── */

/** Ingredientes do exemplo de brigadeiro (com id, para referência em receitas). */
export const brigadeiroIngredients: Ingredient[] = [
  {
    id: "leite-condensado",
    name: "Leite condensado",
    purchaseQuantity: 395,
    purchaseUnit: "g",
    purchasePrice: 6.5,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Doces",
  },
  {
    id: "chocolate-po",
    name: "Chocolate em pó",
    purchaseQuantity: 200,
    purchaseUnit: "g",
    purchasePrice: 8,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Chocolate",
  },
  {
    id: "manteiga",
    name: "Manteiga",
    purchaseQuantity: 200,
    purchaseUnit: "g",
    purchasePrice: 12,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Laticínios",
  },
];

/** Receita de exemplo: Brigadeiro (rendimento 20 un, sem perda). */
export const brigadeiroRecipe: Recipe = {
  id: "brigadeiro",
  name: "Brigadeiro",
  items: [
    {
      kind: "ingredient",
      ingredientId: "leite-condensado",
      ingredientName: "Leite condensado",
      quantityUsed: 395,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "chocolate-po",
      ingredientName: "Chocolate em pó",
      quantityUsed: 40,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "manteiga",
      ingredientName: "Manteiga",
      quantityUsed: 20,
      unit: "g",
    },
  ],
  yieldQuantity: 20,
  yieldUnit: "un",
  productionLossPercent: 0,
};

/** Resultado de uma checagem de receita (esperado × obtido). */
export interface RecipeCheckResult {
  label: string;
  expected: number;
  actual: number | null;
  pass: boolean;
  detail?: string;
}

const RECIPE_EPSILON = 1e-6;

/** Mapa id → ingrediente, montado a partir de uma lista. */
function indexById(ingredients: Ingredient[]): Record<string, Ingredient> {
  const map: Record<string, Ingredient> = {};
  for (const ingredient of ingredients) {
    if (ingredient.id) {
      map[ingredient.id] = ingredient;
    }
  }
  return map;
}

/**
 * Valida o exemplo do brigadeiro: custo total bruto, custo com perda e
 * custo unitário. Função pura: só devolve os resultados.
 */
export function runRecipeValidations(): RecipeCheckResult[] {
  const ingredientsById = indexById(brigadeiroIngredients);
  const result = calculateRecipe(brigadeiroRecipe, ingredientsById);

  if (!result.ok) {
    return [
      {
        label: "Brigadeiro calcula sem erros",
        expected: 0,
        actual: result.errors.length,
        pass: false,
        detail: result.errors.map((e) => e.message).join("; "),
      },
    ];
  }

  const r = result.value;
  const near = (a: number, b: number) => Math.abs(a - b) < RECIPE_EPSILON;

  return [
    {
      label: "Brigadeiro custo total bruto",
      expected: 9.3,
      actual: r.grossCost,
      pass: near(r.grossCost, 9.3),
    },
    {
      label: "Brigadeiro custo total com perda (0%)",
      expected: 9.3,
      actual: r.totalCostWithLoss,
      pass: near(r.totalCostWithLoss, 9.3),
    },
    {
      label: "Brigadeiro custo unitário",
      expected: 0.465,
      actual: r.unitCost,
      pass: near(r.unitCost, 0.465),
    },
  ];
}

/** Retorna true se todas as checagens de receita baterem com o esperado. */
export function allRecipeExamplesPass(): boolean {
  return runRecipeValidations().every((r) => r.pass);
}

/* ─────────────────────────── Sub-receitas (Fase 1B-2) ─────────────────────────── */

/**
 * Sub-receita: Recheio de brigadeiro.
 * Mesmos ingredientes do brigadeiro (custo total R$ 9,30), mas com rendimento
 * em gramas (500 g) → custo por g = 9,30 / 500 = R$ 0,0186.
 */
export const recheioRecipe: Recipe = {
  id: "recheio-brigadeiro",
  name: "Recheio de brigadeiro",
  items: [
    {
      kind: "ingredient",
      ingredientId: "leite-condensado",
      ingredientName: "Leite condensado",
      quantityUsed: 395,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "chocolate-po",
      ingredientName: "Chocolate em pó",
      quantityUsed: 40,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "manteiga",
      ingredientName: "Manteiga",
      quantityUsed: 20,
      unit: "g",
    },
  ],
  yieldQuantity: 500,
  yieldUnit: "g",
  productionLossPercent: 0,
};

/** Ingredientes do brownie (números simples para validar). */
export const brownieIngredients: Ingredient[] = [
  {
    id: "farinha",
    name: "Farinha de trigo",
    purchaseQuantity: 1000,
    purchaseUnit: "g",
    purchasePrice: 5,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Secos",
  },
  {
    id: "acucar",
    name: "Açúcar",
    purchaseQuantity: 1000,
    purchaseUnit: "g",
    purchasePrice: 4,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Secos",
  },
  {
    id: "chocolate-brownie",
    name: "Chocolate meio amargo",
    purchaseQuantity: 1000,
    purchaseUnit: "g",
    purchasePrice: 38,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Chocolate",
  },
];

/**
 * Receita principal: Brownie com recheio.
 * Ingredientes (200 g farinha = 1,00; 250 g açúcar = 1,00; 100 g chocolate = 3,80)
 * + 150 g de recheio (sub-receita) = 150 × 0,0186 = 2,79.
 * Custo total = 8,59; rendimento 10 un → custo unitário 0,859.
 */
export const brownieComRecheioRecipe: Recipe = {
  id: "brownie-com-recheio",
  name: "Brownie com recheio",
  items: [
    {
      kind: "ingredient",
      ingredientId: "farinha",
      ingredientName: "Farinha de trigo",
      quantityUsed: 200,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "acucar",
      ingredientName: "Açúcar",
      quantityUsed: 250,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "chocolate-brownie",
      ingredientName: "Chocolate meio amargo",
      quantityUsed: 100,
      unit: "g",
    },
    {
      kind: "subRecipe",
      subRecipeId: "recheio-brigadeiro",
      subRecipeName: "Recheio de brigadeiro",
      quantityUsed: 150,
      unit: "g",
    },
  ],
  yieldQuantity: 10,
  yieldUnit: "un",
  productionLossPercent: 0,
};

/**
 * Valida o exemplo de sub-receita: custo por g do recheio, custo do recheio
 * dentro do brownie, custo total e custo unitário do brownie.
 */
export function runSubRecipeValidations(): RecipeCheckResult[] {
  const checks: RecipeCheckResult[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < RECIPE_EPSILON;

  // Sub-receita isolada (custo por g = custo unitário, pois o rendimento é em g).
  const subIngredients = indexById(brigadeiroIngredients);
  const recheioResult = calculateRecipe(recheioRecipe, subIngredients);
  if (!recheioResult.ok) {
    checks.push({
      label: "Recheio calcula sem erros",
      expected: 0,
      actual: recheioResult.errors.length,
      pass: false,
      detail: recheioResult.errors.map((e) => e.message).join("; "),
    });
    return checks;
  }
  const recheio = recheioResult.value;
  checks.push({
    label: "Recheio custo por g (unitário)",
    expected: 0.0186,
    actual: recheio.unitCost,
    pass: near(recheio.unitCost, 0.0186),
  });

  // Receita principal usando a sub-receita.
  const allIngredients = indexById([
    ...brigadeiroIngredients,
    ...brownieIngredients,
  ]);
  const recipesById: Record<string, Recipe> = {
    [recheioRecipe.id]: recheioRecipe,
  };
  const brownieResult = calculateRecipe(
    brownieComRecheioRecipe,
    allIngredients,
    recipesById,
  );
  if (!brownieResult.ok) {
    checks.push({
      label: "Brownie calcula sem erros",
      expected: 0,
      actual: brownieResult.errors.length,
      pass: false,
      detail: brownieResult.errors.map((e) => e.message).join("; "),
    });
    return checks;
  }
  const brownie = brownieResult.value;
  const subItem = brownie.items.find((i) => i.kind === "subRecipe");
  checks.push({
    label: "Brownie custo do recheio (sub-receita)",
    expected: 2.79,
    actual: subItem ? subItem.itemCost : null,
    pass: subItem ? near(subItem.itemCost, 2.79) : false,
  });
  checks.push({
    label: "Brownie custo total bruto",
    expected: 8.59,
    actual: brownie.grossCost,
    pass: near(brownie.grossCost, 8.59),
  });
  checks.push({
    label: "Brownie custo unitário (10 un)",
    expected: 0.859,
    actual: brownie.unitCost,
    pass: near(brownie.unitCost, 0.859),
  });

  return checks;
}

/** Retorna true se todas as checagens de sub-receita baterem com o esperado. */
export function allSubRecipeExamplesPass(): boolean {
  return runSubRecipeValidations().every((r) => r.pass);
}
