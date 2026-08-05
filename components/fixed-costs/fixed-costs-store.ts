"use client";

/**
 * Store reativo de custos fixos — Fase 2-6. Mesmo padrão de
 * `components/ingredients/ingredients-store.ts` (ver DECISIONS.md, "Store
 * reativo por feature"): cache de módulo + assinantes + funções de escrita que
 * gravam via `@/services` e notificam.
 */

import { loadFixedCosts, saveFixedCosts } from "@/services";
import type { FixedCost } from "@/types/pricing";

type Listener = () => void;

/** Referência estável usada como snapshot do servidor / antes da hidratação. */
const EMPTY_FIXED_COSTS: FixedCost[] = [];

let cachedFixedCosts: FixedCost[] | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): FixedCost[] {
  if (cachedFixedCosts === null) {
    cachedFixedCosts = loadFixedCosts();
  }
  return cachedFixedCosts;
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
  return `fix_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/** Assina mudanças na lista de custos fixos (contrato exigido por `useSyncExternalStore`). */
export function subscribeFixedCosts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Snapshot atual (lê do storage na primeira chamada, depois usa o cache). */
export function getFixedCostsSnapshot(): FixedCost[] {
  return ensureLoaded();
}

/** Snapshot usado no servidor e na primeira pintura do cliente (evita mismatch de hidratação). */
export function getFixedCostsServerSnapshot(): FixedCost[] {
  return EMPTY_FIXED_COSTS;
}

/** Recarrega o cache a partir do storage após uma importação completa de backup. */
export function reloadFixedCostsFromStorage(): void {
  cachedFixedCosts = loadFixedCosts();
  notify();
}

/** Adiciona um custo fixo (já validado por quem chama) e persiste. O id sempre é gerado aqui. */
export function addFixedCost(cost: FixedCost): boolean {
  const withId: FixedCost = { ...cost, id: generateId() };
  const next = [...ensureLoaded(), withId];
  const persisted = saveFixedCosts(next);
  cachedFixedCosts = next;
  notify();
  return persisted;
}

/** Remove um custo fixo pelo id e persiste. */
export function removeFixedCost(id: string): boolean {
  const next = ensureLoaded().filter((item) => item.id !== id);
  const persisted = saveFixedCosts(next);
  cachedFixedCosts = next;
  notify();
  return persisted;
}

/** Atualiza um custo fixo existente (já validado por quem chama) e persiste. O id original é preservado. */
export function updateFixedCost(id: string, updated: FixedCost): boolean {
  const next = ensureLoaded().map((item) => (item.id === id ? { ...updated, id } : item));
  const persisted = saveFixedCosts(next);
  cachedFixedCosts = next;
  notify();
  return persisted;
}
