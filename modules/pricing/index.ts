/**
 * Ponto de entrada do módulo de precificação (Fase 1A).
 * Reexporta as funções puras e os tipos do domínio para uso conveniente:
 *   import { calculateIngredient, convert } from "@/modules/pricing";
 */

export * from "./units";
export * from "./validators";
export * from "./ingredients";
export * from "./household-measures";
export * from "./recipe-validators";
export * from "./recipes";
export * from "./channel-validators";
export * from "./channels";
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
  RecipeItemKind,
  IngredientRecipeItem,
  HouseholdMeasureRecipeItem,
  SubRecipeItem,
  RecipeItem,
  Recipe,
  CalculatedIngredientItem,
  CalculatedHouseholdMeasureItem,
  CalculatedSubRecipeItem,
  CalculatedRecipeItem,
  CalculatedRecipe,
  SalesChannel,
  ChannelPriceBreakdown,
} from "@/types/pricing";
