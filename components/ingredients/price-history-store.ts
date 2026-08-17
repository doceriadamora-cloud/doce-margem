"use client";

/**
 * Store reativo do histórico de preço — Fase P0-13.
 *
 * Mesmo padrão dos demais stores de feature. Como grava via
 * `saveIngredientPriceHistory` → `saveAppState`, o histórico entra no backup
 * manual e na cópia em nuvem da P0-10 sem configuração adicional.
 *
 * **Não importa `ingredients-store`.** A dependência é de mão única — o store de
 * ingredientes chama este ao salvar — e inverter isso criaria um ciclo entre
 * dois módulos que gravam no mesmo `AppState`.
 */

import { loadIngredientPriceHistory, saveIngredientPriceHistory } from "@/services";
import { calculateIngredient } from "@/modules/pricing";
import { isSameAsLatest, trimHistoryForIngredient } from "@/lib/price-history";
import type { Ingredient } from "@/types/pricing";
import type { IngredientPriceSnapshot } from "@/types/price-history";

type Listener = () => void;

const EMPTY_HISTORY: IngredientPriceSnapshot[] = [];

let cachedHistory: IngredientPriceSnapshot[] | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): IngredientPriceSnapshot[] {
  if (cachedHistory === null) {
    cachedHistory = loadIngredientPriceHistory();
  }
  return cachedHistory;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `prc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function subscribePriceHistory(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPriceHistorySnapshot(): IngredientPriceSnapshot[] {
  return ensureLoaded();
}

export function getPriceHistoryServerSnapshot(): IngredientPriceSnapshot[] {
  return EMPTY_HISTORY;
}

export function reloadPriceHistoryFromStorage(): void {
  cachedHistory = loadIngredientPriceHistory();
  notify();
}

function persist(next: IngredientPriceSnapshot[]): boolean {
  const persisted = saveIngredientPriceHistory(next);
  cachedHistory = next;
  notify();
  return persisted;
}

/**
 * Registra o preço atual de um ingrediente — **só em ação de salvar**.
 *
 * Nunca é chamada em render nem em cálculo: fosse, cada repintura da lista
 * criaria uma linha nova e o histórico viraria lixo em segundos.
 *
 * Devolve `false` quando nada foi gravado, o que acontece quando o registro
 * repetiria o último — segunda barreira contra duplicata, além da checagem de
 * campos relevantes feita por quem chama.
 */
export function recordIngredientPrice(ingredient: Ingredient): boolean {
  if (!ingredient.id) return false;

  // O custo vem do domínio, não de uma conta reescrita aqui. Ingrediente que
  // não calcula ainda gera registro, com `unitCost: null` — o preço mudou de
  // qualquer forma, e esconder isso seria pior.
  const calc = calculateIngredient(ingredient);
  const candidate = {
    ingredientId: ingredient.id,
    purchaseQuantity: ingredient.purchaseQuantity,
    purchaseUnit: ingredient.purchaseUnit,
    purchasePrice: ingredient.purchasePrice,
    baseUnit: ingredient.baseUnit,
    unitCost: calc.ok ? calc.value.costPerBaseUnit : null,
    correctionFactor: ingredient.correctionFactor ?? 1,
    source: "manual" as const,
  };

  const current = ensureLoaded();
  const doIngrediente = current
    .filter((snapshot) => snapshot.ingredientId === ingredient.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (isSameAsLatest(doIngrediente[0] ?? null, candidate)) return false;

  const snapshot: IngredientPriceSnapshot = {
    ...candidate,
    id: generateId(),
    date: new Date().toISOString(),
  };

  persist(trimHistoryForIngredient([...current, snapshot], ingredient.id));
  return true;
}

/**
 * Apaga o histórico de um ingrediente que deixou de existir.
 *
 * Diferente da P0-11, onde excluir uma cliente **preserva** os orçamentos: lá o
 * orçamento é um documento com valor próprio, que continua legível sozinho.
 * Aqui o registro só existe em função do ingrediente — sem ele, não há onde
 * mostrar nem o que fazer com a informação, e ela cresceria para sempre.
 */
export function removeHistoryForIngredient(ingredientId: string): number {
  const current = ensureLoaded();
  const restante = current.filter((snapshot) => snapshot.ingredientId !== ingredientId);
  const removidos = current.length - restante.length;
  if (removidos > 0) persist(restante);
  return removidos;
}

/** Quantos registros existem para este ingrediente. */
export function countHistoryForIngredient(
  history: IngredientPriceSnapshot[],
  ingredientId: string,
): number {
  return history.filter((snapshot) => snapshot.ingredientId === ingredientId).length;
}
