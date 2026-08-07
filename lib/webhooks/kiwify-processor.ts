import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { KiwifyExtraction, WebhookStatus } from "./kiwify-payload";

/**
 * Processamento de webhook da Kiwify — Fase 4-7G.
 *
 * Separado do Route Handler de propósito: o handler cuida de HTTP (autenticar,
 * ler corpo, escolher código de resposta) e este módulo cuida da regra de
 * negócio (quem é a compradora, que licença ela ganha, o que fica registrado).
 * Mesma separação que mantém a matemática em `modules/pricing`.
 *
 * **Só `compra_aprovada` concede licença nesta fase.** Reembolso e chargeback
 * são reconhecidos, gravados e deixados como `received` — a revogação é fase
 * própria. Deixá-los passar sem ação é deliberado: implementar revogação por
 * metade é pior que não implementar.
 *
 * ⚠️ Roda **exclusivamente com service role**, que ignora RLS. Por isso vive
 * atrás de `import "server-only"` e só é importado pelo Route Handler.
 *
 * Todos os valores gravados respeitam os CHECK das migrations:
 *   licenses.product_type  = 'one_time'      (Essencial, vitalício)
 *   licenses.status        = 'active'
 *   licenses.expires_at    = NULL            (obrigatório para one_time)
 *   license_events.event_type = 'granted'
 *   webhook_events.status  = 'processed' | 'failed'
 */

/** Resultado do processamento. O Route Handler traduz isto em código HTTP. */
export type ProcessOutcome =
  /** Gravado, sem ação de licença (evento fora do escopo desta fase). */
  | { kind: "recorded" }
  /** Já processado antes — replay. */
  | { kind: "duplicate" }
  /** Licença Essencial concedida (ou reaproveitada). */
  | { kind: "granted"; userCreated: boolean; licenseCreated: boolean }
  /** Payload aceito mas inutilizável. Registrado como `failed`; reenviar não conserta. */
  | { kind: "rejected"; reason: string }
  /** Falha de infraestrutura. Reenviar **é** a recuperação. */
  | { kind: "storage_error"; code: string };

interface WebhookRow {
  id: string;
  status: string;
}

interface LicenseRow {
  id: string;
  status: string;
}

/** Erro do PostgREST na forma mínima que interessa aqui. */
interface PostgrestErrorish {
  code?: string;
  message?: string;
}

const UNIQUE_VIOLATION = "23505";

/**
 * Escapa curingas de `LIKE` antes de uma busca por e-mail.
 *
 * `ilike` interpreta `%` e `_`, e **`_` é caractere legítimo em e-mail**:
 * `maria_silva@x.com` casaria com `mariaXsilva@x.com` sem isto. Num fluxo que
 * decide de quem é a licença, casar o perfil errado é o pior defeito possível.
 */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/* ─────────────────────── Identidade da compradora ─────────────────────── */

interface UserResolution {
  userId: string | null;
  created: boolean;
  error: string | null;
}

/** Perfil cujo e-mail bate, ignorando maiúsculas. `null` se não houver. */
async function findProfileIdByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<{ id: string | null; error: PostgrestErrorish | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", escapeLikeWildcards(email))
    .limit(1)
    .maybeSingle();

  if (error !== null) return { id: null, error };
  return { id: (data as { id: string } | null)?.id ?? null, error: null };
}

/**
 * Localiza a compradora pelo e-mail da compra; se não existir, **convida**.
 *
 * `inviteUserByEmail` foi escolhido em vez de `createUser` porque é o único
 * caminho que entrega à compradora um link para definir a própria senha. Criar
 * usuário sem convite deixaria uma conta órfã que ela não consegue acessar — e
 * o app ainda não tem tela de recuperação de senha, então ela ficaria presa
 * tendo pago.
 *
 * Nenhuma senha é gerada, transmitida ou registrada em lugar nenhum.
 *
 * O `profiles` correspondente nasce sozinho: o trigger `handle_new_user`
 * (migration 0001) roda no INSERT de `auth.users`, na mesma transação.
 *
 * Se o convite falhar por e-mail já cadastrado — corrida com um cadastro
 * simultâneo, ou envio que criou o usuário mas não entregou a mensagem — a
 * busca é refeita. É isso que torna o reenvio da Kiwify uma recuperação real em
 * vez de uma repetição do mesmo erro.
 */
async function resolveBuyer(supabase: SupabaseClient, email: string): Promise<UserResolution> {
  const existing = await findProfileIdByEmail(supabase, email);
  if (existing.error !== null) {
    return { userId: null, created: false, error: `profile_lookup:${existing.error.code ?? "?"}` };
  }
  if (existing.id !== null) {
    return { userId: existing.id, created: false, error: null };
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error === null && data.user !== null) {
    return { userId: data.user.id, created: true, error: null };
  }

  // Convite falhou. Se foi por já existir, o perfil está lá — busca de novo.
  const retry = await findProfileIdByEmail(supabase, email);
  if (retry.error === null && retry.id !== null) {
    return { userId: retry.id, created: false, error: null };
  }

  // Falha real: SMTP fora do ar, limite de envio, e-mail recusado. NÃO cria
  // usuário por outro caminho — uma conta sem convite é uma conta inacessível.
  return { userId: null, created: false, error: `invite_failed:${error?.code ?? error?.name ?? "?"}` };
}

/* ─────────────────────── Licença ─────────────────────── */

interface LicenseResolution {
  licenseId: string | null;
  created: boolean;
  error: string | null;
}

/**
 * Cria a licença Essencial, ou reaproveita a que já existe para o mesmo pedido.
 *
 * A unicidade `(provider, provider_order_id)` da migration 0002 é o que impede
 * dois pedidos iguais virarem duas licenças. Aqui a consulta vem antes do
 * insert para que o caminho comum de reprocessamento não dependa de provocar
 * um erro de constraint.
 *
 * `expires_at` fica `NULL` obrigatoriamente: o CHECK
 * `licenses_one_time_is_lifetime` rejeita compra única com validade.
 */
async function grantEssentialLicense(
  supabase: SupabaseClient,
  userId: string,
  providerOrderId: string,
): Promise<LicenseResolution> {
  const existing = await supabase
    .from("licenses")
    .select("id, status")
    .eq("provider", "kiwify")
    .eq("provider_order_id", providerOrderId)
    .limit(1)
    .maybeSingle();

  if (existing.error !== null) {
    return { licenseId: null, created: false, error: `license_lookup:${existing.error.code}` };
  }

  const found = existing.data as LicenseRow | null;
  if (found !== null) {
    // Já existe. Reativa só se estiver revogada — uma aprovação nova para o
    // mesmo pedido significa que o pagamento voltou a valer.
    if (found.status !== "active") {
      const { error } = await supabase
        .from("licenses")
        .update({ status: "active" })
        .eq("id", found.id);
      if (error !== null) {
        return { licenseId: null, created: false, error: `license_reactivate:${error.code}` };
      }
    }
    return { licenseId: found.id, created: false, error: null };
  }

  const inserted = await supabase
    .from("licenses")
    .insert({
      user_id: userId,
      product_type: "one_time",
      status: "active",
      expires_at: null,
      provider: "kiwify",
      provider_order_id: providerOrderId,
    })
    .select("id")
    .single();

  if (inserted.error !== null) {
    // Corrida: outra entrega do mesmo webhook inseriu primeiro. Não é erro.
    if (inserted.error.code === UNIQUE_VIOLATION) {
      const again = await supabase
        .from("licenses")
        .select("id, status")
        .eq("provider", "kiwify")
        .eq("provider_order_id", providerOrderId)
        .limit(1)
        .maybeSingle();
      const row = again.data as LicenseRow | null;
      if (row !== null) return { licenseId: row.id, created: false, error: null };
    }
    return { licenseId: null, created: false, error: `license_insert:${inserted.error.code}` };
  }

  return { licenseId: (inserted.data as { id: string }).id, created: true, error: null };
}

/* ─────────────────────── Encerramento da linha de webhook ─────────────────────── */

/** Marca a linha como concluída. O CHECK da 0003 exige `processed_at` fora de `received`. */
async function closeWebhookRow(
  supabase: SupabaseClient,
  webhookId: string,
  fields: {
    status: Exclude<WebhookStatus, "received">;
    userId?: string | null;
    licenseId?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  await supabase
    .from("webhook_events")
    .update({
      status: fields.status,
      processed_at: new Date().toISOString(),
      user_id: fields.userId ?? null,
      license_id: fields.licenseId ?? null,
      // O CHECK `webhook_events_error_only_when_failed` só admite mensagem em
      // `failed`. Mensagens são códigos curtos — nunca payload, nunca e-mail.
      error_message: fields.status === "failed" ? (fields.errorMessage ?? "erro") : null,
    })
    .eq("id", webhookId);
}

/* ─────────────────────── Orquestração ─────────────────────── */

/**
 * Grava o webhook e, se for compra aprovada, concede a licença Essencial.
 *
 * **A idempotência inteira se apoia numa coisa:** o índice único parcial
 * `webhook_events_provider_event_unique`. O insert acontece antes de qualquer
 * trabalho de licença, então um reenvio esbarra na constraint e nunca chega a
 * criar uma segunda licença.
 *
 * O detalhe que faz isso ser recuperação e não só bloqueio: quando o insert
 * colide, a linha existente é inspecionada. Se ela ainda está `received`, o
 * processamento **continua** sobre ela. Sem isso, uma falha entre gravar o
 * webhook e conceder a licença deixaria a compra registrada e nunca liberada —
 * e o reenvio da Kiwify, que é a chance natural de consertar, seria descartado
 * como duplicata.
 */
export async function processKiwifyWebhook(params: {
  supabase: SupabaseClient;
  payload: unknown;
  extraction: KiwifyExtraction;
  initialStatus: WebhookStatus;
}): Promise<ProcessOutcome> {
  const { supabase, payload, extraction, initialStatus } = params;

  const inserted = await supabase
    .from("webhook_events")
    .insert({
      provider: "kiwify",
      event_type: extraction.eventType,
      provider_event_id: extraction.providerEventId,
      provider_order_id: extraction.providerOrderId,
      payload,
      status: initialStatus,
      processed_at: initialStatus === "received" ? null : new Date().toISOString(),
    })
    .select("id, status")
    .single();

  let webhookRow = inserted.data as WebhookRow | null;

  if (inserted.error !== null) {
    if (inserted.error.code !== UNIQUE_VIOLATION) {
      return { kind: "storage_error", code: inserted.error.code ?? "sem código" };
    }
    // Reenvio. Só vale reprocessar se a entrega anterior parou no meio.
    const existing = await supabase
      .from("webhook_events")
      .select("id, status")
      .eq("provider", "kiwify")
      .eq("provider_event_id", extraction.providerEventId)
      .limit(1)
      .maybeSingle();

    const row = existing.data as WebhookRow | null;
    if (row === null || row.status !== "received") {
      return { kind: "duplicate" };
    }
    webhookRow = row;
  }

  if (webhookRow === null) {
    return { kind: "storage_error", code: "sem linha" };
  }

  // Só compra aprovada concede licença nesta fase.
  if (extraction.eventType !== "compra_aprovada") {
    return { kind: "recorded" };
  }

  // Sem e-mail não há a quem conceder; sem pedido não há como amarrar a licença
  // à compra, e o reembolso futuro perderia a referência. Registrado como
  // `failed` para ficar visível — reenviar não conserta payload incompleto.
  if (extraction.buyerEmail === null || extraction.providerOrderId === null) {
    const missing = extraction.buyerEmail === null ? "sem_email" : "sem_order_id";
    await closeWebhookRow(supabase, webhookRow.id, { status: "failed", errorMessage: missing });
    return { kind: "rejected", reason: missing };
  }

  const buyer = await resolveBuyer(supabase, extraction.buyerEmail);
  if (buyer.userId === null) {
    await closeWebhookRow(supabase, webhookRow.id, {
      status: "failed",
      errorMessage: buyer.error ?? "usuaria_nao_resolvida",
    });
    return { kind: "storage_error", code: buyer.error ?? "usuaria_nao_resolvida" };
  }

  const license = await grantEssentialLicense(supabase, buyer.userId, extraction.providerOrderId);
  if (license.licenseId === null) {
    await closeWebhookRow(supabase, webhookRow.id, {
      status: "failed",
      userId: buyer.userId,
      errorMessage: license.error ?? "licenca_nao_criada",
    });
    return { kind: "storage_error", code: license.error ?? "licenca_nao_criada" };
  }

  // Auditoria — só quando a licença nasceu agora. Reprocessar não deve inflar o
  // histórico com "concedida" repetido: `license_events` é append-only e não
  // tem unicidade, então quem controla a duplicação é esta condição.
  //
  // `payload` guarda referências, NÃO o corpo do webhook: os dados pessoais já
  // estão em `webhook_events.payload`, e duplicá-los aqui espalharia PII por
  // duas tabelas com políticas de retenção diferentes.
  if (license.created) {
    await supabase.from("license_events").insert({
      license_id: license.licenseId,
      user_id: buyer.userId,
      event_type: "granted",
      source: "webhook:kiwify",
      payload: {
        webhook_event_id: webhookRow.id,
        provider_event_id: extraction.providerEventId,
        provider_order_id: extraction.providerOrderId,
        product_id: extraction.productId,
      },
    });
  }

  await closeWebhookRow(supabase, webhookRow.id, {
    status: "processed",
    userId: buyer.userId,
    licenseId: license.licenseId,
  });

  return { kind: "granted", userCreated: buyer.created, licenseCreated: license.created };
}
