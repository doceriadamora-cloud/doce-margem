"use client";

import { useState, useSyncExternalStore } from "react";
import { getRecipesServerSnapshot, getRecipesSnapshot, subscribeRecipes } from "./recipes-store";
import RecipeForm from "./RecipeForm";
import RecipeList from "./RecipeList";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingRecipe = editingId ? (recipes.find((r) => r.id === editingId) ?? null) : null;

  return (
    <>
      <RecipeForm
        key={editingId ?? "new"}
        editingRecipe={editingRecipe}
        onDoneEditing={() => setEditingId(null)}
      />
      <RecipeList editingId={editingId} onEdit={setEditingId} />
    </>
  );
}
