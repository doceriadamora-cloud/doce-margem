"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  buildQuoteShareMessage,
  buildWhatsAppShareUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";
import {
  closeQuoteShare,
  getQuoteShareServerSnapshot,
  getQuoteShareSnapshot,
  openQuoteShare,
  subscribeQuoteShare,
  type QuoteShareTarget,
} from "./quote-share-store";
import {
  getSavedQuotesServerSnapshot,
  getSavedQuotesSnapshot,
  subscribeSavedQuotes,
  updateSavedQuote,
} from "./saved-quotes-store";

/**
 * Painel de compartilhamento — Fase P0-12.
 *
 * ## Por que o fluxo é assistido
 *
 * O `wa.me` abre uma conversa com texto pronto e **não anexa arquivo** — não
 * há como o navegador entregar um PDF por ali. Fingir que dá certo seria
 * prometer um envio que nunca acontece. Então o painel assume os três passos e
 * os numera: salvar o PDF, abrir a conversa, anexar à mão.
 *
 * ## Detalhe que evita mandar o documento errado
 *
 * A impressão sempre imprime **o que está no editor**. Por isso compartilhar a
 * partir do histórico carrega o orçamento no editor antes de abrir este painel
 * (ver `SavedQuotesList`): sem isso, a usuária mandaria a mensagem de um
 * orçamento e o PDF de outro.
 *
 * ## O elemento fica sempre montado
 *
 * Só o **conteúdo** é condicional. Desmontar um `<dialog>` aberto tira da
 * camada superior um elemento que o navegador ainda considera modal, e há
 * motores que deixam para trás o `::backdrop` e a página inerte. Manter o
 * elemento e alternar `showModal()`/`close()` é o caminho que o navegador
 * espera.
 */
export default function QuoteShareDialog() {
  const target = useSyncExternalStore(
    subscribeQuoteShare,
    getQuoteShareSnapshot,
    getQuoteShareServerSnapshot,
  );
  const savedQuotes = useSyncExternalStore(
    subscribeSavedQuotes,
    getSavedQuotesSnapshot,
    getSavedQuotesServerSnapshot,
  );
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  /**
   * O aviso de cópia guarda **para qual orçamento** ele vale.
   *
   * Assim ele some sozinho quando o painel abre para outro orçamento, em vez de
   * precisar de um efeito que zera estado — padrão que o React desaconselha e
   * que o lint do projeto recusa.
   */
  const [copyState, setCopyState] = useState<
    { target: QuoteShareTarget; text: string } | null
  >(null);

  const isOpen = target !== null;
  const copyFeedback =
    copyState !== null && copyState.target === target ? copyState.text : null;

  // `<dialog>` nativo: foco preso, Esc e camada superior sem biblioteca nova.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const message =
    target === null
      ? ""
      : buildQuoteShareMessage({
          clientName: target.clientName,
          quoteNumber: target.quoteNumber,
        });
  const normalized = target === null ? null : normalizeWhatsAppNumber(target.whatsapp);
  const shareUrl =
    target === null ? null : buildWhatsAppShareUrl({ whatsapp: target.whatsapp, message });
  const savedQuote =
    target !== null && target.savedQuoteId !== null
      ? (savedQuotes.find((quote) => quote.id === target.savedQuoteId) ?? null)
      : null;

  async function handleCopy(alvo: QuoteShareTarget, texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      setCopyState({ target: alvo, text: "Mensagem copiada." });
    } catch {
      // Área de transferência bloqueada (contexto inseguro, permissão negada).
      // A mensagem continua visível e selecionável logo acima, então não é beco
      // sem saída — só avisa que a cópia automática não rolou.
      setCopyState({
        target: alvo,
        text: "Não foi possível copiar. Selecione o texto acima e copie à mão.",
      });
    }
  }

  /**
   * Fecha antes de imprimir e reabre depois.
   *
   * Um diálogo aberto sairia no papel. `window.print()` só retorna quando a
   * caixa de impressão é dispensada, então a usuária volta exatamente no passo 2.
   */
  function handlePrint(alvo: QuoteShareTarget): void {
    closeQuoteShare();
    window.requestAnimationFrame(() => {
      window.print();
      openQuoteShare(alvo);
    });
  }

  function handleMarkAsSent(): void {
    // Só daqui, e só por clique. Salvar um orçamento nunca muda a situação.
    if (savedQuote === null) return;
    updateSavedQuote(savedQuote.id, { ...savedQuote, status: "enviado" });
  }

  return (
    <dialog
      ref={dialogRef}
      // `quote-print-hidden` é cinto e suspensório: o painel já fecha antes de
      // imprimir, mas se alguém usar Ctrl+P com ele aberto, não vai para o papel.
      className="quote-print-hidden w-full max-w-md rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 backdrop:bg-stone-900/50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      onClose={closeQuoteShare}
      aria-labelledby="quote-share-title"
    >
      {target !== null && (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="quote-share-title"
                className="text-lg font-semibold text-stone-900 dark:text-stone-50"
              >
                Compartilhar orçamento
              </h2>
              <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                {target.clientName.trim() || "Cliente não informada"}
                {target.quoteNumber.trim() !== "" && ` · ${target.quoteNumber}`}
              </p>
            </div>
            <button
              type="button"
              onClick={closeQuoteShare}
              aria-label="Fechar"
              className="shrink-0 rounded-full px-2 py-1 text-sm text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              ✕
            </button>
          </div>

          {normalized !== null && !normalized.ok ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {normalized.reason === "empty"
                ? "Selecione uma cliente com WhatsApp ou preencha o WhatsApp no orçamento."
                : "O WhatsApp informado não parece um número válido. Use DDD + número, como (21) 95905-4988."}
            </p>
          ) : (
            <div className="text-sm text-stone-500 dark:text-stone-400">
              <p>
                WhatsApp:{" "}
                <strong className="font-medium text-stone-700 dark:text-stone-300">
                  {target.whatsapp}
                </strong>
              </p>
              {normalized !== null && normalized.ok && (
                // Mostrar o número já normalizado tira a dúvida de "será que ele
                // entendeu meu DDD?" antes de a conversa abrir.
                <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
                  Será enviado para +{normalized.digits}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Mensagem que será enviada
            </p>
            <p className="mt-1 rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700 dark:bg-stone-950 dark:text-stone-300">
              {message}
            </p>
            <button
              type="button"
              onClick={() => void handleCopy(target, message)}
              className="mt-2 text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
            >
              Copiar mensagem
            </button>
            {copyFeedback !== null && (
              <p role="status" className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {copyFeedback}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
            <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
              Para enviar o PDF: primeiro salve/imprima o orçamento em PDF. Depois abra o WhatsApp
              e anexe o arquivo salvo manualmente.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handlePrint(target)}
                className="w-full rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
              >
                1. Salvar / imprimir PDF
              </button>

              {shareUrl !== null ? (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-full bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  2. Abrir WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-full bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                >
                  2. Abrir WhatsApp
                </button>
              )}
            </div>
          </div>

          {target.savedQuoteId === null ? (
            <p className="rounded-xl bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-500 dark:bg-stone-950 dark:text-stone-400">
              Este orçamento ainda não está no histórico. Salvar antes de enviar mantém o registro
              do que foi combinado com a cliente.
            </p>
          ) : savedQuote !== null && savedQuote.status !== "enviado" ? (
            <button
              type="button"
              onClick={handleMarkAsSent}
              className="w-fit rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Marcar como enviado
            </button>
          ) : (
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Este orçamento está marcado como enviado.
            </p>
          )}

          <button
            type="button"
            onClick={closeQuoteShare}
            className="w-full rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Fechar
          </button>
        </div>
      )}
    </dialog>
  );
}
