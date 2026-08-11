"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getIngredientsServerSnapshot,
  getIngredientsSnapshot,
  subscribeIngredients,
} from "@/components/ingredients/ingredients-store";
import { calculateRecipe } from "@/modules/pricing";
import type { Ingredient, Recipe } from "@/types/pricing";
import { getRecipesServerSnapshot, getRecipesSnapshot, subscribeRecipes } from "./recipes-store";
import RecipeForm from "./RecipeForm";
import RecipeList from "./RecipeList";
import RecipePrintableSheet from "./RecipePrintableSheet";

interface PrintRequest {
  recipeId: string;
  requestId: number;
  generatedAt: string;
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

/**
 * Combina formulário + listagem de receitas com o estado de "qual item está
 * em edição agora" — Fase 2-7. Mesmo padrão de `IngredientsScreen.tsx`.
 */
export default function RecipesScreen() {
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printRequest, setPrintRequest] = useState<PrintRequest | null>(null);
  const editingRecipe = editingId ? (recipes.find((r) => r.id === editingId) ?? null) : null;
  const printableRecipe = printRequest
    ? (recipes.find((recipe) => recipe.id === printRequest.recipeId) ?? null)
    : null;
  const printCalculation = printableRecipe
    ? calculateRecipe(
        printableRecipe,
        buildIngredientsById(ingredients),
        buildRecipesById(recipes),
      )
    : null;
  const canOpenPrintDialog = printCalculation?.ok === true;
  const requestedPrintId = printRequest?.requestId ?? 0;

  useEffect(() => {
    if (!requestedPrintId || !canOpenPrintDialog) return;
    const animationFrame = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(animationFrame);
  }, [requestedPrintId, canOpenPrintDialog]);

  function handlePrint(recipeId: string): void {
    setPrintRequest((current) => ({
      recipeId,
      requestId: (current?.requestId ?? 0) + 1,
      generatedAt: new Date().toISOString(),
    }));
  }

  return (
    <>
      <div className="recipe-print-hidden">
        <RecipeForm
          key={editingId ?? "new"}
          editingRecipe={editingRecipe}
          onDoneEditing={() => setEditingId(null)}
        />
      </div>
      <div className="recipe-print-hidden">
        <RecipeList
          editingId={editingId}
          printingId={printRequest?.recipeId ?? null}
          onEdit={setEditingId}
          onPrint={handlePrint}
        />
      </div>
      {printCalculation?.ok && printRequest && (
        <div className="min-w-0 lg:col-span-2">
          <RecipePrintableSheet
            calculation={printCalculation.value}
            generatedAt={printRequest.generatedAt}
          />
        </div>
      )}
    </>
  );
}
