"use client";

/**
 * Store reativo de clientes — Fase P0-11. Mesmo padrão dos demais stores de
 * feature (ver DECISIONS.md, "Store reativo por feature"): cache de módulo,
 * assinantes e escritas que gravam via `@/services` e notificam.
 *
 * Como toda escrita passa por `saveClients` → `saveAppState`, os clientes
 * entram automaticamente no backup manual e na cópia em nuvem da P0-10, sem
 * uma linha a mais em nenhum dos dois.
 */

import { loadClients, saveClients } from "@/services";
import type { Client } from "@/types/quotes";

type Listener = () => void;

/** Referência estável usada como snapshot do servidor / antes da hidratação. */
const EMPTY_CLIENTS: Client[] = [];

let cachedClients: Client[] | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): Client[] {
  if (cachedClients === null) {
    cachedClients = loadClients();
  }
  return cachedClients;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function subscribeClients(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClientsSnapshot(): Client[] {
  return ensureLoaded();
}

export function getClientsServerSnapshot(): Client[] {
  return EMPTY_CLIENTS;
}

/** Recarrega o cache após importação de backup ou hidratação vinda da nuvem. */
export function reloadClientsFromStorage(): void {
  cachedClients = loadClients();
  notify();
}

/** Dados que a tela informa; id e datas são responsabilidade do store. */
export type ClientInput = Pick<
  Client,
  "name" | "whatsapp" | "email" | "address" | "notes"
>;

export function addClient(input: ClientInput): boolean {
  const now = new Date().toISOString();
  const client: Client = { ...input, id: generateId(), createdAt: now, updatedAt: now };
  const next = [...ensureLoaded(), client];
  const persisted = saveClients(next);
  cachedClients = next;
  notify();
  return persisted;
}

/** Atualiza uma cliente existente. `id` e `createdAt` são preservados. */
export function updateClient(id: string, input: ClientInput): boolean {
  const next = ensureLoaded().map((client) =>
    client.id === id
      ? { ...client, ...input, id, updatedAt: new Date().toISOString() }
      : client,
  );
  const persisted = saveClients(next);
  cachedClients = next;
  notify();
  return persisted;
}

/**
 * Remove uma cliente.
 *
 * **Não apaga orçamento nenhum.** Quem chama é responsável por desvincular os
 * orçamentos salvos antes (ver `unlinkClientFromSavedQuotes`); eles guardam um
 * `clientSnapshot` próprio e continuam legíveis depois disso. Apagar o
 * histórico comercial junto com um cadastro seria destruir a prova do que foi
 * combinado com a cliente.
 */
export function removeClient(id: string): boolean {
  const next = ensureLoaded().filter((client) => client.id !== id);
  const persisted = saveClients(next);
  cachedClients = next;
  notify();
  return persisted;
}
