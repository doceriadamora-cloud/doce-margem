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
 * Rascunho em edição. Nasceu na P0-4 como estrutura única e local; a P0-11
 * acrescentou o vínculo com a cliente cadastrada e com o orçamento salvo, sem
 * mudar nada do que já existia.
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
  /**
   * Cliente cadastrada vinculada, ou `null` quando preenchida à mão — P0-11.
   * Preencher manualmente continua sendo um caminho de primeira classe: nem
   * toda encomenda vale um cadastro.
   */
  clientId: string | null;
  /**
   * Orçamento salvo que está aberto no editor, ou `null` para um rascunho novo
   * — P0-11. É o que faz "Salvar" atualizar em vez de duplicar.
   */
  savedQuoteId: string | null;
  updatedAt: string;
}

/* ─────────────────────────── Clientes (P0-11) ─────────────────────────── */

/**
 * Cliente cadastrada.
 *
 * `notes` são **observações internas**: anotação da confeiteira para si mesma
 * ("prefere retirada pela manhã", "sempre atrasa o pagamento"). Nunca vão para
 * o documento — ver `QuoteClientSnapshot`.
 */
export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  /** Endereço ou bairro. Usado na organização da entrega, não no documento. */
  address: string;
  /** Observações internas. **Nunca** aparecem no orçamento. */
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/* ──────────────────── Orçamentos salvos (P0-11) ──────────────────── */

export const SAVED_QUOTE_STATUSES = [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
] as const;

export type SavedQuoteStatus = (typeof SAVED_QUOTE_STATUSES)[number];

/**
 * Cópia congelada da cliente no momento em que o orçamento foi salvo.
 *
 * Tem **exatamente** os três campos que o documento mostra. Isso é uma escolha
 * de segurança, não economia: endereço e observações internas não estão aqui,
 * então não há caminho — nem por descuido futuro numa tela — para vazarem no
 * orçamento entregue à cliente. O que não é copiado não pode escapar.
 *
 * Existe também para o orçamento continuar legível depois de a cliente ser
 * editada ou excluída: um documento emitido não pode mudar sozinho.
 */
export interface QuoteClientSnapshot {
  name: string;
  whatsapp: string;
  email: string;
}

/**
 * Orçamento guardado no histórico.
 *
 * Guarda só o que o documento comercial mostra. Nada de custo, margem, markup,
 * fator de correção, perda, sub-receita ou medida caseira — esses vivem na
 * Precificação e na Ficha técnica, e nunca atravessaram para cá.
 *
 * **O total não é gravado**, de propósito: ele é derivado de `items` e
 * `discount` por `calculateCommercialQuoteTotals`, e o projeto não persiste
 * valor calculado (DECISIONS.md, Fase 2-6). Recalcular na exibição é barato e
 * elimina a chance de um total gravado divergir dos itens que o originaram.
 */
export interface SavedQuote {
  id: string;
  quoteNumber: string;
  /** Cliente cadastrada, ou `null` se foi preenchida à mão ou depois excluída. */
  clientId: string | null;
  clientSnapshot: QuoteClientSnapshot;
  quoteDate: string;
  validityDays: string;
  paymentMethod: QuotePaymentMethod;
  paymentTerms: string;
  items: QuoteDraftItem[];
  discount: string;
  /** Observações comerciais — estas SIM aparecem no documento. */
  notes: string;
  status: SavedQuoteStatus;
  createdAt: string;
  updatedAt: string;
}
