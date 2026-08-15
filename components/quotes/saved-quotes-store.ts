"use client";

/**
 * Store reativo do histórico de orçamentos — Fase P0-11.
 *
 * Mesmo padrão dos demais stores de feature. Como grava via `saveSavedQuotes`
 * → `saveAppState`, o histórico entra no backup manual e na cópia em nuvem da
 * P0-10 sem configuração adicional.
 */

import { loadSavedQuotes, saveSavedQuotes } from "@/services";
import type { SavedQuote } from "@/types/quotes";

type Listener = () => void;

const EMPTY_SAVED_QUOTES: SavedQuote[] = [];

let cachedSavedQuotes: SavedQuote[] | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): SavedQuote[] {
  if (cachedSavedQuotes === null) {
    cachedSavedQuotes = loadSavedQuotes();
  }
  return cachedSavedQuotes;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `orc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function subscribeSavedQuotes(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSavedQuotesSnapshot(): SavedQuote[] {
  return ensureLoaded();
}

export function getSavedQuotesServerSnapshot(): SavedQuote[] {
  return EMPTY_SAVED_QUOTES;
}

export function reloadSavedQuotesFromStorage(): void {
  cachedSavedQuotes = loadSavedQuotes();
  notify();
}

/** Tudo que a tela informa; id e datas ficam por conta do store. */
export type SavedQuoteInput = Omit<SavedQuote, "id" | "createdAt" | "updatedAt">;

function persist(next: SavedQuote[]): boolean {
  const persisted = saveSavedQuotes(next);
  cachedSavedQuotes = next;
  notify();
  return persisted;
}

/** Guarda um orçamento novo e devolve o id gerado. */
export function addSavedQuote(input: SavedQuoteInput): string {
  const now = new Date().toISOString();
  const quote: SavedQuote = { ...input, id: generateId(), createdAt: now, updatedAt: now };
  persist([quote, ...ensureLoaded()]);
  return quote.id;
}

/** Atualiza um orçamento já guardado, preservando `id` e `createdAt`. */
export function updateSavedQuote(id: string, input: SavedQuoteInput): boolean {
  const next = ensureLoaded().map((quote) =>
    quote.id === id
      ? { ...quote, ...input, id, createdAt: quote.createdAt, updatedAt: new Date().toISOString() }
      : quote,
  );
  return persist(next);
}

export function removeSavedQuote(id: string): boolean {
  return persist(ensureLoaded().filter((quote) => quote.id !== id));
}

/**
 * Desfaz o vínculo dos orçamentos de uma cliente que está sendo excluída.
 *
 * Os orçamentos **permanecem** — cada um já carrega o `clientSnapshot` com os
 * dados comerciais congelados no momento em que foi salvo, então continuam
 * legíveis e imprimíveis. O que se perde é só a ligação com um cadastro que
 * deixou de existir.
 *
 * Devolve quantos orçamentos foram desvinculados, para a tela conseguir dizer
 * à usuária o que vai acontecer **antes** de ela confirmar.
 */
export function unlinkClientFromSavedQuotes(clientId: string): number {
  const current = ensureLoaded();
  const affected = current.filter((quote) => quote.clientId === clientId);
  if (affected.length === 0) return 0;

  const now = new Date().toISOString();
  persist(
    current.map((quote) =>
      quote.clientId === clientId ? { ...quote, clientId: null, updatedAt: now } : quote,
    ),
  );
  return affected.length;
}

/** Quantos orçamentos estão vinculados a esta cliente. */
export function countQuotesForClient(quotes: SavedQuote[], clientId: string): number {
  return quotes.filter((quote) => quote.clientId === clientId).length;
}
