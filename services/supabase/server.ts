import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase de servidor — Fase 4-1B.
 *
 * Usa SEMPRE a chave anônima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) + os cookies da
 * sessão, de modo que toda consulta passe pela RLS da usuária logada.
 * `SUPABASE_SERVICE_ROLE_KEY` **não é lida em lugar nenhum desta fase** — ela
 * ignora RLS e só entra em webhooks (Fase 6) e admin (Fase 7), em arquivo
 * próprio.
 *
 * `import "server-only"` faz o build falhar se alguém importar este módulo num
 * Client Component — é a trava que impede o vazamento acidental para o browser.
 *
 * Nenhuma função aqui lança: se a configuração estiver ausente ou o Supabase
 * estiver fora do ar, devolvem `null`. Isso é deliberado — o app Essencial é
 * local-first (ver DECISIONS.md, 2026-08-05) e precisa continuar funcionando
 * mesmo sem Supabase configurado.
 */

interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** Lê a configuração pública do Supabase. `null` se não estiver configurada. */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** `true` se o app tem Supabase configurado (usado para degradar a UI com elegância). */
export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

/**
 * Cria o cliente de servidor ligado aos cookies da requisição.
 * Devolve `null` quando o Supabase não está configurado.
 */
export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  if (env === null) return null;

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components não podem escrever cookies — só Server Actions e
          // Route Handlers podem. Ignorar aqui é o padrão recomendado pelo
          // @supabase/ssr: a renovação do token acontece nos contextos que
          // conseguem escrever.
        }
      },
    },
  });
}

/**
 * Usuária autenticada, ou `null`.
 *
 * Usa `getUser()` — que **revalida o JWT com o servidor Auth** — e nunca
 * `getSession()`, que apenas lê o cookie e é forjável. Essa distinção é a
 * diferença entre ter e não ter autenticação (ver DECISIONS.md, 2026-08-05).
 *
 * Nunca lança: qualquer falha vira `null` (visitante).
 */
export async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  if (supabase === null) return null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error !== null) return null;
    return data.user;
  } catch {
    return null;
  }
}
