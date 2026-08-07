/**
 * Leitura tolerante do payload da Kiwify — Fase 4-7C.
 *
 * Módulo **puro**: não importa Supabase, não lê env, não faz I/O. Recebe um
 * `unknown` já parseado e devolve o que conseguiu entender. Separado do Route
 * Handler pelo mesmo motivo que a matemática de precificação vive em
 * `modules/` — para poder ser verificado isoladamente, sem subir servidor.
 *
 * ⚠️ **O formato real da Kiwify ainda não foi observado.** Os caminhos abaixo
 * são candidatos plausíveis, não documentação. É exatamente por isso que esta
 * fase existe: capturar payload real para depois escrever a liberação de
 * licença sobre fato, não sobre suposição.
 *
 * Por isso nada aqui lança nem exige campo: **payload irreconhecível vira
 * `unknown`, não erro**. Um webhook que a gente não entendeu ainda assim precisa
 * ser gravado — é o único jeito de descobrir como ele é.
 */

/** Os três eventos que o produto realmente trata. */
export type KiwifyActionableEvent = "compra_aprovada" | "compra_reembolsada" | "chargeback";

/**
 * Valores aceitos por `webhook_events.event_type` (CHECK da migration 0003).
 *  - os três acionáveis
 *  - `ignored`  = nome de evento lido, mas não é um dos três
 *  - `unknown`  = não foi possível achar nome de evento nenhum
 */
export type WebhookEventType = KiwifyActionableEvent | "ignored" | "unknown";

/** Valores aceitos por `webhook_events.status` (CHECK da migration 0003). */
export type WebhookStatus = "received" | "processed" | "ignored" | "failed";

export interface KiwifyExtraction {
  /** O que vai para `webhook_events.event_type`. */
  eventType: WebhookEventType;
  /** O nome cru encontrado, antes da normalização. `null` se nada foi achado. */
  rawEventName: string | null;
  providerEventId: string | null;
  providerOrderId: string | null;
  /** Normalizado (`trim` + `lower`) — a busca por perfil será case-insensitive. */
  buyerEmail: string | null;
  productName: string | null;
  /** `true` só para os três eventos que a Fase 4-7D vai processar. */
  isActionable: boolean;
}

/* ─────────────────────── Leitura defensiva ─────────────────────── */

/** Objeto JSON comum. `unknown` para forçar checagem antes de qualquer acesso. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Caminha um caminho separado por ponto. Qualquer degrau ausente devolve `undefined`. */
function readPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of path.split(".")) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Primeira string não-vazia entre vários caminhos candidatos.
 *
 * Aceita número também: identificadores de pedido costumam vir numéricos em
 * alguns provedores, e descartá-los por causa do tipo perderia justamente a
 * chave de idempotência.
 */
function readFirstString(payload: unknown, paths: readonly string[]): string | null {
  for (const path of paths) {
    const value = readPath(payload, path);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") return trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

/* ─────────────────────── Caminhos candidatos ─────────────────────── */

const EVENT_NAME_PATHS = [
  "webhook_event_type",
  "event_type",
  "event",
  "type",
  "order_status",
  "status",
  "data.event",
  "data.event_type",
] as const;

const EVENT_ID_PATHS = [
  "webhook_event_id",
  "event_id",
  "webhook_id",
  "data.event_id",
  "id",
] as const;

const ORDER_ID_PATHS = [
  "order_id",
  "order.id",
  "order_ref",
  "transaction_id",
  "charge_id",
  "data.order_id",
  "Order.order_id",
] as const;

const BUYER_EMAIL_PATHS = [
  "Customer.email",
  "customer.email",
  "buyer.email",
  "Buyer.email",
  "customer_email",
  "email",
  "data.customer.email",
] as const;

const PRODUCT_NAME_PATHS = [
  "Product.product_name",
  "product.product_name",
  "Product.name",
  "product.name",
  "product_name",
  "data.product.name",
] as const;

/**
 * Nomes crus → evento canônico.
 *
 * Vários apelidos por evento de propósito: não se sabe se a Kiwify manda
 * `compra_aprovada`, `paid` ou `approved`, e errar aqui significa gravar como
 * `ignored` uma compra que devia liberar licença. Chaves em minúsculas — a
 * comparação normaliza antes.
 */
const EVENT_ALIASES: Record<string, KiwifyActionableEvent> = {
  compra_aprovada: "compra_aprovada",
  order_approved: "compra_aprovada",
  purchase_approved: "compra_aprovada",
  approved: "compra_aprovada",
  paid: "compra_aprovada",

  compra_reembolsada: "compra_reembolsada",
  order_refunded: "compra_reembolsada",
  purchase_refunded: "compra_reembolsada",
  refunded: "compra_reembolsada",
  refund: "compra_reembolsada",

  chargeback: "chargeback",
  chargedback: "chargeback",
  charged_back: "chargeback",
  order_chargeback: "chargeback",
};

/* ─────────────────────── API pública ─────────────────────── */

/** Nome cru do evento, sem normalizar. `null` se nenhum caminho respondeu. */
export function extractKiwifyRawEventName(payload: unknown): string | null {
  return readFirstString(payload, EVENT_NAME_PATHS);
}

/**
 * Evento normalizado para o vocabulário de `webhook_events.event_type`.
 *
 * Três saídas possíveis, e a distinção importa para diagnóstico:
 *   - um dos três canônicos → a Fase 4-7D vai agir sobre ele
 *   - `ignored`  → li o nome, não é um dos meus (ex.: boleto gerado)
 *   - `unknown`  → não achei nome nenhum; provável formato diferente do esperado
 */
export function extractKiwifyEventType(payload: unknown): WebhookEventType {
  const rawName = extractKiwifyRawEventName(payload);
  if (rawName === null) return "unknown";

  const canonical = EVENT_ALIASES[rawName.toLowerCase()];
  return canonical ?? "ignored";
}

/** Identificador do EVENTO — a chave de idempotência da migration 0003. */
export function extractKiwifyEventId(payload: unknown): string | null {
  return readFirstString(payload, EVENT_ID_PATHS);
}

/** Identificador do PEDIDO. Um pedido gera vários eventos ao longo do tempo. */
export function extractKiwifyOrderId(payload: unknown): string | null {
  return readFirstString(payload, ORDER_ID_PATHS);
}

/** E-mail da compradora, normalizado — será a chave de busca do perfil na 4-7D. */
export function extractKiwifyBuyerEmail(payload: unknown): string | null {
  const email = readFirstString(payload, BUYER_EMAIL_PATHS);
  return email === null ? null : email.toLowerCase();
}

/** Nome do produto comprado. Só diagnóstico nesta fase. */
export function extractKiwifyProductName(payload: unknown): string | null {
  return readFirstString(payload, PRODUCT_NAME_PATHS);
}

/** Tudo de uma vez. Nunca lança: payload inesperado devolve campos em `null`. */
export function extractKiwifyWebhook(payload: unknown): KiwifyExtraction {
  const eventType = extractKiwifyEventType(payload);
  const isActionable =
    eventType === "compra_aprovada" ||
    eventType === "compra_reembolsada" ||
    eventType === "chargeback";

  return {
    eventType,
    rawEventName: extractKiwifyRawEventName(payload),
    providerEventId: extractKiwifyEventId(payload),
    providerOrderId: extractKiwifyOrderId(payload),
    buyerEmail: extractKiwifyBuyerEmail(payload),
    productName: extractKiwifyProductName(payload),
    isActionable,
  };
}

/**
 * Status inicial da linha em `webhook_events`, coerente com o CHECK
 * `webhook_events_processed_at_coherent` da migration 0003.
 *
 * Evento acionável nasce `received` com `processed_at = null` — sinalizando que
 * a licença **ainda não foi processada**, que é justamente o estado desta fase.
 * Evento não acionável nasce `ignored` e já sai carimbado: não há nada pendente
 * nele.
 */
export function resolveInitialStatus(extraction: KiwifyExtraction): WebhookStatus {
  return extraction.isActionable ? "received" : "ignored";
}
