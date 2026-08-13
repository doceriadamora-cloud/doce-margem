/**
 * Canal de suporte — Fase P0-8A.
 *
 * Ponto único do projeto que sabe COMO falar com o suporte. Existe porque a
 * auditoria P0-8 encontrou quatro telas mandando a usuária "falar com o
 * suporte" sem oferecer canal nenhum — o pior desfecho possível para quem já
 * pagou e não consegue entrar.
 *
 * Módulo puro: sem UI, sem env, sem I/O. Trocar o canal é editar este arquivo.
 *
 * O WhatsApp oficial de atendimento da Doceria D'Amora / Minha Fatia é
 * **+55 21 95905-4988**. O placeholder usado durante a implementação da P0-8A
 * foi substituído aqui, e o app inteiro passou a apontar para o número real sem
 * nenhuma outra alteração — que era o objetivo de centralizar o canal.
 *
 * A escolha de constante em código (e não de env) foi deliberada: uma env
 * ausente em produção deixaria os CTAs de suporte apontando para lugar nenhum,
 * em silêncio — exatamente o defeito que esta fase veio corrigir. Migrar para
 * env continua sendo uma troca de uma linha, se um dia fizer sentido.
 */

/**
 * Só dígitos, **sem** código do país — o DDI vive na constante abaixo e é
 * concatenado em `buildSupportWhatsAppUrl`. O link final fica
 * `wa.me/5521959054988`.
 */
export const SUPPORT_WHATSAPP_NUMBER = "21959054988";

/** Brasil. Separado do número para deixar óbvio o que trocar. */
export const SUPPORT_WHATSAPP_COUNTRY_CODE = "55";

/** Mensagem que já vai escrita para a usuária não precisar explicar o contexto. */
export const SUPPORT_DEFAULT_MESSAGE =
  "Olá! Preciso de ajuda com meu acesso ao Minha Fatia.";

/**
 * Link `wa.me` com a mensagem pré-preenchida.
 *
 * `wa.me` funciona no celular e no navegador, e não depende de a usuária ter o
 * número salvo na agenda.
 */
export function buildSupportWhatsAppUrl(
  message: string = SUPPORT_DEFAULT_MESSAGE,
): string {
  const digits = `${SUPPORT_WHATSAPP_COUNTRY_CODE}${SUPPORT_WHATSAPP_NUMBER}`.replace(
    /\D/g,
    "",
  );
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
