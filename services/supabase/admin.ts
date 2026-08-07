import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com **service role** — Fase 4-7C.
 *
 * ⚠️ Este cliente **ignora RLS por completo**. É o único caminho de escrita em
 * `licenses`, `license_events`, `user_access_flags` e `webhook_events`, e é
 * também a maior superfície de risco do projeto. Regras de uso:
 *
 *  1. **Só em Route Handler server-side.** Nunca em Server Component, nunca em
 *     Server Action, nunca em Client Component.
 *  2. **Arquivo separado de `server.ts` de propósito.** Aquele é importado pelo
 *     app inteiro; se a service role morasse lá, um import distraído levaria
 *     uma chave que ignora RLS para perto de código de sessão.
 *  3. **A chave nunca é exportada, retornada nem logada.** Só o cliente sai
 *     daqui.
 *  4. **Sem prefixo `NEXT_PUBLIC_`** — se algum dia aparecer, vaza no bundle.
 *
 * `import "server-only"` faz o build falhar se um Client Component importar. É a
 * trava mecânica que sustenta a regra 1.
 *
 * Falha fechada: sem configuração, devolve `null` e quem chamou deve recusar a
 * requisição. Nunca degrada para a chave anônima — silenciosamente escrever com
 * menos privilégio produziria erro de RLS mascarado de erro de dados.
 */

/**
 * Cria o cliente admin. `null` quando `NEXT_PUBLIC_SUPABASE_URL` ou
 * `SUPABASE_SERVICE_ROLE_KEY` estiverem ausentes ou vazias.
 *
 * Sessão desligada em todas as frentes: este cliente não representa ninguém, é
 * um processo de servidor. `persistSession` guardaria estado entre requisições
 * num contexto que não tem usuária.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * `true` se a service role está configurada.
 *
 * Existe para o handler poder distinguir "não configurado" (erro de deploy,
 * merece 500) de "falhou ao gravar" (erro de banco) — sem nunca tocar no valor
 * da chave.
 */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
