export const QUOTE_PAYMENT_METHODS = [
  "pix",
  "debit",
  "credit",
  "cash",
  "boleto",
  "other",
] as const;

export type QuotePaymentMethod = (typeof QUOTE_PAYMENT_METHODS)[number];

export const DEFAULT_QUOTE_PRIMARY_COLOR = "#be123c";
export const DEFAULT_QUOTE_SECONDARY_COLOR = "#fff1f2";
export const MAX_STORED_LOGO_DATA_URL_LENGTH = 500_000;

/** Identidade visual e contatos exibidos somente no orçamento comercial. */
export interface QuoteIdentity {
  brandName: string;
  logoDataUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  whatsapp: string;
  instagram: string;
  email: string;
  address: string;
  defaultCommercialTerms: string;
  updatedAt: string;
}

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
