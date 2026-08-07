import {
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

export function runKiwifyPayloadValidations(): WebhookCheckResult[] {
  const checks: WebhookCheckResult[] = [];
  const check = (label: string, pass: boolean, detail?: string): void => {
    checks.push(detail === undefined ? { label, pass } : { label, pass, detail });
  };

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

  check("'paid' vira compra_aprovada", extractKiwifyEventType({ order_status: "paid" }) === "compra_aprovada");
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
