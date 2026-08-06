/**
 * Tipos de acesso e licença — Fase 4-3A.
 *
 * Separado de `types/pricing.ts` de propósito: é outro domínio. Precificação é
 * matemática pura; isto é identidade e direito de uso.
 *
 * `ProductType` e `LicenseStatus` espelham exatamente os `CHECK` de
 * `supabase/migrations/0002_licenses.sql`. Se um valor for adicionado lá, tem
 * que ser adicionado aqui — e vice-versa. Manter os dois em sincronia é o mesmo
 * risco de divergência TypeScript × SQL registrado no `PLAN-FASE-4.md`.
 */

/**
 * O que a usuária comprou.
 *  - `one_time`   → Doce Margem Essencial (compra única, vitalícia)
 *  - `annual_pro` → Doce Margem Pro Anual (assinatura)
 *
 * Não existe plano mensal (DECISIONS.md, 2026-06-27).
 */
export type ProductType = "one_time" | "annual_pro";

/** Situação da licença. Qualquer valor diferente de `active` revoga aquela licença. */
export type LicenseStatus =
  | "active"
  | "refunded"
  | "chargeback"
  | "cancelled"
  | "expired";

/** Maior plano ativo da usuária, já resolvido. */
export type ActivePlan = "none" | "essential" | "pro_annual";

/**
 * Retrato do acesso da usuária logada, num instante.
 *
 * Sempre **calculado**, nunca persistido — é o que faz um reembolso ter efeito
 * imediato, sem cache para expirar (DECISIONS.md, 2026-08-05). Não guarde este
 * objeto em lugar nenhum: recalcule.
 *
 * Para visitante não autenticado (ou Supabase não configurado), todos os campos
 * de acesso vêm em `false`/`null` — falha fechada.
 */
export interface UserAccess {
  userId: string | null;
  email: string | null;
  fullName: string | null;

  isAuthenticated: boolean;
  /** Bloqueio manual do admin. Quando `true`, derruba todo acesso. */
  isBlocked: boolean;

  /** Compra única ativa OU Pro vigente. Pro implica Essencial. */
  hasEssential: boolean;
  /** Pro anual ativo e não vencido. Compra única NÃO concede Pro. */
  hasPro: boolean;

  plan: ActivePlan;
  /** ISO da validade do Pro vigente, ou `null`. Só informativo — não decide acesso. */
  proExpiresAt: string | null;
}

/**
 * Acesso de quem não está logado — e também o retorno seguro quando algo falha
 * (Supabase fora do ar, migration não aplicada, erro de rede).
 *
 * Congelado para que ninguém mute o objeto compartilhado por engano.
 */
export const ANONYMOUS_ACCESS: UserAccess = Object.freeze({
  userId: null,
  email: null,
  fullName: null,
  isAuthenticated: false,
  isBlocked: false,
  hasEssential: false,
  hasPro: false,
  plan: "none",
  proExpiresAt: null,
});

/**
 * Resolve o maior plano ativo.
 *
 * Função pura e exportada para poder ser verificada isoladamente contra a
 * matriz de casos do `REVIEW.md` (Fase 4-2A) — o instrumento previsto para
 * provar que TypeScript e SQL não divergem.
 */
export function resolveActivePlan(params: {
  isBlocked: boolean;
  hasEssential: boolean;
  hasPro: boolean;
}): ActivePlan {
  if (params.isBlocked) return "none";
  if (params.hasPro) return "pro_annual";
  if (params.hasEssential) return "essential";
  return "none";
}
