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
      ingredientId: "leite-condensado",
      ingredientName: "Leite condensado",
      quantityUsed: 395,
      unit: "g",
    },
    {
      ingredientId: "chocolate-po",
      ingredientName: "Chocolate em pó",
      quantityUsed: 40,
      unit: "g",
    },
    {
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
