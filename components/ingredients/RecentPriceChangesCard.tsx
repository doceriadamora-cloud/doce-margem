"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { listRecentPriceIncreases, RECENT_PRICE_CHANGE_DAYS } from "@/lib/price-history";
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
 * "Ingredientes com mudança de preço" no Painel — Fase P0-13.
 *
 * Só **aumentos**, e só dos últimos 30 dias. Queda de preço é boa notícia e não
 * precisa de card; aumento antigo já foi resolvido ou já virou rotina.
 *
 * Some por completo quando não há nada a dizer — card vazio no Painel é ruído
 * permanente para quem nunca mexeu em preço.
 */
export default function RecentPriceChangesCard() {
  const history = useSyncExternalStore(
    subscribePriceHistory,
    getPriceHistorySnapshot,
    getPriceHistoryServerSnapshot,
  );
  const ingredients = useSyncExternalStore(
    subscribeIngredients,
    getIngredientsSnapshot,
    getIngredientsServerSnapshot,
  );

  const aumentos = listRecentPriceIncreases(history).slice(0, 4);
  if (aumentos.length === 0) return null;

  const nomePor = (id: string): string =>
    ingredients.find((item) => item.id === id)?.name ?? "Ingrediente removido";

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
      <h2 className="text-base font-semibold text-amber-900 dark:text-amber-100">
        Ingredientes com mudança de preço
      </h2>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
        Ficaram mais caros nos últimos {RECENT_PRICE_CHANGE_DAYS} dias. Vale revisar as receitas
        que usam esses itens antes de vender de novo.
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {aumentos.map((aumento) => (
          <li key={aumento.ingredientId} className="text-sm text-amber-900 dark:text-amber-200">
            <span className="font-medium">{nomePor(aumento.ingredientId)}</span>
            {" — "}
            <span className="font-semibold">
              +{aumento.percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/ingredientes"
        className="mt-3 inline-flex text-sm font-semibold text-amber-900 underline underline-offset-2 dark:text-amber-100"
      >
        Revisar ingredientes
      </Link>
    </section>
  );
}
