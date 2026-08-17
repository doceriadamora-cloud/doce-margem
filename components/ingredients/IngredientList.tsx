"use client";

import { useSyncExternalStore } from "react";
import { calculateIngredient } from "@/modules/pricing";
import IngredientPriceHistory from "./IngredientPriceHistory";
import {
  getIngredientsServerSnapshot,
  getIngredientsSnapshot,
  removeIngredient,
  subscribeIngredients,
} from "./ingredients-store";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

interface IngredientListProps {
  /** Id do ingrediente sendo editado agora (destaca a linha), ou `null`. */
  editingId?: string | null;
  /** Chamado quando a usuária clica "Editar" numa linha. */
  onEdit: (id: string) => void;
}

/** Lista os ingredientes cadastrados, com o custo por unidade-base calculado pelo domínio. */
export default function IngredientList({ editingId = null, onEdit }: IngredientListProps) {
  const ingredients = useSyncExternalStore(
    subscribeIngredients,
    getIngredientsSnapshot,
    getIngredientsServerSnapshot,
  );

  if (ingredients.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="font-medium text-stone-900 dark:text-stone-50">
          Nenhum ingrediente cadastrado ainda
        </p>
        <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">
          Preencha o formulário ao lado. Por exemplo: Chocolate ao leite, pacote de 1 kg por
          R$ 38,00.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {ingredients.map((ingredient) => {
        const calc = calculateIngredient(ingredient);
        const isEditing = ingredient.id !== undefined && ingredient.id === editingId;
        return (
          <li
            key={ingredient.id}
            className={`rounded-2xl border bg-white p-4 dark:bg-stone-900 ${
              isEditing
                ? "border-rose-300 ring-2 ring-rose-100 dark:border-rose-700 dark:ring-rose-950"
                : "border-stone-200 dark:border-stone-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-50">{ingredient.name}</p>
              <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                {ingredient.purchaseQuantity} {ingredient.purchaseUnit} por{" "}
                {formatCurrency(ingredient.purchasePrice)}
                {calc.ok && (
                  <>
                    {" "}
                    —{" "}
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(calc.value.costPerBaseUnit)}/{ingredient.baseUnit}
                    </span>
                  </>
                )}
              </p>
              {!calc.ok && (
                <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
                  Não foi possível calcular o custo: {calc.errors[0]?.message}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (ingredient.id) onEdit(ingredient.id);
                }}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-rose-800 dark:hover:bg-rose-950 dark:hover:text-rose-300"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!ingredient.id) return;
                  if (
                    !window.confirm(
                      "Excluir este ingrediente? O histórico de preço dele também será removido.",
                    )
                  ) {
                    return;
                  }
                  removeIngredient(ingredient.id);
                }}
                className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
              >
                Excluir
              </button>
            </div>
            </div>

            {/* P0-13: histórico, variação e receitas afetadas — recolhido. */}
            <IngredientPriceHistory ingredient={ingredient} />
          </li>
        );
      })}
    </ul>
  );
}
