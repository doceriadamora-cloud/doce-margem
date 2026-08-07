import { createHash, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/services/supabase/admin";
import {
  extractKiwifyWebhook,
  resolveInitialStatus,
  type KiwifyExtraction,
} from "@/lib/webhooks/kiwify-payload";

/**
 * Webhook da Kiwify — **modo captura** (Fase 4-7C).
 *
 * O que esta rota faz: valida o segredo, recusa lixo, e **grava o payload cru**
 * em `webhook_events`. Só isso.
 *
 * O que ela deliberadamente NÃO faz: criar licença, alterar `licenses`, escrever
 * em `license_events`, resolver `user_id`. A liberação automática é a Fase
 * 4-7D — e ela depende de vermos um payload real primeiro. Escrever a concessão
 * de licença sobre suposição de formato seria construir a parte que mexe em
 * dinheiro em cima de chute.
 *
 * Exportar só `POST` faz o Next responder **405** a GET/PUT/DELETE sozinho, com
 * o header `Allow` correto — não é preciso escrever um GET só para recusá-lo.
 *
 * ⚠️ Esta rota **não pode ser gateada**. Quando a Fase 4-5C criar o `proxy.ts`,
 * `/api/webhooks/*` precisa ficar fora do `matcher`: um 307 para `/login` faz a
 * Kiwify desistir, e a venda some sem erro visível em lugar nenhum.
 */

// `node:crypto` para a comparação em tempo constante.
export const runtime = "nodejs";

/* ─────────────────────── Autenticação da requisição ─────────────────────── */

/**
 * Compara em tempo constante.
 *
 * Compara os **hashes**, não os textos: SHA-256 devolve sempre 32 bytes, então
 * nem o comprimento do segredo vaza. Comparar direto exigiria um `if` de
 * tamanho antes do `timingSafeEqual` (que lança com buffers de tamanhos
 * diferentes), e esse `if` é justamente um canal lateral.
 */
function secretsMatch(candidate: string, secret: string): boolean {
  const a = createHash("sha256").update(candidate, "utf8").digest();
  const b = createHash("sha256").update(secret, "utf8").digest();
  return timingSafeEqual(a, b);
}

/**
 * Onde o segredo pode vir.
 *
 * ⚠️ **A forma real de autenticação da Kiwify ainda não foi observada.** As três
 * abaixo são as combinações previstas; se a Kiwify usar outra (o parâmetro
 * `?signature=` com HMAC do corpo é a hipótese mais provável), a requisição vai
 * receber 401 e **nada será capturado**. Para que isso não vire um mistério
 * silencioso, o 401 registra no log do servidor quais portadores estavam
 * presentes — sem nunca imprimir o valor de nenhum.
 */
function collectTokenCandidates(request: Request): string[] {
  const url = new URL(request.url);
  const candidates: string[] = [];

  const headerToken = request.headers.get("x-kiwify-token");
  if (headerToken) candidates.push(headerToken.trim());

  const authorization = request.headers.get("authorization");
  if (authorization) {
    const bearer = authorization.replace(/^Bearer\s+/i, "").trim();
    if (bearer !== "") candidates.push(bearer);
  }

  const queryToken = url.searchParams.get("token");
  if (queryToken) candidates.push(queryToken.trim());

  return candidates;
}

/** Diagnóstico de 401: quais portadores vieram, nunca o que vinha neles. */
function describeCarriers(request: Request): string {
  const url = new URL(request.url);
  const present: string[] = [];
  if (request.headers.get("x-kiwify-token")) present.push("x-kiwify-token");
  if (request.headers.get("authorization")) present.push("authorization");
  if (url.searchParams.get("token")) present.push("?token");
  // Não é aceito como token, mas saber que veio identifica o mecanismo real.
  if (url.searchParams.get("signature")) present.push("?signature(HMAC?)");
  return present.length === 0 ? "nenhum" : present.join(", ");
}

/* ─────────────────────── Respostas ─────────────────────── */

/**
 * Corpos propositalmente pobres.
 *
 * Um webhook é endpoint público. Detalhar "e-mail não encontrado" ou "pedido X
 * já processado" o transformaria em oráculo sobre a base de clientes.
 */
function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status });
}

/* ─────────────────────── Handler ─────────────────────── */

export async function POST(request: Request): Promise<Response> {
  // 1. Segredo configurado? Falha fechada — nunca "sem segredo, aceita".
  //    É a mesma regra da decisão de 2026-08-06 sobre gating, e aqui pesa mais:
  //    um endpoint público sem verificação concede o que pedirem.
  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook:kiwify] KIWIFY_WEBHOOK_SECRET ausente — requisição recusada");
    return json({ error: "not_configured" }, 500);
  }

  // 2. Autenticar ANTES de ler o corpo. Payload não autenticado não chega perto
  //    do banco — nem como linha de auditoria (princípio 2 da migration 0003:
  //    auditoria que o atacante alimenta não serve para disputa de chargeback).
  const candidates = collectTokenCandidates(request);
  const authenticated = candidates.some((candidate) => secretsMatch(candidate, secret));
  if (!authenticated) {
    console.warn(`[webhook:kiwify] 401 — portadores presentes: ${describeCarriers(request)}`);
    return json({ error: "unauthorized" }, 401);
  }

  // 3. Corpo como TEXTO primeiro. Se a validação virar HMAC na Fase 4-7D, ela
  //    será sobre estes bytes — `request.json()` consumiria o stream e destruiria
  //    a única evidência verificável.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "unreadable_body" }, 400);
  }
  if (raw.trim() === "") {
    return json({ error: "empty_body" }, 400);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // 4. Extração tolerante. Não rejeita formato inesperado: gravar o que não se
  //    entendeu é justamente o objetivo do modo captura.
  const extraction: KiwifyExtraction = extractKiwifyWebhook(payload);
  const status = resolveInitialStatus(extraction);

  // 5. Gravar.
  const supabase = createSupabaseAdminClient();
  if (supabase === null) {
    console.error("[webhook:kiwify] service role não configurada — requisição recusada");
    return json({ error: "not_configured" }, 500);
  }

  const { error } = await supabase.from("webhook_events").insert({
    provider: "kiwify",
    event_type: extraction.eventType,
    provider_event_id: extraction.providerEventId,
    provider_order_id: extraction.providerOrderId,
    // `user_id` e `license_id` ficam nulos de propósito: resolver a compradora
    // é trabalho da Fase 4-7D, depois de sabermos onde o e-mail realmente vem.
    payload,
    status,
    // O CHECK `webhook_events_processed_at_coherent` (migration 0003) exige esta
    // coerência: `received` sem carimbo, qualquer outro estado com carimbo.
    processed_at: status === "received" ? null : new Date().toISOString(),
  });

  if (error !== null) {
    // 23505 = unique_violation. É o índice parcial
    // `webhook_events_provider_event_unique` fazendo o trabalho dele: reenvio do
    // mesmo evento. Responder 2xx é obrigatório — um 4xx aqui faria a Kiwify
    // reenviar para sempre.
    if (error.code === "23505") {
      return json({ received: true, duplicate: true }, 200);
    }
    // Sem `error.message` na resposta: pode conter nome de coluna e detalhe de
    // constraint. 500 é o código certo — aqui o reenvio da Kiwify É a recuperação.
    console.error(`[webhook:kiwify] falha ao gravar (${error.code ?? "sem código"})`);
    return json({ error: "storage_failed" }, 500);
  }

  // Log sem dado pessoal e sem payload: só o suficiente para acompanhar a
  // captura. `payload` cru fica no banco, que é onde se pode consultá-lo com
  // controle de acesso.
  console.info(
    `[webhook:kiwify] gravado — evento=${extraction.eventType} ` +
      `bruto=${extraction.rawEventName ?? "—"} status=${status} ` +
      `event_id=${extraction.providerEventId !== null} ` +
      `order_id=${extraction.providerOrderId !== null} ` +
      `email=${extraction.buyerEmail !== null}`,
  );

  return json({ received: true }, 200);
}
