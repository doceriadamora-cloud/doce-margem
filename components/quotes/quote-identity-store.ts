"use client";

import { loadQuoteIdentity, saveQuoteIdentity } from "@/services";
import {
  DEFAULT_QUOTE_PRIMARY_COLOR,
  DEFAULT_QUOTE_SECONDARY_COLOR,
  type QuoteIdentity,
} from "@/types/quotes";

type Listener = () => void;

const EMPTY_QUOTE_IDENTITY: QuoteIdentity = {
  brandName: "",
  logoDataUrl: null,
  primaryColor: DEFAULT_QUOTE_PRIMARY_COLOR,
  secondaryColor: DEFAULT_QUOTE_SECONDARY_COLOR,
  whatsapp: "",
  instagram: "",
  email: "",
  address: "",
  defaultCommercialTerms: "",
  updatedAt: "",
};

let cachedQuoteIdentity: QuoteIdentity | undefined;
const listeners = new Set<Listener>();

function ensureLoaded(): QuoteIdentity {
  if (cachedQuoteIdentity === undefined) {
    cachedQuoteIdentity = loadQuoteIdentity();
  }
  return cachedQuoteIdentity;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeQuoteIdentity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQuoteIdentitySnapshot(): QuoteIdentity {
  return ensureLoaded();
}

export function getQuoteIdentityServerSnapshot(): QuoteIdentity {
  return EMPTY_QUOTE_IDENTITY;
}

export function updateQuoteIdentity(
  values: Partial<Omit<QuoteIdentity, "updatedAt">>,
): boolean {
  const next: QuoteIdentity = {
    ...ensureLoaded(),
    ...values,
    updatedAt: new Date().toISOString(),
  };
  const persisted = saveQuoteIdentity(next);
  cachedQuoteIdentity = next;
  notify();
  return persisted;
}

/** Recarrega a identidade após a importação de um backup completo. */
export function reloadQuoteIdentityFromStorage(): void {
  cachedQuoteIdentity = undefined;
  notify();
}
