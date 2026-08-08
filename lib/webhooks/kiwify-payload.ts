/**
 * Leitura tolerante do payload da Kiwify — Fase 4-7C.
 *
 * Módulo **puro**: não importa Supabase, não lê env, não faz I/O. Recebe um
 * `unknown` já parseado e devolve o que conseguiu entender. Separado do Route
 * Handler pelo mesmo motivo que a matemática de precificação vive em
 * `modules/` — para poder ser verificado isoladamente, sem subir servidor.
 *
 * ✅ **Formato real observado na Fase 4-7F.** Um POST de teste da Kiwify chegou
 * à produção e foi capturado em `webhook_events`:
 *
 *   webhook_event_type  "order_approved"      → evento (campo real)
 *   order_id            uuid                  → pedido
 *   order_status        "paid"                → status de pagamento, NÃO evento
 *   payment_method      "credit_card"
 *   product_type        "membership"
 *   Product.product_id / Product.product_name
 *   Customer.email / full_name / cnpj / mobile
 *
 * **Nenhum identificador de evento veio no payload** — daí a chave derivada de
 * `deriveEventId`. Os demais caminhos abaixo continuam como compatibilidade
 * com os formatos hipotéticos da Fase 4-7C e com os testes já escritos.
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

/**
 * De onde saiu o `providerEventId`.
 *  - `provider` = a Kiwify mandou um identificador de evento
 *  - `derived`  = construído por nós, `evento:pedido` (ver `deriveEventId`)
 *  - `none`     = não deu para montar nenhum; **sem idempotência**
 */
export type EventIdSource = "provider" | "derived" | "none";

export interface KiwifyExtraction {
  /** O que vai para `webhook_events.event_type`. */
  eventType: WebhookEventType;
  /** O nome cru encontrado, antes da normalização. `null` se nada foi achado. */
  rawEventName: string | null;
  providerEventId: string | null;
  /** Diagnóstico: identificador veio da Kiwify ou foi derivado por nós? */
  eventIdSource: EventIdSource;
  providerOrderId: string | null;
  /** Normalizado (`trim` + `lower`) — a busca por perfil será case-insensitive. */
  buyerEmail: string | null;
  productId: string | null;
  productName: string | null;
  /** `membership`, `subscription`… Só diagnóstico até a fase de licença. */
  productType: string | null;
  /** `true` só para os três eventos que a fase de licença vai processar. */
  isActionable: boolean;
  /** `true` quando o payload tem marcas do "Testar Webhook" da Kiwify. */
  isTestPayload: boolean;
}

/**
 * O produto do payload é o Doce Margem Essencial?
 *
 *  - `match`          → é o nosso produto; pode processar
 *  - `mismatch`       → é outro produto do mesmo produtor; ignorar
 *  - `unknown`        → o payload não trouxe identificação de produto
 *  - `not_configured` → nenhuma env de produto foi definida no ambiente
 */
export type ProductMatch = "match" | "mismatch" | "unknown" | "not_configured";

/** Identificação do produto vendido, lida do ambiente. */
export interface EssentialProductConfig {
  productId: string | null;
  productName: string | null;
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

/**
 * Nome do evento. **`webhook_event_type` é o campo real da Kiwify** (confirmado
 * no payload capturado na Fase 4-7F); o resto é compatibilidade com os formatos
 * hipotéticos da 4-7C.
 *
 * ⚠️ **`order_status` foi REMOVIDO desta lista na 4-7F.** Ele existe no payload
 * real com valor `"paid"`, que o mapa de apelidos traduziria para
 * `compra_aprovada`. Enquanto `webhook_event_type` estiver presente, a
 * prioridade resolve — mas bastaria ele vir vazio numa notificação de boleto ou
 * de reembolso para o status de pagamento virar "compra aprovada" e, na fase
 * seguinte, liberar licença indevida. Sem `webhook_event_type` legível, o certo
 * é cair em `unknown`: o evento fica gravado, nada é liberado, e alguém olha.
 */
const EVENT_NAME_PATHS = [
  "webhook_event_type",
  "event_type",
  "event",
  "type",
  "data.event",
  "data.event_type",
] as const;

/**
 * Identificador do EVENTO.
 *
 * ⚠️ O payload real da Kiwify **não traz nenhum destes** — por isso a derivação
 * determinística de `deriveEventId`. Estes caminhos ficam para o caso de a
 * Kiwify passar a enviar um identificador próprio, que sempre tem prioridade.
 */
const EVENT_ID_PATHS = [
  "webhook_event_id",
  "event_id",
  "webhook_id",
  "data.event_id",
] as const;

/**
 * Identificador do PEDIDO. `order_id` é o campo real da Kiwify.
 *
 * `id` ficou fora de propósito: num payload da Kiwify ele pode ser o id do
 * produto ou do cliente, e um `provider_order_id` errado corromperia o elo com
 * a licença na fase seguinte.
 */
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

const PRODUCT_ID_PATHS = [
  "Product.product_id",
  "product.product_id",
  "Product.id",
  "product.id",
  "product_id",
] as const;

const PRODUCT_NAME_PATHS = [
  "Product.product_name",
  "product.product_name",
  "Product.name",
  "product.name",
  "product_name",
  "data.product.name",
] as const;

/** `membership`, `subscription`, `digital`… Só diagnóstico até a fase de licença. */
const PRODUCT_TYPE_PATHS = ["product_type", "Product.product_type", "data.product_type"] as const;

/**
 * Nomes crus → evento canônico.
 *
 * Vários apelidos por evento de propósito: não se sabe se a Kiwify manda
 * `compra_aprovada`, `paid` ou `approved`, e errar aqui significa gravar como
 * `ignored` uma compra que devia liberar licença. Chaves em minúsculas — a
 * comparação normaliza antes.
 */
const EVENT_ALIASES: Record<string, KiwifyActionableEvent> = {
  // Confirmado no payload real da Kiwify (Fase 4-7F).
  order_approved: "compra_aprovada",
  order_refunded: "compra_reembolsada",
  order_chargeback: "chargeback",

  // Vocabulário próprio, usado nos testes desde a Fase 4-7C.
  compra_aprovada: "compra_aprovada",
  compra_reembolsada: "compra_reembolsada",
  chargeback: "chargeback",

  // Variantes plausíveis, mantidas por segurança: classificar como `ignored`
  // uma compra que devia liberar licença custa uma venda; o contrário não
  // acontece, porque nenhum destes nomes aparece num evento que não seja o
  // que ele diz ser.
  purchase_approved: "compra_aprovada",
  approved: "compra_aprovada",
  paid: "compra_aprovada",

  purchase_refunded: "compra_reembolsada",
  refunded: "compra_reembolsada",
  refund: "compra_reembolsada",

  chargedback: "chargeback",
  charged_back: "chargeback",
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

/**
 * Identificador do EVENTO **enviado pela Kiwify**, se houver.
 *
 * O payload real não traz nenhum. Quem quiser a chave efetivamente usada deve
 * chamar `extractKiwifyWebhook` e ler `providerEventId`.
 */
export function extractKiwifyEventId(payload: unknown): string | null {
  return readFirstString(payload, EVENT_ID_PATHS);
}

/** Identificador do PEDIDO. Um pedido gera vários eventos ao longo do tempo. */
export function extractKiwifyOrderId(payload: unknown): string | null {
  return readFirstString(payload, ORDER_ID_PATHS);
}

/**
 * Chave de idempotência determinística: `evento:pedido`.
 *
 * **Por que ela precisa existir.** A idempotência do projeto mora no índice
 * único parcial `webhook_events_provider_event_unique`, e em Postgres **NULLs
 * não conflitam entre si** — com `provider_event_id` nulo, cada reenvio da
 * Kiwify viraria uma linha nova e a proteção simplesmente não existiria. O
 * payload real não traz identificador de evento, então ou derivamos um, ou não
 * há idempotência nenhuma. O risco estava previsto no `PLAN-FASE-4.md` 13.1(C);
 * esta é a resposta a ele.
 *
 * **Por que `evento:pedido` e não só o pedido.** Um mesmo pedido produz eventos
 * diferentes ao longo do tempo — aprovada hoje, reembolsada em duas semanas.
 * Chavear só pelo pedido faria o reembolso ser descartado como duplicata do
 * pagamento, que é o pior erro possível aqui: a licença nunca seria revogada.
 *
 * ⚠️ **Limite conhecido:** dois eventos genuinamente distintos com o mesmo tipo
 * e o mesmo pedido (renovação de assinatura anual reusando o `order_id`, por
 * exemplo) colidem, e o segundo é tratado como replay. Para a compra única do
 * Essencial isso é exatamente o comportamento correto. Para o Pro anual, a fase
 * de renovação precisa reavaliar — está anotado no `TASKS.md`.
 */
export function deriveEventId(eventType: WebhookEventType, orderId: string | null): string | null {
  if (orderId === null) return null;
  return `${eventType}:${orderId}`;
}

/** E-mail da compradora, normalizado — será a chave de busca do perfil. */
export function extractKiwifyBuyerEmail(payload: unknown): string | null {
  const email = readFirstString(payload, BUYER_EMAIL_PATHS);
  return email === null ? null : email.toLowerCase();
}

/** Identificador do produto na Kiwify. Diagnóstico e, na fase de licença, o elo com o plano. */
export function extractKiwifyProductId(payload: unknown): string | null {
  return readFirstString(payload, PRODUCT_ID_PATHS);
}

/** Nome do produto comprado. Só diagnóstico nesta fase. */
export function extractKiwifyProductName(payload: unknown): string | null {
  return readFirstString(payload, PRODUCT_NAME_PATHS);
}

/** `membership`, `subscription`, `digital`… Só diagnóstico nesta fase. */
export function extractKiwifyProductType(payload: unknown): string | null {
  const value = readFirstString(payload, PRODUCT_TYPE_PATHS);
  return value === null ? null : value.toLowerCase();
}

/* ─────────────────────── Payload de teste ─────────────────────── */

/**
 * O payload veio do botão "Testar Webhook" da Kiwify?
 *
 * Motivo de existir: o teste do painel chega como `order_approved` completo, com
 * `order_id`, e-mail e produto. Sem esta checagem, o handler tenta convidar
 * `johndoe@example.com`, falha, e a linha fica `failed` — foi exatamente o que
 * aconteceu em produção.
 *
 * ⚠️ **A direção do erro importa aqui.** Classificar uma compra real como teste
 * é muito pior que o contrário: a compradora paga e não recebe nada. Por isso os
 * sinais são estreitos e literais, não heurísticos:
 *
 *  - **`@example.com`** é domínio reservado pela RFC 2606. **Nenhum cliente real
 *    consegue ter um e-mail assim** — não existe caixa postal nesse domínio.
 *    Sozinho, já é conclusivo.
 *  - `"Example product"` e `"Example field"/"Example value"` são as strings
 *    literais que a Kiwify usa no payload de teste. Comparação exata, sem
 *    "contém" — um produto chamado "Exemplo de bolo" não pode cair aqui.
 */
export function isKiwifyTestPayload(payload: unknown): boolean {
  const email = readFirstString(payload, BUYER_EMAIL_PATHS);
  if (email !== null && email.toLowerCase().endsWith("@example.com")) return true;

  const productName = readFirstString(payload, PRODUCT_NAME_PATHS);
  if (productName !== null && productName.trim().toLowerCase() === "example product") return true;

  // custom_fields de exemplo — objeto ou lista, a Kiwify já usou as duas formas.
  const custom = readPath(payload, "custom_fields");
  if (custom !== undefined && custom !== null) {
    const texto = JSON.stringify(custom).toLowerCase();
    if (texto.includes('"example field"') || texto.includes('"example value"')) return true;
  }

  return false;
}

/* ─────────────────────── Validação de produto ─────────────────────── */

/**
 * O produto do payload é o que este app vende?
 *
 * Existe por causa de um risco concreto: se o webhook estiver cadastrado na
 * Kiwify como "todos os produtos que sou produtor", **a venda de qualquer outro
 * produto chegaria aqui e liberaria licença do Doce Margem**. O identificador do
 * produto é a única coisa no payload que separa uma compra nossa das outras.
 *
 * `productId` tem prioridade: é estável, enquanto o nome muda quando alguém
 * edita a oferta no painel. O nome é reserva para o caso de a Kiwify não enviar
 * o id — e a comparação é frouxa de propósito (`trim` + minúsculas), porque
 * exigir igualdade exata de um texto digitado à mão recusaria compra legítima
 * por causa de um espaço.
 */
export function classifyProduct(
  extraction: Pick<KiwifyExtraction, "productId" | "productName">,
  config: EssentialProductConfig,
): ProductMatch {
  const configuredId = config.productId?.trim();
  const configuredName = config.productName?.trim();

  if (!configuredId && !configuredName) return "not_configured";

  if (configuredId) {
    if (extraction.productId !== null) {
      return extraction.productId.trim() === configuredId ? "match" : "mismatch";
    }
    // Sem id no payload: só o nome pode decidir. Sem nome configurado, não dá.
    if (!configuredName) return "unknown";
  }

  if (configuredName) {
    if (extraction.productName === null) return "unknown";
    return extraction.productName.trim().toLowerCase() === configuredName.toLowerCase()
      ? "match"
      : "mismatch";
  }

  return "unknown";
}

/** Tudo de uma vez. Nunca lança: payload inesperado devolve campos em `null`. */
export function extractKiwifyWebhook(payload: unknown): KiwifyExtraction {
  const eventType = extractKiwifyEventType(payload);
  const isActionable =
    eventType === "compra_aprovada" ||
    eventType === "compra_reembolsada" ||
    eventType === "chargeback";

  const providerOrderId = extractKiwifyOrderId(payload);

  // Identificador da Kiwify tem prioridade; se ela um dia mandar um, ele passa
  // a valer sozinho e a derivação sai de cena sem precisar de mudança aqui.
  const explicitEventId = extractKiwifyEventId(payload);
  const derivedEventId = deriveEventId(eventType, providerOrderId);
  const providerEventId = explicitEventId ?? derivedEventId;

  const eventIdSource: EventIdSource =
    explicitEventId !== null ? "provider" : derivedEventId !== null ? "derived" : "none";

  return {
    eventType,
    rawEventName: extractKiwifyRawEventName(payload),
    providerEventId,
    eventIdSource,
    providerOrderId,
    buyerEmail: extractKiwifyBuyerEmail(payload),
    productId: extractKiwifyProductId(payload),
    productName: extractKiwifyProductName(payload),
    productType: extractKiwifyProductType(payload),
    isActionable,
    isTestPayload: isKiwifyTestPayload(payload),
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
