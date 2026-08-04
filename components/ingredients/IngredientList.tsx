"use client";

import { useSyncExternalStore } from "react";
import { calculateIngredient } from "@/modules/pricing";
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

/** Lista os ingredientes cadastrados, com o custo por unidade-base calculado pelo domínio. */
export default function IngredientList() {
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
          Use o formulário para cadastrar o primeiro — ex.: Chocolate ao leite, 1 kg por R$ 38.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {ingredients.map((ingredient) => {
        const calc = calculateIngredient(ingredient);
        return (
          <li
            key={ingredient.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
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
            <button
              type="button"
              onClick={() => {
                if (ingredient.id) removeIngredient(ingredient.id);
              }}
              className="shrink-0 rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
            >
              Excluir
            </button>
          </li>
        );
      })}
    </ul>
  );
}
