"use client";

/**
 * Store reativo de canais customizados — Fase 2-5 (leitura) + Fase 2-6 (CRUD).
 *
 * Nasceu na Fase 2-5 só leitura (a tela de precificação precisava listar
 * `customChannels`, mas ainda não existia CRUD de canais). Agora que a Fase 2-6
 * cria o CRUD, ganha `addCustomChannel`/`removeCustomChannel` — exatamente como
 * o `DECISIONS.md` da Fase 2-5 já previa: "quando existir CRUD de canais, ele
 * ganha as funções de escrita nesse MESMO arquivo, sem precisar mover nada."
 * Mesmo padrão de `ingredients-store.ts`/`recipes-store.ts`/`fixed-costs-store.ts`
 * (ver DECISIONS.md, "Store reativo por feature").
 */

import { loadCustomChannels, saveCustomChannels } from "@/services";
import type { SalesChannel } from "@/types/pricing";

type Listener = () => void;

/** Referência estável usada como snapshot do servidor / antes da hidratação. */
const EMPTY_CUSTOM_CHANNELS: SalesChannel[] = [];

let cachedCustomChannels: SalesChannel[] | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): SalesChannel[] {
  if (cachedCustomChannels === null) {
    cachedCustomChannels = loadCustomChannels();
  }
  return cachedCustomChannels;
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
  return `chn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/** Assina mudanças na lista de canais customizados (contrato exigido por `useSyncExternalStore`). */
export function subscribeCustomChannels(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Snapshot atual (lê do storage na primeira chamada, depois usa o cache). */
export function getCustomChannelsSnapshot(): SalesChannel[] {
  return ensureLoaded();
}

/** Snapshot usado no servidor e na primeira pintura do cliente. */
export function getCustomChannelsServerSnapshot(): SalesChannel[] {
  return EMPTY_CUSTOM_CHANNELS;
}

/** Recarrega o cache a partir do storage após uma importação completa de backup. */
export function reloadCustomChannelsFromStorage(): void {
  cachedCustomChannels = loadCustomChannels();
  notify();
}

/** Adiciona um canal customizado (já validado por quem chama) e persiste. O id sempre é gerado aqui. */
export function addCustomChannel(channel: SalesChannel): boolean {
  const withId: SalesChannel = { ...channel, id: generateId() };
  const next = [...ensureLoaded(), withId];
  const persisted = saveCustomChannels(next);
  cachedCustomChannels = next;
  notify();
  return persisted;
}

/** Remove um canal customizado pelo id e persiste. */
export function removeCustomChannel(id: string): boolean {
  const next = ensureLoaded().filter((item) => item.id !== id);
  const persisted = saveCustomChannels(next);
  cachedCustomChannels = next;
  notify();
  return persisted;
}

/** Atualiza um canal customizado existente (já validado por quem chama) e persiste. O id original é preservado. */
export function updateCustomChannel(id: string, updated: SalesChannel): boolean {
  const next = ensureLoaded().map((item) => (item.id === id ? { ...updated, id } : item));
  const persisted = saveCustomChannels(next);
  cachedCustomChannels = next;
  notify();
  return persisted;
}
