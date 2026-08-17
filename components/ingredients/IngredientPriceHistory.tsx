"use client";

import { useSyncExternalStore } from "react";
import { calculateRecipe } from "@/modules/pricing";
import {
  describeVariation,
  summarizeIngredientPrice,
  type PriceVariation,
} from "@/lib/price-history";
import { findRecipesUsingIngredient } from "@/lib/recipe-usage";
import {
  getRecipesServerSnapshot,
  getRecipesSnapshot,
  subscribeRecipes,
} from "@/components/recipes/recipes-store";
import type { Ingredient, Recipe } from "@/types/pricing";
import type { IngredientPriceSnapshot } from "@/types/price-history";
import {
  getIngredientsServerSnapshot,
  getIngredientsSnapshot,
  subscribeIngredients,
} from "./ingredients-store";
import {
  getPriceHistoryServerSnapshot,
  getPriceHistorySnapshot,
  subscribePriceHistory,
} from "./price-history-store";

/**
 * Histórico de preço e receitas afetadas — Fase P0-13.
 *
 * Recolhido por padrão, no mesmo espírito do Modo avançado da P0-9A: quem só
 * quer cadastrar ingrediente não esbarra nisso.
 *
 * Nenhum registro é criado aqui. Este componente **só lê** — a gravação
 * acontece em `ingredients-store`, na ação de salvar. Registrar em render faria
 * cada repintura da lista criar uma linha nova.
 */

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** A frase que responde "ficou mais caro?" sem a usuária ler tabela. */
function variationHeadline(variation: PriceVariation, ingredientName: string): {
  text: string;
  tone: "increase" | "decrease" | "neutral";
} {
  switch (variation.kind) {
    case "increase":
      return {
        tone: "increase",
        text: `Esse ingrediente ficou ${formatPercent(variation.percent)} mais caro desde o último registro. Revise as receitas que usam ${ingredientName} antes de vender novamente.`,
      };
    case "decrease":
      return {
        tone: "decrease",
        text: `Esse ingrediente ficou ${formatPercent(variation.percent)} mais barato desde o último registro.`,
      };
    case "stable":
      return { tone: "neutral", text: "Sem variação relevante no preço." };
    case "first":
      return {
        tone: "neutral",
        text: "Primeiro registro de preço. As próximas alterações vão aparecer aqui.",
      };
    case "unknown":
      return {
        tone: "neutral",
        text: "Não foi possível comparar com o registro anterior.",
      };
  }
}

const TONE_CLASS = {
  increase: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  decrease: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  neutral: "bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400",
} as const;

interface IngredientPriceHistoryProps {
  ingredient: Ingredient;
}

export default function IngredientPriceHistory({ ingredient }: IngredientPriceHistoryProps) {
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

  const ingredientId = ingredient.id ?? "";
  const { entries, variation } = summarizeIngredientPrice(history, ingredientId);
  const affected = findRecipesUsingIngredient(ingredientId, recipes);
  const headline = variationHeadline(variation, ingredient.name);

  const ingredientsById: Record<string, Ingredient> = {};
  for (const item of ingredients) {
    if (item.id) ingredientsById[item.id] = item;
  }
  const recipesById: Record<string, Recipe> = {};
  for (const recipe of recipes) recipesById[recipe.id] = recipe;

  return (
    <details className="group mt-3 rounded-xl border border-stone-200 bg-stone-50/60 open:bg-white dark:border-stone-700 dark:bg-stone-950/40 dark:open:bg-stone-950">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">
        <span
          aria-hidden="true"
          className="shrink-0 text-xs text-stone-400 transition-transform group-open:rotate-90 dark:text-stone-500"
        >
          ▶
        </span>
        <span className="font-medium text-stone-700 dark:text-stone-300">Ver histórico</span>
        {variation.kind === "increase" && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            +{formatPercent(variation.percent)}
          </span>
        )}
        {variation.kind === "decrease" && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            −{formatPercent(variation.percent)}
          </span>
        )}
        <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">
          {entries.length === 1 ? "1 registro" : `${entries.length} registros`}
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-stone-200 px-3 py-4 dark:border-stone-800">
        <p className={`rounded-lg px-3 py-2 text-sm leading-6 ${TONE_CLASS[headline.tone]}`}>
          {headline.text}
        </p>

        {entries.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Ainda não há registros. O histórico começa no próximo salvamento com mudança de preço.
          </p>
        ) : (
          <div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Registros de preço
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {entries.map((snapshot, index) => {
                // Cada linha compara com a IMEDIATAMENTE anterior no tempo —
                // como a lista vem do mais novo para o mais antigo, a anterior
                // é a próxima da lista.
                const anterior: IngredientPriceSnapshot | null = entries[index + 1] ?? null;
                const linha = describeVariation(snapshot, anterior);
                return (
                  <li
                    key={snapshot.id}
                    className="flex flex-wrap items-baseline gap-x-2 rounded-lg bg-white px-3 py-2 text-sm dark:bg-stone-900"
                  >
                    <span className="text-stone-500 dark:text-stone-400">
                      {formatDate(snapshot.date)}
                    </span>
                    <span className="text-stone-700 dark:text-stone-300">
                      {formatCurrency(snapshot.purchasePrice)} / {snapshot.purchaseQuantity}{" "}
                      {snapshot.purchaseUnit}
                    </span>
                    {snapshot.unitCost !== null && (
                      <span className="font-medium text-stone-800 dark:text-stone-200">
                        {formatCurrency(snapshot.unitCost)}/{snapshot.baseUnit}
                      </span>
                    )}
                    {linha.kind === "increase" && (
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        +{formatPercent(linha.percent)}
                      </span>
                    )}
                    {linha.kind === "decrease" && (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        −{formatPercent(linha.percent)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Receitas que usam este ingrediente
          </p>
          {affected.length === 0 ? (
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Nenhuma receita usa este ingrediente ainda.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {affected.map(({ recipe, usage }) => {
                const calc = calculateRecipe(recipe, ingredientsById, recipesById);
                return (
                  <li
                    key={recipe.id}
                    className="rounded-lg bg-white px-3 py-2 text-sm dark:bg-stone-900"
                  >
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="font-medium text-stone-800 dark:text-stone-200">
                        {recipe.name}
                      </span>
                      {usage === "indirect" && (
                        // O caso que a usuária esqueceria sozinha: o chocolate
                        // não aparece na lista de itens desta receita.
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                          via sub-receita
                        </span>
                      )}
                    </span>
                    {calc.ok ? (
                      <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                        Custo atual: {formatCurrency(calc.value.totalCostWithLoss)} ·{" "}
                        {formatCurrency(calc.value.unitCost)}/{recipe.yieldUnit}
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">
                        Não foi possível calcular o custo desta receita agora.
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {affected.length > 0 && (
            <p className="mt-2 text-xs leading-5 text-stone-400 dark:text-stone-500">
              Os custos acima já usam o preço atual. Orçamentos e preços que você já salvou
              continuam como estavam — revise-os se quiser aplicar o novo custo.
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
