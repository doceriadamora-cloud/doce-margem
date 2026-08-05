"use client";

import { useState, useSyncExternalStore } from "react";
import {
  getIngredientsServerSnapshot,
  getIngredientsSnapshot,
  subscribeIngredients,
} from "./ingredients-store";
import IngredientForm from "./IngredientForm";
import IngredientList from "./IngredientList";

/**
 * Combina formulário + listagem de ingredientes num único componente que
 * possui o estado de "qual item está em edição agora" — Fase 2-7.
 *
 * O estado (`editingId`) é puramente de UI (não é persistido, não é dado de
 * negócio) e por isso vive aqui como `useState` comum, não num store — o
 * padrão de store reativo (ver DECISIONS.md) é para dados que sobrevivem à
 * sessão, o que não é o caso de "qual linha estou editando agora".
 *
 * Renderiza um Fragment (não uma `<div>`) de propósito: a página usa um grid
 * CSS de 2 colunas esperando `<IngredientForm>`/`<IngredientList>` como
 * filhos diretos — um Fragment não interfere no layout do grid.
 */
export default function IngredientsScreen() {
  const ingredients = useSyncExternalStore(
    subscribeIngredients,
    getIngredientsSnapshot,
    getIngredientsServerSnapshot,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIngredient = editingId
    ? (ingredients.find((i) => i.id === editingId) ?? null)
    : null;

  return (
    <>
      <IngredientForm
        key={editingId ?? "new"}
        editingIngredient={editingIngredient}
        onDoneEditing={() => setEditingId(null)}
      />
      <IngredientList editingId={editingId} onEdit={setEditingId} />
    </>
  );
}
