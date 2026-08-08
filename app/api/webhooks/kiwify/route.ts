import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/services/supabase/admin";
import {
  extractKiwifyWebhook,
  resolveInitialStatus,
  type KiwifyExtraction,
} from "@/lib/webhooks/kiwify-payload";
import { processKiwifyWebhook } from "@/lib/webhooks/kiwify-processor";

/**
 * Webhook da Kiwify — **modo captura** (Fase 4-7C).
 *
 * O que esta rota faz: valida o segredo, recusa lixo, e **grava o payload cru**
 * em `webhook_events`. Só isso.
 *
 * O que ela deliberadamente NÃO faz: criar licença, alterar `licenses`, escrever
 * em `license_events`, resolver `user_id`. A liberação automática é fase
 * própria — e depende de vermos um payload real primeiro. Escrever a concessão
 * de licença sobre suposição de formato seria construir a parte que mexe em
 * dinheiro em cima de chute.
 *
 * **Fase 4-7D:** acrescentado `?signature=` aos portadores aceitos, depois de a
 * Kiwify tomar 401 em produção mandando algo por ali.
 *
 * **Fase 4-7E:** o teste real mostrou `signatureLooksLikeHex=true` — ou seja,
 * `signature` é **assinatura, não token**. O parâmetro passou a ser validado
 * como **HMAC do corpo cru** (SHA-256, depois SHA-1), e a aceitação como token
 * simples foi **removida**, para o mesmo parâmetro não ter duas leituras.
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
 * Compara duas strings em tempo constante.
 *
 * Compara os **hashes**, não os textos: SHA-256 devolve sempre 32 bytes, então
 * nem o comprimento vaza e `timingSafeEqual` nunca lança por tamanhos
 * diferentes. Comparar direto exigiria um `if` de tamanho antes, e esse `if` é
 * justamente um canal lateral.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/** Remove prefixos de algoritmo do tipo `sha256=` que alguns provedores usam. */
function stripAlgorithmPrefix(value: string): string {
  return value.trim().replace(/^(sha256|sha1|hmac-sha256|hmac-sha1)\s*=\s*/i, "");
}

/**
 * Classifica a FORMA da assinatura, nunca o valor.
 *
 * Serve só para diagnóstico: quando um 401 acontece, isto responde "que
 * algoritmo a Kiwify parece estar usando?" sem imprimir um byte do digest.
 */
function classifySignatureFormat(rawSignature: string | null): string {
  if (rawSignature === null) return "none";
  const value = stripAlgorithmPrefix(rawSignature);
  if (value === "") return "empty";
  if (/^[0-9a-f]{64}$/i.test(value)) return "hex-64(sha256?)";
  if (/^[0-9a-f]{40}$/i.test(value)) return "hex-40(sha1?)";
  if (/^[0-9a-f]+$/i.test(value)) return `hex-${value.length}`;
  if (value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return `base64-${value.length}`;
  }
  return "other";
}

/**
 * HMAC do **corpo cru** confere com a assinatura recebida?
 *
 * `rawBody` precisa ser exatamente os bytes que chegaram — daí o handler ler
 * `request.text()` e só depois fazer `JSON.parse`. Reserializar o objeto
 * mudaria espaços e ordem de chaves, e o digest deixaria de bater.
 */
function hmacHexMatches(
  algorithm: "sha256" | "sha1",
  rawBody: string,
  secret: string,
  receivedSignature: string,
): boolean {
  const expected = createHmac(algorithm, secret).update(rawBody, "utf8").digest("hex");
  return constantTimeEquals(expected, stripAlgorithmPrefix(receivedSignature).toLowerCase());
}

/** Como a requisição se autenticou — só para log e diagnóstico. */
type AuthMethod =
  | "header-token"
  | "bearer-token"
  | "query-token"
  | "hmac-sha256"
  | "hmac-sha1"
  | null;

interface AuthOutcome {
  ok: boolean;
  method: AuthMethod;
  /** Linha de log pronta. Só booleanos e classificações — nenhum valor. */
  diagnostics: string;
}

/**
 * Autentica a requisição, em ordem fechada.
 *
 * 1. `x-kiwify-token`        — token simples
 * 2. `Authorization: Bearer` — token simples
 * 3. `?token=`               — token simples
 * 4. `?signature=`           — **HMAC do corpo cru**, SHA-256 e depois SHA-1
 *
 * ⚠️ **`signature` NÃO é mais aceito como token simples** (mudança da Fase
 * 4-7E). A 4-7D o tratava assim, sobre a hipótese de que o painel da Kiwify
 * mandava o próprio segredo ali. O teste real desmentiu: o log de produção
 * registrou `signatureLooksLikeHex=true`, ou seja, um digest. Manter as duas
 * leituras faria o mesmo parâmetro significar duas coisas — e a mais fraca
 * (comparar com o segredo) passaria a valer sempre que a mais forte falhasse,
 * que é exatamente o tipo de fallback silencioso que enfraquece autenticação.
 *
 * ⚠️ **Nada aqui foi confirmado contra uma compra real.** SHA-256 e SHA-1 em
 * hex são as duas convenções mais comuns, e é por isso que ambas são tentadas —
 * mas se a Kiwify usar outra combinação (base64, corpo canonicalizado,
 * segredo diferente do token do painel), o resultado continua sendo 401. O
 * `signatureFormat` no log é o que vai dizer qual delas foi.
 */
function authenticate(request: Request, rawBody: string, secret: string): AuthOutcome {
  const url = new URL(request.url);

  const headerToken = request.headers.get("x-kiwify-token");
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization === null ? null : authorization.replace(/^Bearer\s+/i, "").trim();
  const queryToken = url.searchParams.get("token");
  const querySignature = url.searchParams.get("signature");

  let method: AuthMethod = null;
  if (headerToken && constantTimeEquals(headerToken.trim(), secret)) {
    method = "header-token";
  } else if (bearerToken && constantTimeEquals(bearerToken, secret)) {
    method = "bearer-token";
  } else if (queryToken && constantTimeEquals(queryToken.trim(), secret)) {
    method = "query-token";
  } else if (querySignature) {
    if (hmacHexMatches("sha256", rawBody, secret, querySignature)) method = "hmac-sha256";
    else if (hmacHexMatches("sha1", rawBody, secret, querySignature)) method = "hmac-sha1";
  }

  const flags = {
    hasHeaderToken: Boolean(headerToken),
    hasBearer: Boolean(authorization),
    hasQueryToken: Boolean(queryToken),
    hasQuerySignature: Boolean(querySignature),
    signatureFormat: classifySignatureFormat(querySignature),
    hmacSha256Match: method === "hmac-sha256",
    hmacSha1Match: method === "hmac-sha1",
    tokenCarrierUsed: method ?? "none",
    authResult: method === null ? "denied" : "allowed",
  };

  return {
    ok: method !== null,
    method,
    diagnostics: Object.entries(flags)
      .map(([key, value]) => `${key}=${value}`)
      .join(" "),
  };
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

  // 2. Corpo como TEXTO, antes de autenticar.
  //
  //    A Fase 4-7C autenticava primeiro; **a 4-7E teve que inverter**, porque
  //    HMAC é calculado sobre os bytes recebidos e não há como verificá-lo sem
  //    tê-los em mãos. A garantia que importa continua de pé: payload não
  //    autenticado **nunca chega ao banco** (princípio 2 da migration 0003 —
  //    auditoria que o atacante alimenta não serve para disputa de chargeback).
  //    Ele agora existe em memória por alguns milissegundos, e só.
  //
  //    `request.json()` continua proibido aqui: consumiria o stream e destruiria
  //    os bytes originais, que são a única coisa contra a qual a assinatura pode
  //    ser conferida.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "unreadable_body" }, 400);
  }

  // 3. Autenticar: token simples nos três portadores, depois HMAC do corpo cru.
  const auth = authenticate(request, raw, secret);
  if (!auth.ok) {
    console.warn(`[webhook:kiwify] 401 — ${auth.diagnostics}`);
    return json({ error: "unauthorized" }, 401);
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

  // 5. Gravar e, se for compra aprovada, conceder a licença. A regra de negócio
  //    mora em `lib/webhooks/kiwify-processor.ts`; aqui só se traduz o
  //    resultado em código HTTP.
  const supabase = createSupabaseAdminClient();
  if (supabase === null) {
    console.error("[webhook:kiwify] service role não configurada — requisição recusada");
    return json({ error: "not_configured" }, 500);
  }

  const outcome = await processKiwifyWebhook({
    supabase,
    payload,
    extraction,
    initialStatus: status,
  });

  // Log sem dado pessoal e sem payload: só booleanos e classificações. O corpo
  // cru fica no banco, que é onde se pode consultá-lo com controle de acesso.
  console.info(
    `[webhook:kiwify] ${outcome.kind} — tokenCarrierUsed=${auth.method} ` +
      `evento=${extraction.eventType} bruto=${extraction.rawEventName ?? "—"} ` +
      `eventIdSource=${extraction.eventIdSource} ` +
      `order_id=${extraction.providerOrderId !== null} ` +
      `email=${extraction.buyerEmail !== null} ` +
      `product_id=${extraction.productId !== null}` +
      (outcome.kind === "granted"
        ? ` userCreated=${outcome.userCreated} licenseCreated=${outcome.licenseCreated}` +
          ` auditCreated=${outcome.auditCreated}`
        : "") +
      (outcome.kind === "revoked"
        ? ` motivo=${outcome.reason} jaRevogada=${outcome.alreadyRevoked}` +
          ` auditCreated=${outcome.auditCreated}`
        : "") +
      (outcome.kind === "rejected" ? ` reason=${outcome.reason}` : "") +
      (outcome.kind === "storage_error" ? ` code=${outcome.code}` : ""),
  );

  switch (outcome.kind) {
    case "granted":
    case "revoked":
    case "recorded":
      return json({ received: true }, 200);

    case "duplicate":
      // 2xx é obrigatório: um 4xx faria a Kiwify reenviar para sempre.
      return json({ received: true, duplicate: true }, 200);

    case "rejected":
      // Payload aceito mas inutilizável (sem e-mail, sem pedido). Ficou
      // registrado como `failed` para alguém ver. **200 de propósito:**
      // reenviar não vai fazer o campo aparecer, e um 4xx só produziria
      // repetição infinita do mesmo payload incompleto.
      return json({ received: true, processed: false }, 200);

    case "storage_error":
      // Aqui o reenvio da Kiwify É a recuperação — SMTP fora do ar, banco
      // indisponível, convite recusado. Sem detalhe na resposta.
      return json({ error: "storage_failed" }, 500);
  }

  // Inalcançável enquanto a união estiver completa. Se um resultado novo
  // aparecer e alguém esquecer deste switch, 500 é o lado seguro para errar:
  // faz a Kiwify reenviar, em vez de dar a compra por processada em silêncio.
  return json({ error: "storage_failed" }, 500);
}
