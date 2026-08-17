"use client";

/**
 * Qual orçamento está sendo compartilhado — Fase P0-12.
 *
 * Existe como store, e não como estado de componente, porque dois lugares
 * abrem o mesmo painel: o editor e o histórico. Com estado local, ou o painel
 * seria duplicado (dois diálogos concorrendo pela mesma tela) ou o histórico
 * precisaria conversar com o editor por props através da página.
 *
 * Mesmo padrão dos demais stores de feature. Nada aqui é persistido: é estado
 * de tela, morre ao recarregar.
 */

type Listener = () => void;

/** O que o painel de compartilhamento precisa saber. */
export interface QuoteShareTarget {
  /** Nome que entra na saudação. */
  clientName: string;
  /** Número como a usuária digitou; a normalização é do `lib/whatsapp.ts`. */
  whatsapp: string;
  /** Número do orçamento, quando houver. */
  quoteNumber: string;
  /** Orçamento no histórico, ou `null` para um rascunho ainda não salvo. */
  savedQuoteId: string | null;
}

let currentTarget: QuoteShareTarget | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeQuoteShare(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQuoteShareSnapshot(): QuoteShareTarget | null {
  return currentTarget;
}

/** Fechado no servidor e na primeira pintura — referência estável. */
export function getQuoteShareServerSnapshot(): QuoteShareTarget | null {
  return null;
}

export function openQuoteShare(target: QuoteShareTarget): void {
  currentTarget = target;
  notify();
}

export function closeQuoteShare(): void {
  if (currentTarget === null) return;
  currentTarget = null;
  notify();
}
