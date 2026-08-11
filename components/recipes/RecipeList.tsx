"use client";

import { useSyncExternalStore } from "react";
import { calculateRecipe } from "@/modules/pricing";
import type { HouseholdMeasure, Ingredient, Recipe, RecipeItem } from "@/types/pricing";
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
    maximumFractionDigits: 2,
  });
}

function buildIngredientsById(ingredients: Ingredient[]): Record<string, Ingredient> {
  const map: Record<string, Ingredient> = {};
  for (const ingredient of ingredients) {
    if (ingredient.id) map[ingredient.id] = ingredient;
  }
  return map;
}

function buildRecipesById(recipes: Recipe[]): Record<string, Recipe> {
  const map: Record<string, Recipe> = {};
  for (const recipe of recipes) map[recipe.id] = recipe;
  return map;
}

const HOUSEHOLD_MEASURE_LABELS: Record<HouseholdMeasure, string> = {
  xicara: "xícara(s)",
  colher_sopa: "colher(es) de sopa",
  colher_cha: "colher(es) de chá",
  colher_cafe: "colher(es) de café",
};

function describeRecipeItem(item: RecipeItem): string {
  if (item.kind === "ingredient") {
    return `• ${item.ingredientName} — ${item.quantityUsed} ${item.unit}`;
  }
  if (item.kind === "subRecipe") {
    return `• ${item.subRecipeName} (sub-receita) — ${item.quantityUsed} ${item.unit}`;
  }
  return `• ${item.ingredientName} — ${item.quantityUsed} ${HOUSEHOLD_MEASURE_LABELS[item.measure]}`;
}

interface RecipeListProps {
  /** Id da receita sendo editada agora (destaca a linha), ou `null`. */
  editingId?: string | null;
  /** Id da receita cuja ficha está pronta para impressão, ou `null`. */
  printingId?: string | null;
  /** Chamado quando a usuária clica "Editar" numa linha. */
  onEdit: (id: string) => void;
  /** Seleciona uma receita válida e abre a impressão nativa. */
  onPrint: (id: string) => void;
}

/** Lista as receitas cadastradas, com o custo calculado pelo domínio (Fase 1B). */
export default function RecipeList({
  editingId = null,
  printingId = null,
  onEdit,
  onPrint,
}: RecipeListProps) {
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
  const recipesById = buildRecipesById(recipes);

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
        const calc = calculateRecipe(recipe, ingredientsById, recipesById);
        const isEditing = recipe.id === editingId;
        const isPrinting = recipe.id === printingId;
        return (
          <li
            key={recipe.id}
            className={`rounded-2xl border bg-white p-4 dark:bg-stone-900 ${
              isEditing
                ? "border-rose-300 ring-2 ring-rose-100 dark:border-rose-700 dark:ring-rose-950"
                : "border-stone-200 dark:border-stone-800"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-50">{recipe.name}</p>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                  Rendimento: {recipe.yieldQuantity} {recipe.yieldUnit}
                  {(recipe.productionLossPercent ?? 0) > 0 &&
                    ` · Perda: ${recipe.productionLossPercent}%`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onPrint(recipe.id)}
                  disabled={!calc.ok}
                  className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 dark:disabled:text-stone-400"
                  title={calc.ok ? undefined : "Corrija a receita antes de imprimir"}
                >
                  {isPrinting ? "Imprimir novamente" : "Imprimir receita"}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(recipe.id)}
                  className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-rose-800 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("Tem certeza que deseja excluir esta receita?")) return;
                    removeRecipe(recipe.id);
                  }}
                  className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
                >
                  Excluir
                </button>
              </div>
            </div>

            <ul className="mt-2 flex flex-col gap-0.5">
              {recipe.items.map((item, index) => (
                <li key={index} className="text-sm text-stone-500 dark:text-stone-400">
                  {describeRecipeItem(item)}
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
