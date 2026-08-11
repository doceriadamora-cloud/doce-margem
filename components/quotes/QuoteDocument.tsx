import Image from "next/image";
import type { CSSProperties } from "react";
import { formatCurrency } from "@/components/pricing/pricing-formatters";
import { createQuoteColorTheme } from "@/components/quotes/quote-identity-utils";
import type { QuoteDraft, QuoteIdentity } from "@/types/quotes";

export interface QuotePresentationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteDocumentProps {
  draft: QuoteDraft;
  identity: QuoteIdentity;
  paymentMethodLabel: string;
  items: QuotePresentationItem[];
  subtotal: number;
  discount: number;
  total: number;
}

function parseDateInput(value: string): Date | null {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDate(value: string): string {
  const date = parseDateInput(value);
  return date
    ? date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Não informada";
}

function formatValidity(quoteDate: string, validityDays: string): string {
  const date = parseDateInput(quoteDate);
  const days = Number(validityDays);
  if (!date || !Number.isInteger(days) || days <= 0) return "Não informada";
  const expiresAt = new Date(date);
  expiresAt.setDate(expiresAt.getDate() + days);
  return (
    String(days) +
    " " +
    (days === 1 ? "dia" : "dias") +
    " — até " +
    expiresAt.toLocaleDateString("pt-BR")
  );
}

function formatQuantity(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default function QuoteDocument({
  draft,
  identity,
  paymentMethodLabel,
  items,
  subtotal,
  discount,
  total,
}: QuoteDocumentProps) {
  const visibleItems = items.filter(
    (item) => item.description.trim() !== "" || item.unitPrice > 0,
  );
  const displayBrandName = identity.brandName.trim() || "Minha Fatia";
  const commercialTerms =
    draft.paymentTerms.trim() || identity.defaultCommercialTerms.trim();
  const theme = createQuoteColorTheme(identity.primaryColor, identity.secondaryColor);
  const quoteStyle = {
    "--quote-primary": theme.primary,
    "--quote-primary-text": theme.primaryText,
    "--quote-on-primary": theme.onPrimary,
    "--quote-secondary": theme.secondary,
    "--quote-secondary-tint": theme.secondaryTint,
    "--quote-on-secondary-tint": theme.onSecondaryTint,
  } as CSSProperties;

  return (
    <article
      className="quote-print-document rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm sm:p-8 dark:border-stone-700 dark:bg-white dark:text-stone-950"
      aria-label={"Orçamento " + (draft.quoteNumber || "sem número")}
      style={quoteStyle}
    >
      <header className="quote-document-header flex flex-col gap-5 border-b-4 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          {identity.logoDataUrl && (
            <Image
              unoptimized
              src={identity.logoDataUrl}
              alt={`Logo de ${displayBrandName}`}
              width={288}
              height={144}
              className="h-20 w-32 shrink-0 object-contain object-left sm:h-24 sm:w-36"
            />
          )}
          <div className="min-w-0">
            <p className="quote-accent-text text-xl font-semibold tracking-tight">
              {displayBrandName}
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-stone-950">
              Orçamento
            </h2>
            <p className="mt-1 text-sm text-stone-500">Proposta comercial</p>
            {(identity.whatsapp.trim() ||
              identity.instagram.trim() ||
              identity.email.trim() ||
              identity.address.trim()) && (
              <div className="mt-3 space-y-0.5 text-xs leading-5 text-stone-600">
                {identity.whatsapp.trim() && <p>WhatsApp: {identity.whatsapp}</p>}
                {identity.instagram.trim() && <p>Instagram: {identity.instagram}</p>}
                {identity.email.trim() && <p>E-mail: {identity.email}</p>}
                {identity.address.trim() && <p>{identity.address}</p>}
              </div>
            )}
          </div>
        </div>
        <dl className="grid gap-2 text-sm sm:text-right">
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">Número</dt>
            <dd className="quote-number-badge mt-1 inline-block rounded-full px-3 py-1 font-semibold">
              {draft.quoteNumber || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">Data</dt>
            <dd className="font-medium text-stone-800">{formatDate(draft.quoteDate)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">Validade</dt>
            <dd className="font-medium text-stone-800">
              {formatValidity(draft.quoteDate, draft.validityDays)}
            </dd>
          </div>
        </dl>
      </header>

      <section className="quote-identity-panel mt-6 grid gap-5 rounded-xl border-l-4 p-4 sm:grid-cols-2">
        <div>
          <h3 className="quote-panel-muted text-xs font-semibold uppercase tracking-wide">
            Cliente
          </h3>
          <p className="mt-2 font-semibold">
            {draft.clientName.trim() || "Cliente não informado"}
          </p>
          {draft.clientPhone.trim() && (
            <p className="quote-panel-detail mt-1 text-sm">{draft.clientPhone}</p>
          )}
          {draft.clientEmail.trim() && (
            <p className="quote-panel-detail mt-1 text-sm">{draft.clientEmail}</p>
          )}
        </div>
        <div>
          <h3 className="quote-panel-muted text-xs font-semibold uppercase tracking-wide">
            Pagamento
          </h3>
          <p className="mt-2 font-semibold">{paymentMethodLabel}</p>
          {commercialTerms && (
            <p className="quote-panel-detail mt-1 whitespace-pre-line text-sm">
              {commercialTerms}
            </p>
          )}
        </div>
      </section>

      <section className="mt-7" aria-labelledby="quote-items-title">
        <h3
          id="quote-items-title"
          className="quote-accent-text text-sm font-semibold uppercase tracking-wide"
        >
          Itens do orçamento
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="quote-table-heading border-b text-left text-xs uppercase tracking-wide text-stone-600">
                <th className="px-2 py-2 font-semibold">Descrição</th>
                <th className="px-2 py-2 text-right font-semibold">Qtd.</th>
                <th className="px-2 py-2 text-right font-semibold">Valor unitário</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-b border-stone-200">
                  <td className="px-2 py-3 font-medium text-stone-900">
                    {item.description.trim() || "Item sem descrição"}
                  </td>
                  <td className="px-2 py-3 text-right text-stone-700">
                    {formatQuantity(item.quantity)}
                  </td>
                  <td className="px-2 py-3 text-right text-stone-700">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-2 py-3 text-right font-semibold text-stone-950">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-stone-500">
                    Nenhum item informado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 flex justify-end">
        <dl className="w-full max-w-sm space-y-2 text-sm">
          <div className="flex items-center justify-between gap-6">
            <dt className="text-stone-600">Subtotal</dt>
            <dd className="font-medium text-stone-900">{formatCurrency(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between gap-6">
              <dt className="text-stone-600">Desconto</dt>
              <dd className="font-medium text-stone-900">− {formatCurrency(discount)}</dd>
            </div>
          )}
          <div className="quote-total-row flex items-center justify-between gap-6 border-t-4 pt-3 text-lg">
            <dt className="font-semibold text-stone-950">Total final</dt>
            <dd className="quote-accent-text font-semibold">{formatCurrency(total)}</dd>
          </div>
        </dl>
      </section>

      {draft.notes.trim() && (
        <section className="mt-7 border-t border-stone-200 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Observações
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-700">
            {draft.notes}
          </p>
        </section>
      )}

      <footer className="mt-8 border-t border-stone-200 pt-4 text-center text-[11px] text-stone-400">
        Gerado no Minha Fatia.
      </footer>
    </article>
  );
}
