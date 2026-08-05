"use client";

import { useState, useSyncExternalStore } from "react";
import {
  getFixedCostsServerSnapshot,
  getFixedCostsSnapshot,
  subscribeFixedCosts,
} from "./fixed-costs-store";
import FixedCostForm from "./FixedCostForm";
import FixedCostList from "./FixedCostList";

/**
 * Combina formulário + listagem de custos fixos com o estado de "qual item
 * está em edição agora" — Fase 2-7. Mesmo padrão de `IngredientsScreen.tsx`.
 */
export default function FixedCostsScreen() {
  const fixedCosts = useSyncExternalStore(
    subscribeFixedCosts,
    getFixedCostsSnapshot,
    getFixedCostsServerSnapshot,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingFixedCost = editingId
    ? (fixedCosts.find((c) => c.id === editingId) ?? null)
    : null;

  return (
    <>
      <FixedCostForm
        key={editingId ?? "new"}
        editingFixedCost={editingFixedCost}
        onDoneEditing={() => setEditingId(null)}
      />
      <FixedCostList editingId={editingId} onEdit={setEditingId} />
    </>
  );
}
