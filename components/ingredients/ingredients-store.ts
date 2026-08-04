"use client";

/**
 * Store reativo de ingredientes — Fase 2-3. Ponte entre o storageService
 * (persistência pura, `@/services`) e `useSyncExternalStore` (React).
 *
 * Por que existe: telas que ESCREVEM (adicionam/excluem) precisam de uma
 * referência estável em `getSnapshot` MAIS um `subscribe` real, para o
 * `useSyncExternalStore` saber quando avisar o React de uma mudança. Este
 * módulo é exatamente isso: cache + lista de assinantes + funções que gravam no
 * storageService e notificam. O `Dashboard` também lê daqui (revisão da Fase 2),
 * justamente para as contagens dele reagirem a cadastros feitos nesta tela.
 *
 * Fica em `components/ingredients/` (não em `services/`) de propósito: depende
 * de conceitos de React (assinantes) e do navegador (`crypto.randomUUID`), algo
 * que `services/storage-service.ts` deliberadamente não tem — aquele arquivo
 * continua puro I/O de storage, seguro para rodar em qualquer contexto.
 */

import { loadIngredients, saveIngredients } from "@/services";
import type { Ingredient } from "@/types/pricing";

type Listener = () => void;

/** Referência estável usada como snapshot do servidor / antes da hidratação. */
const EMPTY_INGREDIENTS: Ingredient[] = [];

let cachedIngredients: Ingredient[] | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): Ingredient[] {
  if (cachedIngredients === null) {
    cachedIngredients = loadIngredients();
  }
  return cachedIngredients;
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Gera um id sem depender de nenhuma biblioteca nova. */
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/** Assina mudanças na lista de ingredientes (contrato exigido por `useSyncExternalStore`). */
export function subscribeIngredients(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Snapshot atual (lê do storage na primeira chamada, depois usa o cache). */
export function getIngredientsSnapshot(): Ingredient[] {
  return ensureLoaded();
}

/** Snapshot usado no servidor e na primeira pintura do cliente (evita mismatch de hidratação). */
export function getIngredientsServerSnapshot(): Ingredient[] {
  return EMPTY_INGREDIENTS;
}

/**
 * Adiciona um ingrediente (já validado por quem chama) e persiste.
 * Atualiza o cache/notifica mesmo se a gravação falhar (ex.: storage
 * indisponível) — a usuária continua vendo o que cadastrou nesta sessão; o
 * aviso de storage indisponível (mesmo padrão do Dashboard) informa que não
 * vai persistir.
 */
export function addIngredient(ingredient: Ingredient): boolean {
  const withId: Ingredient = { ...ingredient, id: ingredient.id ?? generateId() };
  const next = [...ensureLoaded(), withId];
  const persisted = saveIngredients(next);
  cachedIngredients = next;
  notify();
  return persisted;
}

/** Remove um ingrediente pelo id e persiste. */
export function removeIngredient(id: string): boolean {
  const next = ensureLoaded().filter((item) => item.id !== id);
  const persisted = saveIngredients(next);
  cachedIngredients = next;
  notify();
  return persisted;
}
