"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { formatCurrency } from "@/components/pricing/pricing-formatters";
import { calculateCommercialQuoteTotals } from "@/modules/quotes";
import { startQuoteForClient } from "@/components/quotes/quote-actions";
import {
  getSavedQuotesServerSnapshot,
  getSavedQuotesSnapshot,
  subscribeSavedQuotes,
  unlinkClientFromSavedQuotes,
} from "@/components/quotes/saved-quotes-store";
import type { Client, SavedQuote } from "@/types/quotes";
import {
  getClientsServerSnapshot,
  getClientsSnapshot,
  removeClient,
  subscribeClients,
} from "./clients-store";

/**
 * Lista de clientes — Fase P0-11.
 *
 * Mostra o vínculo com o histórico: quantos orçamentos e qual o último. Os dois
 * são **derivados** dos orçamentos salvos na hora de renderizar; nada disso é
 * gravado na cliente, para não existir contador que possa ficar errado.
 */

function formatDate(value: string): string {
  const parts = value.split("-").map(Number);
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) return value;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

/** Total de um orçamento, recalculado a partir dos itens que ele guarda. */
function quoteTotal(quote: SavedQuote): number {
  const items = quote.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity.replace(",", ".")) || 0,
    unitPrice: Number(item.unitPrice.replace(",", ".")) || 0,
    total: 0,
  }));
  const discount = Number(quote.discount.replace(",", ".")) || 0;
  return calculateCommercialQuoteTotals(items, discount).total;
}

interface ClientListProps {
  editingId?: string | null;
  onEdit: (id: string) => void;
}

export default function ClientList({ editingId = null, onEdit }: ClientListProps) {
  const router = useRouter();
  const clients = useSyncExternalStore(
    subscribeClients,
    getClientsSnapshot,
    getClientsServerSnapshot,
  );
  const savedQuotes = useSyncExternalStore(
    subscribeSavedQuotes,
    getSavedQuotesSnapshot,
    getSavedQuotesServerSnapshot,
  );

  function handleNewQuote(client: Client): void {
    startQuoteForClient(client);
    router.push("/orcamentos");
  }

  /**
   * Excluir avisa antes o que vai acontecer com o histórico.
   *
   * Os orçamentos **não são apagados**: cada um guarda o `clientSnapshot` com
   * os dados comerciais congelados e continua legível. O que se perde é o
   * vínculo. Apagar o histórico junto com o cadastro destruiria a prova do que
   * foi combinado com a cliente.
   */
  function handleRemove(client: Client): void {
    const linked = savedQuotes.filter((quote) => quote.clientId === client.id).length;
    const aviso =
      linked === 0
        ? `Excluir a cliente "${client.name}"?`
        : linked === 1
          ? `Excluir a cliente "${client.name}"?\n\n1 orçamento continua no histórico, com os dados como estavam — só deixa de ficar vinculado a ela.`
          : `Excluir a cliente "${client.name}"?\n\n${linked} orçamentos continuam no histórico, com os dados como estavam — só deixam de ficar vinculados a ela.`;

    if (!window.confirm(aviso)) return;

    // Desvincula ANTES de remover: se a remoção falhar, o histórico não fica
    // apontando para um cadastro que sumiu.
    unlinkClientFromSavedQuotes(client.id);
    removeClient(client.id);
  }

  if (clients.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="font-medium text-stone-900 dark:text-stone-50">
          Nenhuma cliente cadastrada ainda
        </p>
        <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">
          Cadastre quem compra com você para montar orçamentos mais rápido, sem redigitar nome e
          contato toda vez.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {clients.map((client) => {
        const quotes = savedQuotes.filter((quote) => quote.clientId === client.id);
        const lastQuote = quotes[0] ?? null;
        const isEditing = client.id === editingId;

        return (
          <li
            key={client.id}
            className={`rounded-2xl border bg-white p-4 dark:bg-stone-900 ${
              isEditing
                ? "border-rose-300 ring-2 ring-rose-100 dark:border-rose-700 dark:ring-rose-950"
                : "border-stone-200 dark:border-stone-800"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-stone-900 dark:text-stone-50">{client.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-stone-500 dark:text-stone-400">
                  {client.whatsapp !== "" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      WhatsApp
                    </span>
                  )}
                  <span>{client.whatsapp || "Sem WhatsApp"}</span>
                </p>
                {client.email !== "" && (
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    {client.email}
                  </p>
                )}
                {client.address !== "" && (
                  <p className="mt-0.5 text-sm text-stone-400 dark:text-stone-500">
                    {client.address}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleNewQuote(client)}
                  className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  Novo orçamento
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(client.id)}
                  className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-rose-800 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(client)}
                  className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
                >
                  Excluir
                </button>
              </div>
            </div>

            <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-950 dark:text-stone-400">
              {quotes.length === 0 ? (
                "Nenhum orçamento salvo ainda."
              ) : (
                <>
                  {quotes.length === 1 ? "1 orçamento salvo" : `${quotes.length} orçamentos salvos`}
                  {lastQuote !== null && (
                    <>
                      {" · último em "}
                      {formatDate(lastQuote.quoteDate)}
                      {" · "}
                      <span className="font-semibold">{formatCurrency(quoteTotal(lastQuote))}</span>
                    </>
                  )}
                </>
              )}
            </p>

            {client.notes !== "" && (
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                <span className="font-medium">Observação interna:</span> {client.notes}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
