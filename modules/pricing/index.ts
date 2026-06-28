/**
 * Ponto de entrada do módulo de precificação (Fase 1A).
 * Reexporta as funções puras e os tipos do domínio para uso conveniente:
 *   import { calculateIngredient, convert } from "@/modules/pricing";
 */

export * from "./units";
export * from "./validators";
export * from "./ingredients";
export * from "./recipe-validators";
export * from "./recipes";
export * from "./examples";

export type {
  BaseUnit,
  PurchaseUnit,
  HouseholdMeasure,
  UnitDimension,
  Ingredient,
  CalculatedIngredient,
  ValidationError,
  ValidationErrorCode,
  CalculationResult,
  RecipeItem,
  Recipe,
  CalculatedRecipeItem,
  CalculatedRecipe,
} from "@/types/pricing";
