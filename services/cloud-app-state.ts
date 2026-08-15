/**
 * Cópia em nuvem do estado da usuária — Fase P0-10.
 *
 * Fala com `public.user_app_state` (migration 0005) usando o client de
 * **navegador** com a chave anônima, sujeito à RLS: a policy garante que cada
 * conta só enxerga a própria linha. Nenhuma função aqui recebe `userId` de
 * fora — a identidade vem sempre de `getUser()`, que revalida o JWT com o
 * servidor Auth. Não há assinatura por onde pedir o estado de outra pessoa.
 *
 * **Nunca lança.** Todo caminho de falha vira um resultado tipado, porque o app
 * precisa continuar funcionando com localStorage quando a nuvem não responde —
 * inclusive antes de a migration 0005 ser aplicada.
 *
 * Fora do barrel `services/index.ts` de propósito: este módulo só existe no
 * navegador, e quem precisa dele importa direto.
 */

import { createSupabaseBrowserClient } from "@/services/supabase/client";
import { normalizeAppState } from "@/services/storage-service";
import type { AppState } from "@/types/app-state";

/** Nome da tabela criada em `supabase/migrations/0005_user_app_state.sql`. */
const TABLE = "user_app_state";

/** Por que a nuvem não pôde ser usada agora. */
export type CloudUnavailableReason =
  /** Supabase não configurado neste ambiente (env ausente). */
  | "not-configured"
  /** Sem sessão válida — visitante ou sessão expirada. */
  | "not-authenticated"
  /** A migration 0005 ainda não foi aplicada neste projeto Supabase. */
  | "missing-table"
  /** Sem internet ou servidor inalcançável. */
  | "network"
  /** Qualquer outra falha. */
  | "error";

export type CloudLoadResult =
  | { status: "loaded"; state: AppState; updatedAt: string }
  /** Autenticada, mas ainda não existe linha para esta conta. */
  | { status: "empty" }
  | { status: "unavailable"; reason: CloudUnavailableReason };

export type CloudSaveResult =
  | { status: "saved"; savedAt: string }
  | { status: "unavailable"; reason: CloudUnavailableReason };

/** Forma mínima do erro do PostgREST que precisamos inspecionar. */
interface PostgrestErrorish {
  code?: string;
  message?: string;
}

/**
 * A tabela ainda não existe neste projeto?
 *
 * Distinguir isto de "deu erro" é o que permite o app dizer "salvo neste
 * navegador" em vez de "erro ao salvar" enquanto a migration não for aplicada.
 * `42P01` é o `undefined_table` do Postgres; `PGRST205` é como o PostgREST
 * reporta tabela ausente do cache de schema.
 */
function isMissingTable(error: PostgrestErrorish): boolean {
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const message = (error.message ?? "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache");
}

/** Falha de rede se distingue de erro de banco: uma se resolve sozinha, a outra não. */
function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("fetch") || message.includes("network");
}

function classify(error: unknown): CloudUnavailableReason {
  if (isNetworkFailure(error)) return "network";
  if (typeof error === "object" && error !== null && isMissingTable(error)) {
    return "missing-table";
  }
  return "error";
}

/**
 * Id da usuária logada, ou `null`.
 *
 * Usa `getUser()` — que revalida o JWT — e nunca `getSession()`, que só lê o
 * cookie e é forjável. É a mesma regra do DAL do servidor (DECISIONS.md,
 * 2026-08-05); aqui ela vale igual, apesar de o alvo ser só o próprio dado.
 */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  if (supabase === null) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error !== null) return null;
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Lê o estado salvo na nuvem para a conta logada.
 *
 * O que vem do banco passa por `normalizeAppState` antes de ser devolvido:
 * payload corrompido ou de outra versão de schema vira estado vazio em vez de
 * quebrar o app — e, como o chamador compara datas antes de hidratar, um estado
 * vazio da nuvem não apaga o que existe no navegador.
 */
export async function loadCloudAppState(): Promise<CloudLoadResult> {
  const supabase = createSupabaseBrowserClient();
  if (supabase === null) return { status: "unavailable", reason: "not-configured" };

  const userId = await getCurrentUserId();
  if (userId === null) return { status: "unavailable", reason: "not-authenticated" };

  try {
    // Sem filtro por `user_id`: quem restringe é a RLS. `maybeSingle` devolve
    // `null` sem erro quando ainda não há linha — o caso normal do primeiro uso.
    const { data, error } = await supabase
      .from(TABLE)
      .select("app_state, schema_version, updated_at")
      .maybeSingle();

    if (error !== null) {
      return { status: "unavailable", reason: classify(error) };
    }
    if (data === null) {
      return { status: "empty" };
    }

    const state = normalizeAppState(data.app_state);
    return { status: "loaded", state, updatedAt: state.updatedAt };
  } catch (error) {
    return { status: "unavailable", reason: classify(error) };
  }
}

/**
 * Grava (ou substitui) o estado da conta logada na nuvem.
 *
 * `upsert` com conflito em `user_id` — que é PRIMARY KEY, então há no máximo
 * uma linha por conta, por construção. Não existe caminho que crie duas.
 */
export async function saveCloudAppState(state: AppState): Promise<CloudSaveResult> {
  const supabase = createSupabaseBrowserClient();
  if (supabase === null) return { status: "unavailable", reason: "not-configured" };

  const userId = await getCurrentUserId();
  if (userId === null) return { status: "unavailable", reason: "not-authenticated" };

  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        user_id: userId,
        app_state: state,
        schema_version: state.schemaVersion,
      },
      { onConflict: "user_id" },
    );

    if (error !== null) {
      return { status: "unavailable", reason: classify(error) };
    }
    return { status: "saved", savedAt: new Date().toISOString() };
  } catch (error) {
    return { status: "unavailable", reason: classify(error) };
  }
}
