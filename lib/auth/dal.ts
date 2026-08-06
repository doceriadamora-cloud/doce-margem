import "server-only";

import { cache } from "react";
import { createSupabaseServerClient, getAuthUser } from "@/services/supabase/server";
import { ANONYMOUS_ACCESS, resolveActivePlan, type UserAccess } from "@/types/access";

/**
 * Data Access Layer de acesso — Fase 4-3A.
 *
 * Ponto único de consulta de "o que esta usuária pode fazer". A Fase 4-5 vai
 * construir o gating em cima daqui; **esta fase não bloqueia nada**.
 *
 * Garantias de segurança, todas estruturais e não por convenção:
 *
 *  - `import "server-only"` — o build falha se um Client Component importar.
 *  - **Nenhuma função recebe `userId`.** A identidade vem sempre de
 *    `getAuthUser()`, que usa `supabase.auth.getUser()` e revalida o JWT com o
 *    servidor Auth. Não há assinatura por onde a UI consiga pedir o acesso de
 *    outra pessoa.
 *  - Só chama as funções SQL **sem parâmetro** (`current_user_has_*`), que
 *    resolvem `auth.uid()` por dentro. As parametrizadas com `uid` tiveram o
 *    `EXECUTE` revogado do cliente na Fase 4-2A justamente para isso.
 *  - As consultas a tabela não filtram por `user_id`: quem restringe é a **RLS**
 *    (migrations 0001/0002). Confiar na RLS é o ponto — um filtro redundante no
 *    código daria a impressão de que a proteção mora aqui, quando ela mora no
 *    banco.
 *  - `SUPABASE_SERVICE_ROLE_KEY` não é lida em lugar nenhum.
 *
 * Nenhuma função lança: qualquer falha (sem sessão, Supabase fora do ar,
 * migration não aplicada) devolve `ANONYMOUS_ACCESS` — falha fechada.
 */

/** Linha de `profiles` que interessa aqui. Sem tipos gerados do banco ainda. */
interface ProfileRow {
  email: string | null;
  full_name: string | null;
}

/** Linha de `user_access_flags`. */
interface AccessFlagsRow {
  is_blocked: boolean | null;
}

/** Linha de `licenses` usada só para o vencimento informativo do Pro. */
interface ProLicenseRow {
  expires_at: string | null;
}

/**
 * Acesso completo da usuária logada.
 *
 * Memoizado com `cache()` do React: várias chamadas dentro do mesmo render
 * (layout + página, por exemplo) viram uma consulta só. O cache dura o render —
 * não persiste entre requisições, então uma licença revogada aparece na
 * requisição seguinte.
 */
export const getCurrentUserAccess = cache(async (): Promise<UserAccess> => {
  const user = await getAuthUser();
  if (user === null) return ANONYMOUS_ACCESS;

  const supabase = await createSupabaseServerClient();
  if (supabase === null) return ANONYMOUS_ACCESS;

  // Tudo em paralelo: são consultas independentes.
  const [profileResult, flagsResult, essentialResult, proResult, proLicenseResult] =
    await Promise.all([
      supabase.from("profiles").select("email, full_name").maybeSingle(),
      supabase.from("user_access_flags").select("is_blocked").maybeSingle(),
      supabase.rpc("current_user_has_essential_access"),
      supabase.rpc("current_user_has_pro_access"),
      supabase
        .from("licenses")
        .select("expires_at")
        .eq("product_type", "annual_pro")
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const profile = (profileResult.data as ProfileRow | null) ?? null;
  const flags = (flagsResult.data as AccessFlagsRow | null) ?? null;
  const proLicense = (proLicenseResult.data as ProLicenseRow | null) ?? null;

  const isBlocked = flags?.is_blocked === true;

  // Comparação explícita com `true`: erro na RPC devolve `data: null`, e
  // `null === true` é `false` — falha fechada sem precisar de tratamento extra.
  const hasEssentialFromDb = essentialResult.data === true;
  const hasProFromDb = proResult.data === true;

  // As funções SQL já descontam bloqueio. Reaplicar aqui é redundante DE
  // PROPÓSITO: se alguém mexer na regra do lado do banco e esquecer do
  // bloqueio, o TypeScript ainda nega. As duas camadas erram para o mesmo lado.
  const hasEssential = hasEssentialFromDb && !isBlocked;
  const hasPro = hasProFromDb && !isBlocked;

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? null,
    isAuthenticated: true,
    isBlocked,
    hasEssential,
    hasPro,
    plan: resolveActivePlan({ isBlocked, hasEssential, hasPro }),
    // Só informativo. Quem decide vencimento é a função SQL, comparando com
    // now() (DECISIONS.md, 2026-08-05) — esta data serve para exibir.
    proExpiresAt: hasPro ? (proLicense?.expires_at ?? null) : null,
  };
});

/** Atalho: a usuária logada tem acesso ao Essencial? */
export async function hasEssentialAccess(): Promise<boolean> {
  const access = await getCurrentUserAccess();
  return access.hasEssential;
}

/** Atalho: a usuária logada tem Pro anual vigente? */
export async function hasProAccess(): Promise<boolean> {
  const access = await getCurrentUserAccess();
  return access.hasPro;
}
