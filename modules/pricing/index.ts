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
export * from "./fixed-cost-validators";
export * from "./fixed-costs";
export * from "./packaging-validators";
export * from "./packagings";
export * from "./packaging-examples";
export * from "./pricing-validators";
export * from "./pricing-engine";
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
  FixedCostCategory,
  FixedCost,
  FixedCostCalculationInput,
  FixedCostSummary,
  Packaging,
  PackagingUsage,
  PackagingCostForSale,
  PackagingCostSummary,
  PriceComparisonStatus,
  PricingEngineInput,
  ChannelSuggestedPriceBreakdown,
  PracticedPriceComparison,
  PricingEngineResult,
} from "@/types/pricing";
