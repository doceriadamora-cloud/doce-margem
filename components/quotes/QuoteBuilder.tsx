"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { formatCurrency } from "@/components/pricing/pricing-formatters";
import { calculateCommercialQuoteTotals } from "@/modules/quotes";
import type { QuoteDraftItem, QuotePaymentMethod } from "@/types/quotes";
import {
  getClientsServerSnapshot,
  getClientsSnapshot,
  subscribeClients,
} from "@/components/clients/clients-store";
import {
  applyClientToDraft,
  buildSavedQuoteInput,
  clearClientFromDraft,
} from "./quote-actions";
import {
  addSavedQuote,
  getSavedQuotesServerSnapshot,
  getSavedQuotesSnapshot,
  subscribeSavedQuotes,
  updateSavedQuote,
} from "./saved-quotes-store";
import {
  createQuoteDraftItem,
  getQuoteDraftServerSnapshot,
  getQuoteDraftSnapshot,
  subscribeQuoteDraft,
  updateQuoteDraft,
} from "./quote-draft-store";
import {
  getQuoteIdentityServerSnapshot,
  getQuoteIdentitySnapshot,
  subscribeQuoteIdentity,
} from "./quote-identity-store";
import QuoteDocument, { type QuotePresentationItem } from "./QuoteDocument";

const PAYMENT_METHOD_LABELS: Record<QuotePaymentMethod, string> = {
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  cash: "Dinheiro",
  boleto: "Boleto",
  other: "Outro",
};

function parseNonNegativeNumber(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function hasInvalidNumber(value: string): boolean {
  if (value.trim() === "") return false;
  const parsed = Number(value.trim().replace(",", "."));
  return !Number.isFinite(parsed) || parsed < 0;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";

export default function QuoteBuilder() {
  const draft = useSyncExternalStore(
    subscribeQuoteDraft,
    getQuoteDraftSnapshot,
    getQuoteDraftServerSnapshot,
  );
  const identity = useSyncExternalStore(
    subscribeQuoteIdentity,
    getQuoteIdentitySnapshot,
    getQuoteIdentityServerSnapshot,
  );
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
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  /** O orçamento aberto no editor já existe no histórico? */
  const openSavedQuote =
    draft.savedQuoteId !== null
      ? (savedQuotes.find((quote) => quote.id === draft.savedQuoteId) ?? null)
      : null;

  const presentationItems: QuotePresentationItem[] = draft.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: parseNonNegativeNumber(item.quantity),
    unitPrice: parseNonNegativeNumber(item.unitPrice),
    total: 0,
  }));
  const requestedDiscount = parseNonNegativeNumber(draft.discount);
  const totals = calculateCommercialQuoteTotals(presentationItems, requestedDiscount);
  const itemsWithTotals = presentationItems.map((item, index) => ({
    ...item,
    total: totals.itemTotals[index] ?? 0,
  }));
  const discountWasLimited = requestedDiscount > totals.subtotal;
  const hasCommercialItem = presentationItems.some(
    (item) => item.description.trim() !== "" || item.unitPrice > 0,
  );

  function updateItem(itemId: string, values: Partial<Omit<QuoteDraftItem, "id">>): void {
    updateQuoteDraft({
      items: draft.items.map((item) => (item.id === itemId ? { ...item, ...values } : item)),
    });
  }

  function removeItem(itemId: string): void {
    updateQuoteDraft({ items: draft.items.filter((item) => item.id !== itemId) });
  }

  /**
   * Guarda o orçamento no histórico — Fase P0-11.
   *
   * O status é preservado ao atualizar: quem já marcou "enviado" não volta a
   * "rascunho" só por corrigir um valor. Orçamento novo nasce como rascunho.
   *
   * Só copia o que o documento comercial mostra. Custo, margem, markup e o
   * resto da precificação nunca estiveram neste rascunho — ele é comercial
   * desde a P0-4 —, então não há o que filtrar aqui.
   */
  function handleSaveQuote(): void {
    const input = buildSavedQuoteInput(draft, openSavedQuote?.status ?? "rascunho");

    if (draft.savedQuoteId !== null && openSavedQuote !== null) {
      updateSavedQuote(draft.savedQuoteId, input);
      setSaveFeedback("Orçamento atualizado no histórico.");
      return;
    }

    const id = addSavedQuote(input);
    updateQuoteDraft({ savedQuoteId: id });
    setSaveFeedback("Orçamento salvo no histórico.");
  }

  return (
    <div className="quote-builder grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="quote-print-hidden flex flex-col gap-5">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">
            Identidade visual
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Este orçamento usa a marca {identity.brandName.trim() || "Minha Fatia"}
            {identity.logoDataUrl ? " e sua logo personalizada" : " com o fallback sem logo"}.
          </p>
          <Link
            href="/configuracoes#identidade-orcamento"
            className="mt-3 inline-flex text-sm font-semibold text-rose-700 hover:underline dark:text-rose-300"
          >
            Personalizar logo, cores e contatos
          </Link>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-stone-900 dark:text-stone-50">
                Dados do orçamento
              </h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                O número é criado automaticamente para este rascunho.
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {draft.quoteNumber || "Novo orçamento"}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Data do orçamento">
              <input
                type="date"
                value={draft.quoteDate}
                onChange={(event) => updateQuoteDraft({ quoteDate: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field
              label="Validade (dias)"
              error={
                draft.validityDays.trim() !== "" &&
                (!Number.isInteger(Number(draft.validityDays)) ||
                  Number(draft.validityDays) <= 0)
                  ? "Informe um número inteiro maior que zero."
                  : undefined
              }
            >
              <input
                type="text"
                inputMode="numeric"
                value={draft.validityDays}
                onChange={(event) => updateQuoteDraft({ validityDays: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Cliente</h2>

          {/* P0-11: escolher uma cliente cadastrada preenche os contatos. Digitar
              à mão continua funcionando — nem toda encomenda vale um cadastro. */}
          <div className="mt-4">
            <Field label="Cliente cadastrada">
              <select
                value={draft.clientId ?? ""}
                onChange={(event) => {
                  const selected = clients.find((c) => c.id === event.target.value);
                  if (selected) applyClientToDraft(selected);
                  else clearClientFromDraft();
                }}
                className={inputClass}
              >
                <option value="">Preencher à mão</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.whatsapp !== "" ? " · WhatsApp" : ""}
                  </option>
                ))}
              </select>
            </Field>
            {clients.length === 0 && (
              <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                Você ainda não cadastrou clientes.{" "}
                <Link
                  href="/clientes"
                  className="font-medium text-rose-600 hover:underline dark:text-rose-400"
                >
                  Cadastrar agora
                </Link>
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <Field label="Nome do cliente">
              <input
                type="text"
                value={draft.clientName}
                onChange={(event) => updateQuoteDraft({ clientName: event.target.value })}
                placeholder="Ex.: Maria da Silva"
                className={inputClass}
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input
                type="tel"
                value={draft.clientPhone}
                onChange={(event) => updateQuoteDraft({ clientPhone: event.target.value })}
                placeholder="Ex.: (11) 99999-9999"
                className={inputClass}
              />
            </Field>
            <Field label="E-mail (opcional)">
              <input
                type="email"
                value={draft.clientEmail}
                onChange={(event) => updateQuoteDraft({ clientEmail: event.target.value })}
                placeholder="cliente@email.com"
                className={inputClass}
              />
            </Field>
            <Field label="Observações (opcional)">
              <textarea
                value={draft.notes}
                onChange={(event) => updateQuoteDraft({ notes: event.target.value })}
                placeholder="Ex.: entrega combinada para o período da manhã."
                className={inputClass + " min-h-24 resize-y"}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <h2 className="font-semibold text-stone-900 dark:text-stone-50">
              Pagamento
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Informe somente as condições comerciais que o cliente deve ver.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <Field label="Forma de pagamento">
              <select
                value={draft.paymentMethod}
                onChange={(event) =>
                  updateQuoteDraft({
                    paymentMethod: event.target.value as QuotePaymentMethod,
                  })
                }
                className={inputClass}
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Condições de pagamento / observações comerciais">
              <textarea
                value={draft.paymentTerms}
                onChange={(event) => updateQuoteDraft({ paymentTerms: event.target.value })}
                placeholder="Ex.: 50% na encomenda e 50% na entrega."
                className={inputClass + " min-h-24 resize-y"}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <h2 className="font-semibold text-stone-900 dark:text-stone-50">
              Itens do orçamento
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Digite o valor final escolhido para o cliente. Custos internos não aparecem no
              orçamento.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {draft.items.map((item, index) => {
              const quantityInvalid = hasInvalidNumber(item.quantity);
              const unitPriceInvalid = hasInvalidNumber(item.unitPrice);
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                      Item {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    <Field label="Descrição do item / produto">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(item.id, { description: event.target.value })
                        }
                        placeholder="Ex.: Bolo decorado de 2 kg"
                        className={inputClass}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Quantidade"
                        error={
                          quantityInvalid
                            ? "Use um número maior ou igual a zero."
                            : undefined
                        }
                      >
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, { quantity: event.target.value })
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field
                        label="Valor unitário (R$)"
                        error={
                          unitPriceInvalid
                            ? "Use um valor maior ou igual a zero."
                            : undefined
                        }
                      >
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, { unitPrice: event.target.value })
                          }
                          placeholder="Ex.: 150,00"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <p className="text-right text-sm text-stone-500 dark:text-stone-400">
                      Total do item:{" "}
                      <strong className="text-stone-800 dark:text-stone-200">
                        {formatCurrency(totals.itemTotals[index] ?? 0)}
                      </strong>
                    </p>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() =>
                updateQuoteDraft({ items: [...draft.items, createQuoteDraftItem()] })
              }
              className="w-fit rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
            >
              Adicionar item
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Totais</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-stone-500 dark:text-stone-400">Subtotal</dt>
              <dd className="font-semibold text-stone-900 dark:text-stone-50">
                {formatCurrency(totals.subtotal)}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <Field
              label="Desconto em R$ (opcional)"
              error={
                hasInvalidNumber(draft.discount)
                  ? "Use um valor maior ou igual a zero."
                  : discountWasLimited
                    ? "O desconto aplicado foi limitado ao valor do subtotal."
                    : undefined
              }
            >
              <input
                type="text"
                inputMode="decimal"
                value={draft.discount}
                onChange={(event) => updateQuoteDraft({ discount: event.target.value })}
                placeholder="Ex.: 10,00"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-stone-200 pt-4 dark:border-stone-700">
            <p className="font-semibold text-stone-900 dark:text-stone-50">Total final</p>
            <p className="text-xl font-semibold text-rose-700 dark:text-rose-300">
              {formatCurrency(totals.total)}
            </p>
          </div>
          <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
            O rascunho é salvo neste navegador quando o armazenamento local está disponível.
          </p>
        </section>
      </div>

      <div className="quote-preview min-w-0">
        <div className="quote-print-hidden mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
              Visualização para o cliente
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Esta versão mostra somente informações comerciais.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* P0-11: guardar no histórico. Atualiza quando o orçamento aberto
                já veio de lá; senão cria um registro novo. */}
            <button
              type="button"
              onClick={handleSaveQuote}
              disabled={!hasCommercialItem}
              className="w-fit rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
            >
              {openSavedQuote !== null ? "Salvar alterações" : "Salvar no histórico"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-fit rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              Imprimir / salvar PDF
            </button>
          </div>
        </div>

        {saveFeedback !== null && (
          <p
            role="status"
            className="quote-print-hidden mb-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {saveFeedback}
          </p>
        )}

        {!hasCommercialItem && (
          <p className="quote-print-hidden mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            Comece preenchendo o cliente e o primeiro item. A visualização abaixo é atualizada
            enquanto você digita.
          </p>
        )}

        <QuoteDocument
          draft={draft}
          identity={identity}
          paymentMethodLabel={PAYMENT_METHOD_LABELS[draft.paymentMethod]}
          items={itemsWithTotals}
          subtotal={totals.subtotal}
          discount={totals.discount}
          total={totals.total}
        />
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
