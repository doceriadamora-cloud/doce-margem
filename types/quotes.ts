export const QUOTE_PAYMENT_METHODS = [
  "pix",
  "debit",
  "credit",
  "cash",
  "boleto",
  "other",
] as const;

export type QuotePaymentMethod = (typeof QUOTE_PAYMENT_METHODS)[number];

/** Item comercial digitado manualmente no rascunho do orçamento. */
export interface QuoteDraftItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

/**
 * Único rascunho local da P0-4. Histórico, status e cadastro de clientes ficam
 * reservados para o P1; por isso esta estrutura não representa um orçamento
 * emitido nem uma entidade de cliente.
 */
export interface QuoteDraft {
  quoteNumber: string;
  quoteDate: string;
  validityDays: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
  paymentMethod: QuotePaymentMethod;
  paymentTerms: string;
  discount: string;
  items: QuoteDraftItem[];
  updatedAt: string;
}
