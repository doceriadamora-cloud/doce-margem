"use client";

import { useSyncExternalStore } from "react";
import { formatCurrency } from "@/components/pricing/pricing-formatters";
import { calculateCommercialQuoteTotals } from "@/modules/quotes";
import type { SavedQuote, SavedQuoteStatus } from "@/types/quotes";
import { duplicateSavedQuoteInDraft, openSavedQuoteInDraft } from "./quote-actions";
import {
  getQuoteDraftServerSnapshot,
  getQuoteDraftSnapshot,
  subscribeQuoteDraft,
} from "./quote-draft-store";
import {
  getSavedQuotesServerSnapshot,
  getSavedQuotesSnapshot,
  removeSavedQuote,
  subscribeSavedQuotes,
  updateSavedQuote,
} from "./saved-quotes-store";

/**
 * Histórico de orçamentos — Fase P0-11.
 *
 * Abrir, duplicar e excluir agem sobre o mesmo rascunho que o editor lê, então
 * a tela acima reage sozinha: os dois componentes assinam o mesmo store.
 *
 * O total de cada linha é **recalculado** a partir dos itens guardados, com a
 * mesma função pura do editor. Nada de total gravado que possa divergir dos
 * itens que o originaram (DECISIONS.md, Fase 2-6).
 */

const STATUS_LABEL: Record<SavedQuoteStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const STATUS_CLASS: Record<SavedQuoteStatus, string> = {
  rascunho: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  enviado: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  aprovado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  recusado: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

const STATUS_ORDER: readonly SavedQuoteStatus[] = [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
];

function formatDate(value: string): string {
  const parts = value.split("-").map(Number);
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) return value || "—";
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

/** Mesma conversão de texto para número usada no editor. */
function toNumber(value: string): number {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function quoteTotal(quote: SavedQuote): number {
  const items = quote.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unitPrice),
    total: 0,
  }));
  return calculateCommercialQuoteTotals(items, toNumber(quote.discount)).total;
}

export default function SavedQuotesList() {
  const savedQuotes = useSyncExternalStore(
    subscribeSavedQuotes,
    getSavedQuotesSnapshot,
    getSavedQuotesServerSnapshot,
  );
  const draft = useSyncExternalStore(
    subscribeQuoteDraft,
    getQuoteDraftSnapshot,
    getQuoteDraftServerSnapshot,
  );

  function handleRemove(quote: SavedQuote): void {
    const nome = quote.clientSnapshot.name.trim() || "sem cliente";
    if (!window.confirm(`Excluir o orçamento ${quote.quoteNumber} (${nome})?`)) return;
    removeSavedQuote(quote.id);
  }

  if (savedQuotes.length === 0) {
    return (
      <section className="quote-print-hidden mt-10">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          Orçamentos salvos
        </h2>
        <p className="mt-2 rounded-2xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          Nenhum orçamento salvo ainda. Monte um acima e use{" "}
          <strong className="font-medium text-stone-700 dark:text-stone-300">
            Salvar no histórico
          </strong>{" "}
          para consultar ou reaproveitar depois.
        </p>
      </section>
    );
  }

  return (
    <section className="quote-print-hidden mt-10">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
        Orçamentos salvos
      </h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Abrir carrega o orçamento no editor acima. Duplicar cria um novo, com número e data de
        hoje.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {savedQuotes.map((quote) => {
          const isOpen = quote.id === draft.savedQuoteId;
          return (
            <li
              key={quote.id}
              className={`rounded-2xl border bg-white p-4 dark:bg-stone-900 ${
                isOpen
                  ? "border-rose-300 ring-2 ring-rose-100 dark:border-rose-700 dark:ring-rose-950"
                  : "border-stone-200 dark:border-stone-800"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900 dark:text-stone-50">
                      {quote.quoteNumber || "Sem número"}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[quote.status]}`}
                    >
                      {STATUS_LABEL[quote.status]}
                    </span>
                    {isOpen && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        aberto no editor
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    {quote.clientSnapshot.name.trim() || "Cliente não informada"}
                    {" · "}
                    {formatDate(quote.quoteDate)}
                    {" · "}
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {formatCurrency(quoteTotal(quote))}
                    </span>
                  </p>
                  {quote.clientId === null && quote.clientSnapshot.name.trim() !== "" && (
                    <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
                      Sem vínculo com cliente cadastrada
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openSavedQuoteInDraft(quote)}
                    className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateSavedQuoteInDraft(quote)}
                    className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-rose-800 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(quote)}
                    className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="font-medium">Situação:</span>
                <select
                  value={quote.status}
                  onChange={(event) =>
                    updateSavedQuote(quote.id, {
                      ...quote,
                      status: event.target.value as SavedQuoteStatus,
                    })
                  }
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 outline-none focus:border-rose-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
                >
                  {STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
