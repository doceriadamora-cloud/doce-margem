import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "./dal";
import type { UserAccess } from "@/types/access";

/**
 * Guardas de acesso server-side — Fase 4-5A.
 *
 * Camada 2 do modelo de três defesas do `PLAN-FASE-4.md`: a autorização de
 * verdade. O `proxy.ts` (camada 1, Fase 4-5B) é só UX; a RLS (camada 3) é a
 * última linha. É **aqui** que uma rota decide se pode renderizar.
 *
 * Herda do DAL as mesmas garantias estruturais, e acrescenta uma:
 *
 *  - `import "server-only"` — o build falha se um Client Component importar.
 *  - **Nenhuma função recebe `userId`.** A identidade vem de
 *    `getCurrentUserAccess()`, que a resolve com `supabase.auth.getUser()`
 *    (revalida o JWT). Não existe assinatura por onde a UI peça o acesso de
 *    outra pessoa — e, como não há parâmetro, não há o que forjar.
 *  - **Não consulta o Supabase.** Este arquivo não importa
 *    `services/supabase/*`: só consome o `UserAccess` que o DAL já resolveu.
 *    Ponto único de consulta continua sendo o DAL.
 *  - `SUPABASE_SERVICE_ROLE_KEY` não é lida aqui nem no que este módulo importa.
 *
 * O custo é uma consulta só: `getCurrentUserAccess` é memoizado com `cache()`
 * do React, então layout e página chamando o guarda no mesmo render resolvem
 * uma vez. O cache não atravessa requisições — licença revogada vale na
 * requisição seguinte (DECISIONS.md, 2026-08-05).
 *
 * ⚠️ **Nesta subfase os guardas existem, mas quase ninguém os usa.** Só `/conta`
 * chama `requireAuthenticatedAccess()`. Aplicar `requireEssentialAccess()` nas
 * telas locais é a Fase 4-5B — e depende de uma decisão registrada no
 * `REVIEW.md` sobre o app continuar funcionando sem Supabase configurado.
 */

/** Para onde vai quem não tem sessão. */
export const LOGIN_PATH = "/login";

/** Para onde vai quem está logada mas não tem o direito exigido. */
export const BLOCKED_PATH = "/acesso-bloqueado";

/**
 * Exige apenas **sessão válida** — nenhuma licença.
 *
 * Deliberadamente **não** barra conta bloqueada, e isso não é esquecimento:
 * quem está bloqueada precisa conseguir abrir `/conta` para ver o próprio
 * status e sair da conta. Barrar aqui mandaria a usuária para
 * `/acesso-bloqueado`, cujo botão principal leva justamente a `/conta` — um
 * beco sem saída. O bloqueio derruba **licença**, e é nos dois guardas abaixo
 * que ele age.
 *
 * Coerente com a Fase 4-4A, onde `account` é `minimumPlan: "authenticated"`
 * pelo mesmo motivo: é a tela para onde vai quem ainda não pode entrar no resto.
 */
export async function requireAuthenticatedAccess(): Promise<UserAccess> {
  const access = await getCurrentUserAccess();
  if (!access.isAuthenticated) redirect(LOGIN_PATH);
  return access;
}

/**
 * Exige acesso ao **Doce Margem Essencial**.
 *
 * Pro passa aqui sem checagem extra: o DAL já devolve `hasEssential = true`
 * para Pro vigente, porque a regra "Pro implica Essencial" mora no SQL
 * (`current_user_has_essential_access`) e é reafirmada no DAL. Espalhar
 * `|| hasPro` pelos guardas seria uma terceira cópia da mesma regra.
 */
export async function requireEssentialAccess(): Promise<UserAccess> {
  const access = await requireAuthenticatedAccess();
  // `hasEssential` já é `false` para conta bloqueada (o SQL desconta e o DAL
  // reaplica). A terceira checagem é de propósito: se um dia alguém mexer na
  // regra do banco e esquecer do bloqueio, as três camadas erram para o mesmo
  // lado — negar.
  if (access.isBlocked || !access.hasEssential) redirect(BLOCKED_PATH);
  return access;
}

/**
 * Exige **Pro Anual vigente**.
 *
 * Compra única não concede Pro — são produtos diferentes (DECISIONS.md,
 * 2026-06-27). Vencimento é decidido pelo SQL comparando com `now()`;
 * `proExpiresAt` no `UserAccess` é só para exibir.
 */
export async function requireProAccess(): Promise<UserAccess> {
  const access = await requireAuthenticatedAccess();
  if (access.isBlocked || !access.hasPro) redirect(BLOCKED_PATH);
  return access;
}
