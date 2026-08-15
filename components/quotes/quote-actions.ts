"use client";

/**
 * Ações que ligam cliente, rascunho e histórico — Fase P0-11.
 *
 * Existem fora dos componentes porque três telas diferentes precisam delas —
 * a lista de clientes, o editor de orçamento e o histórico — e cada uma
 * reimplementando "montar o rascunho a partir de X" é como as três divergem.
 *
 * Nenhuma faz cálculo: o total continua sendo derivado de
 * `calculateCommercialQuoteTotals` na hora de exibir.
 */

import type {
  Client,
  QuoteClientSnapshot,
  QuoteDraft,
  SavedQuote,
} from "@/types/quotes";
import { startNewQuoteDraft, updateQuoteDraft } from "./quote-draft-store";
import type { SavedQuoteInput } from "./saved-quotes-store";

/** Os campos do rascunho que descrevem a cliente. */
function clientFields(client: Client): Pick<
  QuoteDraft,
  "clientId" | "clientName" | "clientPhone" | "clientEmail"
> {
  return {
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.whatsapp,
    clientEmail: client.email,
    // `address` e `notes` NÃO entram: são dados internos da cliente e não têm
    // lugar num documento que vai para ela.
  };
}

/** Vincula uma cliente cadastrada ao rascunho atual, preenchendo os contatos. */
export function applyClientToDraft(client: Client): void {
  updateQuoteDraft(clientFields(client));
}

/**
 * Desfaz o vínculo, mantendo o que já está escrito.
 *
 * Apagar nome e contato aqui seria destrutivo: quem escolhe "preencher à mão"
 * depois de ter selecionado uma cliente quase sempre quer **ajustar** o que
 * está lá, não recomeçar do zero.
 */
export function clearClientFromDraft(): void {
  updateQuoteDraft({ clientId: null });
}

/** Abre um orçamento novo já vinculado a esta cliente. */
export function startQuoteForClient(client: Client): void {
  startNewQuoteDraft(clientFields(client));
}

/** Carrega um orçamento salvo no editor, para consultar ou alterar. */
export function openSavedQuoteInDraft(quote: SavedQuote): void {
  updateQuoteDraft({
    savedQuoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    quoteDate: quote.quoteDate,
    validityDays: quote.validityDays,
    clientId: quote.clientId,
    clientName: quote.clientSnapshot.name,
    clientPhone: quote.clientSnapshot.whatsapp,
    clientEmail: quote.clientSnapshot.email,
    notes: quote.notes,
    paymentMethod: quote.paymentMethod,
    paymentTerms: quote.paymentTerms,
    discount: quote.discount,
    items: quote.items,
  });
}

/**
 * Duplica um orçamento salvo: mesmos itens e condições, documento novo.
 *
 * Número e data são refeitos e `savedQuoteId` fica `null` — o duplicado só
 * existe no histórico depois que a usuária salvar, e salvar cria um registro
 * próprio em vez de sobrescrever o original.
 */
export function duplicateSavedQuoteInDraft(quote: SavedQuote): void {
  startNewQuoteDraft({
    clientId: quote.clientId,
    clientName: quote.clientSnapshot.name,
    clientPhone: quote.clientSnapshot.whatsapp,
    clientEmail: quote.clientSnapshot.email,
    validityDays: quote.validityDays,
    notes: quote.notes,
    paymentMethod: quote.paymentMethod,
    paymentTerms: quote.paymentTerms,
    discount: quote.discount,
    // Ids novos para os itens: dois orçamentos não devem compartilhar a mesma
    // identidade de linha.
    items: quote.items.map((item, index) => ({
      ...item,
      id: `${item.id}-copia-${index}`,
    })),
  });
}

/** Só os três campos comerciais — ver a nota em `QuoteClientSnapshot`. */
export function buildClientSnapshot(draft: QuoteDraft): QuoteClientSnapshot {
  return {
    name: draft.clientName,
    whatsapp: draft.clientPhone,
    email: draft.clientEmail,
  };
}

/**
 * Converte o rascunho atual no registro que vai para o histórico.
 *
 * Copia **apenas** o que o documento comercial mostra. Não existe caminho daqui
 * para custo, margem, markup, fator de correção, perda, sub-receita ou medida
 * caseira: esses dados nunca estiveram no rascunho, que sempre foi uma
 * estrutura comercial (P0-4).
 */
export function buildSavedQuoteInput(
  draft: QuoteDraft,
  status: SavedQuote["status"] = "rascunho",
): SavedQuoteInput {
  return {
    quoteNumber: draft.quoteNumber,
    clientId: draft.clientId,
    clientSnapshot: buildClientSnapshot(draft),
    quoteDate: draft.quoteDate,
    validityDays: draft.validityDays,
    paymentMethod: draft.paymentMethod,
    paymentTerms: draft.paymentTerms,
    items: draft.items,
    discount: draft.discount,
    notes: draft.notes,
    status,
  };
}
