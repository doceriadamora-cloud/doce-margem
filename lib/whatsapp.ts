/**
 * Número de WhatsApp e mensagem de compartilhamento — Fase P0-12.
 *
 * Módulo **puro**: sem UI, sem I/O, sem estado. Fica isolado porque é onde o
 * compartilhamento erra em silêncio — um número mal normalizado abre uma
 * conversa com a pessoa errada, ou com ninguém, e a usuária só descobre depois
 * de mandar. Aqui dá para exercitar caso a caso.
 *
 * Nada do que este arquivo produz é dado interno: a mensagem tem saudação,
 * nome e número do orçamento. Custo, margem, markup, perda, fator de correção,
 * sub-receita e observação interna da cliente não entram — nem existem nas
 * entradas destas funções.
 */

/** Brasil. Separado para o motivo de estar aqui ficar explícito. */
const COUNTRY_CODE = "55";

export type WhatsAppNumber =
  /** Pronto para `wa.me`: código do país + DDD + número, só dígitos. */
  | { ok: true; digits: string }
  | { ok: false; reason: "empty" | "invalid" };

/**
 * Normaliza um telefone brasileiro para o formato que o `wa.me` espera.
 *
 * Regras, na ordem em que são aplicadas:
 *
 * 1. Sobram só os dígitos — parênteses, traços, espaços e `+` somem.
 * 2. **10 ou 11 dígitos** → falta o país: recebe o `55` na frente.
 * 3. **12 ou 13 dígitos começando com 55** → já está completo, fica como está.
 * 4. Qualquer outra coisa → inválido, e a interface pede correção.
 *
 * A ordem entre 2 e 3 importa e não é acidental: existe **DDD 55** (Santa
 * Maria, RS). O número `55987654321` tem 11 dígitos e começa com "55", mas é
 * DDD 55 + celular, não código de país + número quebrado. Testar o comprimento
 * antes do prefixo resolve isso sozinho — e trocar a ordem faria esses números
 * abrirem conversa com quem não existe.
 */
export function normalizeWhatsAppNumber(raw: string): WhatsAppNumber {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return { ok: false, reason: "empty" };

  // Fixo (10) ou celular (11) sem código de país.
  if (digits.length === 10 || digits.length === 11) {
    return { ok: true, digits: `${COUNTRY_CODE}${digits}` };
  }

  // Já veio com o país na frente.
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith(COUNTRY_CODE)) {
    return { ok: true, digits };
  }

  return { ok: false, reason: "invalid" };
}

/** `true` quando o número dá para usar. Atalho de leitura para a interface. */
export function hasUsableWhatsApp(raw: string): boolean {
  return normalizeWhatsAppNumber(raw).ok;
}

/**
 * Mensagem que acompanha o orçamento.
 *
 * Curta de propósito. Quem recebe já vai ver o documento anexado; um texto
 * longo no WhatsApp só atrapalha, e o valor, os itens e as condições estão no
 * PDF, onde devem estar.
 */
export function buildQuoteShareMessage(params: {
  clientName: string;
  quoteNumber: string;
}): string {
  const nome = params.clientName.trim();
  const numero = params.quoteNumber.trim();
  const saudacao = nome === "" ? "Olá!" : `Olá, ${nome}!`;
  const orcamento = numero === "" ? "o seu orçamento" : `o seu orçamento ${numero}`;
  return `${saudacao} Aqui está ${orcamento}.`;
}

/**
 * Link `wa.me` com a mensagem já preenchida.
 *
 * Devolve `null` quando o número não serve — assim a interface não tem como
 * montar um link quebrado por engano; ela é obrigada a tratar o caso.
 */
export function buildWhatsAppShareUrl(params: {
  whatsapp: string;
  message: string;
}): string | null {
  const number = normalizeWhatsAppNumber(params.whatsapp);
  if (!number.ok) return null;
  return `https://wa.me/${number.digits}?text=${encodeURIComponent(params.message)}`;
}
