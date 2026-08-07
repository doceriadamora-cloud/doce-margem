import {
  deriveEventId,
  extractKiwifyEventType,
  extractKiwifyWebhook,
  resolveInitialStatus,
} from "./kiwify-payload";

/**
 * Validações manuais dos extractores da Kiwify — Fase 4-7C.
 *
 * Mesmo padrão sem framework de `modules/pricing/examples.ts` e
 * `lib/features-examples.ts` (DECISIONS.md, 2026-06-27).
 *
 * ⚠️ Estes payloads são **hipóteses**, não amostras reais. O que eles provam não
 * é "a Kiwify manda assim" — é que os extractores **não quebram** com formatos
 * diferentes e que payload irreconhecível vira `unknown` em vez de exceção. Essa
 * é a propriedade que o modo captura precisa ter.
 */

export interface WebhookCheckResult {
  label: string;
  pass: boolean;
  detail?: string;
}

/**
 * Payload REAL da Kiwify, com os dados pessoais trocados por fictícios.
 *
 * A estrutura veio do POST de teste capturado em produção na Fase 4-7F. Só o
 * conteúdo de `Customer` foi substituído — nenhum e-mail, CNPJ ou telefone real
 * entra no repositório.
 */
function kiwifyReal(eventType: string, orderId: string): Record<string, unknown> {
  return {
    webhook_event_type: eventType,
    order_id: orderId,
    order_status: "paid",
    payment_method: "credit_card",
    product_type: "membership",
    Product: {
      product_id: "prod-ficticio-001",
      product_name: "Doce Margem Essencial",
    },
    Customer: {
      email: "Compradora.Ficticia@Exemplo.com ",
      full_name: "Compradora Ficticia",
      cnpj: "00000000000",
      mobile: "0000000000",
    },
  };
}

const ORDER_REAL = "07271940-b573-41a6-9e6a-0e504bf45916";

export function runKiwifyPayloadValidations(): WebhookCheckResult[] {
  const checks: WebhookCheckResult[] = [];
  const check = (label: string, pass: boolean, detail?: string): void => {
    checks.push(detail === undefined ? { label, pass } : { label, pass, detail });
  };

  /* ── Payload REAL da Kiwify (Fase 4-7F) ── */

  const real = extractKiwifyWebhook(kiwifyReal("order_approved", ORDER_REAL));
  check("order_approved vira compra_aprovada", real.eventType === "compra_aprovada");
  check("é acionável", real.isActionable);
  check("order_id vira provider_order_id", real.providerOrderId === ORDER_REAL, String(real.providerOrderId));
  check(
    "sem event_id explícito → chave derivada",
    real.providerEventId === `compra_aprovada:${ORDER_REAL}`,
    String(real.providerEventId),
  );
  check("eventIdSource = derived", real.eventIdSource === "derived", real.eventIdSource);
  check(
    "e-mail vem de Customer.email, normalizado",
    real.buyerEmail === "compradora.ficticia@exemplo.com",
    String(real.buyerEmail),
  );
  check("Product.product_id extraído", real.productId === "prod-ficticio-001", String(real.productId));
  check("Product.product_name extraído", real.productName === "Doce Margem Essencial");
  check("product_type extraído", real.productType === "membership", String(real.productType));
  check("status inicial = received", resolveInitialStatus(real) === "received");

  /* ── order_status = "paid" NÃO pode virar evento sozinho ── */

  const semTipoDeEvento = extractKiwifyWebhook({
    order_id: ORDER_REAL,
    order_status: "paid",
    payment_method: "credit_card",
  });
  check(
    "sem webhook_event_type, 'paid' NÃO vira compra_aprovada",
    semTipoDeEvento.eventType === "unknown",
    semTipoDeEvento.eventType,
  );
  check("e não é acionável", semTipoDeEvento.isActionable === false);

  /* ── Um pedido, três eventos: chaves distintas ── */

  const aprovada = extractKiwifyWebhook(kiwifyReal("order_approved", ORDER_REAL));
  const reembolso = extractKiwifyWebhook(kiwifyReal("order_refunded", ORDER_REAL));
  const chargeback = extractKiwifyWebhook(kiwifyReal("order_chargeback", ORDER_REAL));

  check("order_refunded vira compra_reembolsada", reembolso.eventType === "compra_reembolsada");
  check("order_chargeback vira chargeback", chargeback.eventType === "chargeback");
  check(
    "reembolso do MESMO pedido gera chave diferente",
    reembolso.providerEventId !== aprovada.providerEventId,
    `${aprovada.providerEventId} ≠ ${reembolso.providerEventId}`,
  );
  check(
    "chargeback do MESMO pedido gera chave diferente",
    chargeback.providerEventId !== aprovada.providerEventId &&
      chargeback.providerEventId !== reembolso.providerEventId,
  );
  check(
    "os três compartilham o mesmo provider_order_id",
    aprovada.providerOrderId === ORDER_REAL &&
      reembolso.providerOrderId === ORDER_REAL &&
      chargeback.providerOrderId === ORDER_REAL,
  );
  check(
    "replay do mesmo evento gera chave IDÊNTICA",
    extractKiwifyWebhook(kiwifyReal("order_approved", ORDER_REAL)).providerEventId ===
      aprovada.providerEventId,
  );

  /* ── event_id explícito tem prioridade sobre a derivação ── */

  const comEventId = extractKiwifyWebhook({
    ...kiwifyReal("order_approved", ORDER_REAL),
    webhook_event_id: "evt-da-kiwify-999",
  });
  check("event_id explícito vence a derivação", comEventId.providerEventId === "evt-da-kiwify-999");
  check("eventIdSource = provider", comEventId.eventIdSource === "provider");

  /* ── Sem pedido não há chave: idempotência impossível, e isso fica explícito ── */

  const semPedido = extractKiwifyWebhook({ webhook_event_type: "order_approved" });
  check("sem order_id, providerEventId fica null", semPedido.providerEventId === null);
  check("eventIdSource = none", semPedido.eventIdSource === "none");
  check("deriveEventId(evento, null) = null", deriveEventId("compra_aprovada", null) === null);

  /* ── Formato "plano", nomes em português ── */

  const planoAprovado = {
    webhook_event_type: "compra_aprovada",
    webhook_event_id: "evt_123",
    order_id: "ord_abc",
    Customer: { email: "Maria@Exemplo.com " },
    Product: { product_name: "Doce Margem Essencial" },
  };
  const a = extractKiwifyWebhook(planoAprovado);
  check("compra_aprovada reconhecida", a.eventType === "compra_aprovada");
  check("é acionável", a.isActionable);
  check("event id extraído", a.providerEventId === "evt_123", String(a.providerEventId));
  check("order id extraído", a.providerOrderId === "ord_abc", String(a.providerOrderId));
  check("e-mail normalizado", a.buyerEmail === "maria@exemplo.com", String(a.buyerEmail));
  check("produto extraído", a.productName === "Doce Margem Essencial");
  check("status inicial = received", resolveInitialStatus(a) === "received");

  /* ── Apelidos em inglês ── */

  // Mudou na 4-7F: `order_status` saiu da lista de caminhos de evento, para o
  // status de pagamento nunca virar "compra aprovada" sozinho. Como NOME de
  // evento, porém, 'paid' continua valendo.
  check("'paid' como NOME de evento vira compra_aprovada", extractKiwifyEventType({ event: "paid" }) === "compra_aprovada");
  check("'paid' em order_status NÃO vira evento", extractKiwifyEventType({ order_status: "paid" }) === "unknown");
  check("'APPROVED' maiúsculo funciona", extractKiwifyEventType({ event: "APPROVED" }) === "compra_aprovada");
  check("'refunded' vira compra_reembolsada", extractKiwifyEventType({ event: "refunded" }) === "compra_reembolsada");
  check("'chargedback' vira chargeback", extractKiwifyEventType({ event: "chargedback" }) === "chargeback");

  /* ── Formato aninhado ── */

  const aninhado = {
    data: { event: "compra_reembolsada", order_id: "ord_999", customer: { email: "ana@x.com" } },
  };
  const n = extractKiwifyWebhook(aninhado);
  check("evento aninhado reconhecido", n.eventType === "compra_reembolsada");
  check("order id aninhado", n.providerOrderId === "ord_999", String(n.providerOrderId));
  check("e-mail aninhado", n.buyerEmail === "ana@x.com", String(n.buyerEmail));

  /* ── Evento lido mas fora do escopo → 'ignored', não 'unknown' ── */

  const foraDoEscopo = extractKiwifyWebhook({ webhook_event_type: "boleto_gerado", order_id: "ord_1" });
  check("evento fora do escopo vira 'ignored'", foraDoEscopo.eventType === "ignored");
  check("nome cru é preservado", foraDoEscopo.rawEventName === "boleto_gerado");
  check("não é acionável", foraDoEscopo.isActionable === false);
  check("status inicial = ignored", resolveInitialStatus(foraDoEscopo) === "ignored");

  /* ── Nenhum nome de evento → 'unknown' ── */

  const semEvento = extractKiwifyWebhook({ alguma_coisa: 1 });
  check("sem nome de evento vira 'unknown'", semEvento.eventType === "unknown");
  check("rawEventName fica null", semEvento.rawEventName === null);

  /* ── Nada pode lançar: é a propriedade central do modo captura ── */

  const entradasHostis: unknown[] = [
    null,
    undefined,
    42,
    "texto solto",
    [],
    [{ event: "compra_aprovada" }],
    {},
    { Customer: null },
    { Customer: { email: "" } },
    { order_id: "   " },
    { data: { customer: 7 } },
  ];
  let lancou = false;
  let todosUnknownOuIgnored = true;
  for (const entrada of entradasHostis) {
    try {
      const r = extractKiwifyWebhook(entrada);
      if (r.isActionable) todosUnknownOuIgnored = false;
    } catch {
      lancou = true;
    }
  }
  check("nenhuma entrada hostil lança", lancou === false, `${entradasHostis.length} entradas`);
  check("entrada hostil nunca vira evento acionável", todosUnknownOuIgnored);

  /* ── Campos vazios não viram string vazia ── */

  const vazios = extractKiwifyWebhook({ event: "compra_aprovada", order_id: "  ", Customer: { email: "   " } });
  check("order id só com espaços vira null", vazios.providerOrderId === null);
  check("e-mail só com espaços vira null", vazios.buyerEmail === null);

  /* ── Identificador numérico é aceito (senão perderíamos a idempotência) ── */

  const numerico = extractKiwifyWebhook({ event: "compra_aprovada", webhook_event_id: 987654, order_id: 12345 });
  check("event id numérico vira string", numerico.providerEventId === "987654", String(numerico.providerEventId));
  check("order id numérico vira string", numerico.providerOrderId === "12345", String(numerico.providerOrderId));

  /* ── Coerência com o CHECK da migration 0003 ── */

  const tiposValidos = ["compra_aprovada", "compra_reembolsada", "chargeback", "ignored", "unknown"];
  const amostras: unknown[] = [planoAprovado, aninhado, { event: "boleto_gerado" }, {}, null, 5];
  check(
    "event_type sempre dentro do CHECK da 0003",
    amostras.every((p) => tiposValidos.includes(extractKiwifyEventType(p))),
  );
  check(
    "status inicial sempre 'received' ou 'ignored'",
    amostras.every((p) => ["received", "ignored"].includes(resolveInitialStatus(extractKiwifyWebhook(p)))),
  );

  return checks;
}

/** `true` se todos os extractores se comportam como esperado. */
export function allKiwifyPayloadExamplesPass(): boolean {
  return runKiwifyPayloadValidations().every((r) => r.pass);
}
