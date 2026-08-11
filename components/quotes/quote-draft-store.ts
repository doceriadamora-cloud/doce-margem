"use client";

import { loadQuoteDraft, saveQuoteDraft } from "@/services";
import type { QuoteDraft, QuoteDraftItem } from "@/types/quotes";

type Listener = () => void;

const EMPTY_QUOTE_DRAFT: QuoteDraft = {
  quoteNumber: "",
  quoteDate: "",
  validityDays: "7",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  notes: "",
  paymentMethod: "pix",
  paymentTerms: "",
  discount: "",
  items: [],
  updatedAt: "",
};

let cachedQuoteDraft: QuoteDraft | undefined;
const listeners = new Set<Listener>();

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `quote_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function generateQuoteNumber(date: Date): string {
  return `ORC-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function createQuoteDraftItem(): QuoteDraftItem {
  return {
    id: generateId(),
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

function createQuoteDraft(): QuoteDraft {
  const now = new Date();
  return {
    ...EMPTY_QUOTE_DRAFT,
    quoteNumber: generateQuoteNumber(now),
    quoteDate: formatDateInput(now),
    items: [createQuoteDraftItem()],
    updatedAt: now.toISOString(),
  };
}

function ensureLoaded(): QuoteDraft {
  if (cachedQuoteDraft === undefined) {
    cachedQuoteDraft = loadQuoteDraft() ?? createQuoteDraft();
  }
  return cachedQuoteDraft;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeQuoteDraft(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQuoteDraftSnapshot(): QuoteDraft {
  return ensureLoaded();
}

export function getQuoteDraftServerSnapshot(): QuoteDraft {
  return EMPTY_QUOTE_DRAFT;
}

export function updateQuoteDraft(
  values: Partial<Omit<QuoteDraft, "updatedAt">>,
): boolean {
  const next: QuoteDraft = {
    ...ensureLoaded(),
    ...values,
    updatedAt: new Date().toISOString(),
  };
  const persisted = saveQuoteDraft(next);
  cachedQuoteDraft = next;
  notify();
  return persisted;
}

/** Recarrega o rascunho após a importação de um backup completo. */
export function reloadQuoteDraftFromStorage(): void {
  cachedQuoteDraft = undefined;
  notify();
}
