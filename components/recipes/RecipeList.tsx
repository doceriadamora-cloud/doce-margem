"use client";

import { useSyncExternalStore } from "react";
import { calculateRecipe } from "@/modules/pricing";
import type { Ingredient } from "@/types/pricing";
import {
  getIngredientsServerSnapshot,
  getIngredientsSnapshot,
  subscribeIngredients,
} from "@/components/ingredients/ingredients-store";
import {
  getRecipesServerSnapshot,
  getRecipesSnapshot,
  removeRecipe,
  subscribeRecipes,
} from "./recipes-store";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function buildIngredientsById(ingredients: Ingredient[]): Record<string, Ingredient> {
  const map: Record<string, Ingredient> = {};
  for (const ingredient of ingredients) {
    if (ingredient.id) map[ingredient.id] = ingredient;
  }
  return map;
}

/** Lista as receitas cadastradas, com o custo calculado pelo domínio (Fase 1B). */
export default function RecipeList() {
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
  const ingredientsById = buildIngredientsById(ingredients);

  if (recipes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="font-medium text-stone-900 dark:text-stone-50">
          Nenhuma receita cadastrada ainda
        </p>
        <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">
          Use o formulário para montar a primeira, com os ingredientes que você já cadastrou.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {recipes.map((recipe) => {
        const calc = calculateRecipe(recipe, ingredientsById, {});
        return (
          <li
            key={recipe.id}
            className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-50">{recipe.name}</p>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                  Rendimento: {recipe.yieldQuantity} {recipe.yieldUnit}
                  {(recipe.productionLossPercent ?? 0) > 0 &&
                    ` · Perda: ${recipe.productionLossPercent}%`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeRecipe(recipe.id)}
                className="shrink-0 rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
              >
                Excluir
              </button>
            </div>

            <ul className="mt-2 flex flex-col gap-0.5">
              {recipe.items.map((item, index) => (
                <li key={index} className="text-sm text-stone-500 dark:text-stone-400">
                  {item.kind === "ingredient" &&
                    `• ${item.ingredientName} — ${item.quantityUsed} ${item.unit}`}
                </li>
              ))}
            </ul>

            {calc.ok ? (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                Custo total:{" "}
                <span className="font-semibold">{formatCurrency(calc.value.totalCostWithLoss)}</span>
                {" · "}
                Custo unitário:{" "}
                <span className="font-semibold">
                  {formatCurrency(calc.value.unitCost)}/{recipe.yieldUnit}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                Não foi possível calcular o custo: {calc.errors[0]?.message}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
