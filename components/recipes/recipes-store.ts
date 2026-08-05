"use client";

/**
 * Store reativo de receitas — Fase 2-4. Mesmo padrão de
 * `components/ingredients/ingredients-store.ts` (ver DECISIONS.md,
 * "Store reativo por feature"): cache de módulo + assinantes + funções de
 * escrita que gravam via `@/services` e notificam.
 *
 * Fica em `components/recipes/` (não em `services/`) pelo mesmo motivo do
 * store de ingredientes: depende de conceitos de React (assinantes) e do
 * navegador (`crypto.randomUUID`).
 */

import { loadRecipes, saveRecipes } from "@/services";
import type { Recipe } from "@/types/pricing";

type Listener = () => void;

/** Referência estável usada como snapshot do servidor / antes da hidratação. */
const EMPTY_RECIPES: Recipe[] = [];

let cachedRecipes: Recipe[] | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): Recipe[] {
  if (cachedRecipes === null) {
    cachedRecipes = loadRecipes();
  }
  return cachedRecipes;
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/** Assina mudanças na lista de receitas (contrato exigido por `useSyncExternalStore`). */
export function subscribeRecipes(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Snapshot atual (lê do storage na primeira chamada, depois usa o cache). */
export function getRecipesSnapshot(): Recipe[] {
  return ensureLoaded();
}

/** Snapshot usado no servidor e na primeira pintura do cliente (evita mismatch de hidratação). */
export function getRecipesServerSnapshot(): Recipe[] {
  return EMPTY_RECIPES;
}

/** Recarrega o cache a partir do storage após uma importação completa de backup. */
export function reloadRecipesFromStorage(): void {
  cachedRecipes = loadRecipes();
  notify();
}

/**
 * Adiciona uma receita (já validada por quem chama) e persiste. O id sempre é
 * gerado aqui — quem chama não precisa se preocupar em inventar um id único.
 */
export function addRecipe(recipe: Recipe): boolean {
  const withId: Recipe = { ...recipe, id: generateId() };
  const next = [...ensureLoaded(), withId];
  const persisted = saveRecipes(next);
  cachedRecipes = next;
  notify();
  return persisted;
}

/** Remove uma receita pelo id e persiste. */
export function removeRecipe(id: string): boolean {
  const next = ensureLoaded().filter((item) => item.id !== id);
  const persisted = saveRecipes(next);
  cachedRecipes = next;
  notify();
  return persisted;
}

/** Atualiza uma receita existente (já validada por quem chama) e persiste. O id original é preservado. */
export function updateRecipe(id: string, updated: Recipe): boolean {
  const next = ensureLoaded().map((item) => (item.id === id ? { ...updated, id } : item));
  const persisted = saveRecipes(next);
  cachedRecipes = next;
  notify();
  return persisted;
}
