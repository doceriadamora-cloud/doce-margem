/**
 * Dados de exemplo e validação dos cálculos — Fase 1A.
 *
 * Serve para confirmar, com funções puras, que o custo por unidade-base bate
 * com o esperado. Usado pelo runner de validação (ver REVIEW.md / TASKS.md).
 */

import type { Ingredient } from "@/types/pricing";
import { calculateIngredient } from "./ingredients";

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
