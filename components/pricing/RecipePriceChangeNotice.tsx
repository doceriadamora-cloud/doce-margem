"use client";

import { useSyncExternalStore } from "react";
import { listRecentPriceIncreases, RECENT_PRICE_CHANGE_DAYS } from "@/lib/price-history";
import { collectIngredientIds } from "@/lib/recipe-usage";
import {
  getIngredientsServerSnapshot,
  getIngredientsSnapshot,
  subscribeIngredients,
} from "@/components/ingredients/ingredients-store";
import {
  getPriceHistoryServerSnapshot,
  getPriceHistorySnapshot,
  subscribePriceHistory,
} from "@/components/ingredients/price-history-store";
import {
  getRecipesServerSnapshot,
  getRecipesSnapshot,
  subscribeRecipes,
} from "@/components/recipes/recipes-store";
import type { Recipe } from "@/types/pricing";

/**
 * Aviso de ingrediente reajustado na Precificação — Fase P0-13.
 *
 * Informa, não bloqueia: a usuária continua livre para precificar. O objetivo é
 * ela não descobrir depois de vender que o custo tinha mudado.
 *
 * Considera também os ingredientes que chegam por sub-receita — são justamente
 * os que ela não veria olhando a lista de itens da receita.
 */

interface RecipePriceChangeNoticeProps {
  recipe: Recipe;
}

export default function RecipePriceChangeNotice({ recipe }: RecipePriceChangeNoticeProps) {
  const history = useSyncExternalStore(
    subscribePriceHistory,
    getPriceHistorySnapshot,
    getPriceHistoryServerSnapshot,
  );
  const recipes = useSyncExternalStore(
    subscribeRecipes,
    getRecipesSnapshot,
    getRecipesServerSnapshot,
  );
  const ingredients = useSyncExternalStore(
    subscribeIngredients,
    getIngredientsSnapshot,
    getIngredientsServerSnapshot,
  );

  const usados = collectIngredientIds(recipe, recipes);
  const afetados = listRecentPriceIncreases(history).filter((aumento) =>
    usados.has(aumento.ingredientId),
  );
  if (afetados.length === 0) return null;

  const nomes = afetados
    .map((aumento) => ingredients.find((item) => item.id === aumento.ingredientId)?.name)
    .filter((nome): nome is string => nome !== undefined);

  return (
    <p className="pricing-print-hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      Alguns ingredientes desta receita tiveram alteração de preço nos últimos{" "}
      {RECENT_PRICE_CHANGE_DAYS} dias
      {nomes.length > 0 && <> ({nomes.join(", ")})</>}. Revise o preço antes de vender.
    </p>
  );
}
