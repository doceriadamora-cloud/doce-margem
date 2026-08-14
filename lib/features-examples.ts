import type { UserAccess } from "@/types/access";
import { resolveActivePlan } from "@/types/access";
import {
  ALL_FEATURES,
  canAccessFeature,
  getAccessibleFeatures,
  getFeatureDefinition,
  getLockedFeatures,
  type FeatureKey,
  type FeatureMinimumPlan,
  type FeatureStatus,
} from "./features";

/**
 * Validações manuais da matriz de recursos — Fase 4-4A.
 *
 * Mesmo padrão de `modules/pricing/examples.ts` e `services/storage-examples.ts`:
 * funções puras que comparam esperado × obtido, sem framework de teste (ver
 * DECISIONS.md, 2026-06-27).
 *
 * Não consulta Supabase nem toca em armazenamento — só monta `UserAccess`
 * sintéticos e verifica a matriz.
 */

export interface FeatureCheckResult {
  label: string;
  pass: boolean;
  detail?: string;
}

/** Monta um `UserAccess` coerente, com o plano resolvido pela mesma função do DAL. */
function makeAccess(params: {
  isAuthenticated?: boolean;
  isBlocked?: boolean;
  hasEssential?: boolean;
  hasPro?: boolean;
}): UserAccess {
  const isAuthenticated = params.isAuthenticated ?? true;
  const isBlocked = params.isBlocked ?? false;
  const hasEssential = params.hasEssential ?? false;
  const hasPro = params.hasPro ?? false;
  return {
    userId: isAuthenticated ? "user-de-teste" : null,
    email: isAuthenticated ? "teste@exemplo.com" : null,
    fullName: null,
    isAuthenticated,
    isBlocked,
    hasEssential,
    hasPro,
    plan: resolveActivePlan({ isBlocked, hasEssential, hasPro }),
    proExpiresAt: null,
  };
}

/** Cenários que espelham a matriz de licenças da Fase 4-2A. */
const VISITANTE = makeAccess({ isAuthenticated: false });
const LOGADA_SEM_LICENCA = makeAccess({});
const ESSENCIAL = makeAccess({ hasEssential: true });
// Pro implica Essencial — é assim que o SQL e o DAL devolvem.
const PRO = makeAccess({ hasEssential: true, hasPro: true });
const ESSENCIAL_BLOQUEADA = makeAccess({ hasEssential: true, isBlocked: true });
const PRO_BLOQUEADA = makeAccess({ hasEssential: true, hasPro: true, isBlocked: true });

/**
 * A matriz comercial aprovada em 2026-08-06 (DECISIONS.md), congelada.
 *
 * Mover um recurso de plano deixa de ser um detalhe de implementação e passa a
 * quebrar esta validação — que é o ponto: classificação é decisão comercial, não
 * escolha de quem está editando o arquivo. Para mudar de propósito, altere aqui
 * **e** registre a nova decisão no `DECISIONS.md`.
 *
 * `Record<FeatureKey, …>` de novo: recurso novo em `FeatureKey` não compila até
 * ser classificado nos dois lugares.
 */
const MATRIZ_APROVADA: Record<FeatureKey, `${FeatureMinimumPlan} / ${FeatureStatus}`> = {
  ingredients: "essential / available",
  recipes: "essential / available",
  fixed_costs: "essential / available",
  custom_channels: "essential / available",
  pricing: "essential / available",
  backup_export_import: "essential / available",
  account: "authenticated / available",
  // P0-9A entregou a interface do Modo avançado; a reclassificação passa por
  // aqui de propósito — mudar o status sem confirmar nesta matriz quebra a
  // validação em vez de passar batido.
  advanced_mode: "essential / available",
  // P0-9B entregou a interface de sub-receitas na tela de Receitas.
  sub_recipes: "essential / available",
  household_measures: "essential / planned",
  menu_engineering: "pro_annual / planned",
  price_history: "pro_annual / planned",
  cloud_sync: "pro_annual / planned",
  pdf_export: "pro_annual / planned",
  ai_scanner: "pro_annual / planned",
};

export function runFeatureValidations(): FeatureCheckResult[] {
  const checks: FeatureCheckResult[] = [];
  const check = (label: string, pass: boolean, detail?: string): void => {
    checks.push(detail === undefined ? { label, pass } : { label, pass, detail });
  };

  /* ── Os casos pedidos na especificação da fase ── */

  check(
    "sem licença NÃO acessa pricing",
    canAccessFeature(LOGADA_SEM_LICENCA, "pricing") === false,
  );
  check("Essencial acessa pricing", canAccessFeature(ESSENCIAL, "pricing") === true);
  check(
    "Essencial NÃO acessa cloud_sync",
    canAccessFeature(ESSENCIAL, "cloud_sync") === false,
  );
  check("Pro acessa cloud_sync", canAccessFeature(PRO, "cloud_sync") === true);
  check(
    "bloqueada NÃO acessa pricing (mesmo com Essencial)",
    canAccessFeature(ESSENCIAL_BLOQUEADA, "pricing") === false,
  );

  /* ── Pro é superset do Essencial ── */

  const essenciaisDisponiveis = ALL_FEATURES.filter(
    (f) => f.minimumPlan === "essential",
  ).map((f) => f.key);
  check(
    "Pro acessa TODOS os recursos Essenciais",
    essenciaisDisponiveis.every((key) => canAccessFeature(PRO, key)),
    `verificados: ${essenciaisDisponiveis.length}`,
  );

  const prosTodos = ALL_FEATURES.filter((f) => f.minimumPlan === "pro_annual").map((f) => f.key);
  check(
    "Pro acessa TODOS os recursos Pro",
    prosTodos.every((key) => canAccessFeature(PRO, key)),
    `verificados: ${prosTodos.length}`,
  );
  check(
    "Essencial NÃO acessa NENHUM recurso Pro",
    prosTodos.every((key) => canAccessFeature(ESSENCIAL, key) === false),
  );

  /* ── Bloqueio derruba tudo, inclusive para Pro ── */

  check(
    "Pro bloqueada não acessa NADA",
    ALL_FEATURES.every((f) => canAccessFeature(PRO_BLOQUEADA, f.key) === false),
  );
  check(
    "Pro bloqueada: lista de acessíveis fica vazia",
    getAccessibleFeatures(PRO_BLOQUEADA).length === 0,
  );

  /* ── `account` é acessível a quem está logada sem licença ── */

  check(
    "logada sem licença acessa a própria conta",
    canAccessFeature(LOGADA_SEM_LICENCA, "account") === true,
  );
  check(
    "visitante não logada NÃO acessa a conta",
    canAccessFeature(VISITANTE, "account") === false,
  );
  check(
    "visitante não acessa NADA",
    ALL_FEATURES.every((f) => canAccessFeature(VISITANTE, f.key) === false),
  );

  /* ── Recurso planejado aparece na lista, mas libera conforme o plano ── */

  const planejados = ALL_FEATURES.filter((f) => f.status === "planned");
  check("existem recursos planejados na matriz", planejados.length > 0, `${planejados.length}`);
  check(
    // Era `sub_recipes` até a P0-9B entregar a interface dela; trocado para o
    // recurso que ainda está planejado, senão o rótulo mente.
    "planejado do Essencial libera para Essencial (status não gateia)",
    canAccessFeature(ESSENCIAL, "household_measures") === true,
  );
  check(
    "planejado do Pro NÃO libera para Essencial",
    canAccessFeature(ESSENCIAL, "menu_engineering") === false,
  );
  check(
    "planejado do Pro libera para Pro",
    canAccessFeature(PRO, "menu_engineering") === true,
  );

  /* ── Acessíveis + bloqueados particionam a matriz, sem sobreposição ── */

  for (const [nome, acesso] of [
    ["visitante", VISITANTE],
    ["sem licença", LOGADA_SEM_LICENCA],
    ["Essencial", ESSENCIAL],
    ["Pro", PRO],
    ["Essencial bloqueada", ESSENCIAL_BLOQUEADA],
  ] as const) {
    const acessiveis = getAccessibleFeatures(acesso);
    const bloqueados = getLockedFeatures(acesso);
    const semSobreposicao = acessiveis.every(
      (a) => !bloqueados.some((b) => b.key === a.key),
    );
    check(
      `partição acessíveis+bloqueados = matriz (${nome})`,
      acessiveis.length + bloqueados.length === ALL_FEATURES.length && semSobreposicao,
      `${acessiveis.length} + ${bloqueados.length} = ${ALL_FEATURES.length}`,
    );
  }

  /* ── A classificação comercial aprovada não foi alterada ── */

  const divergencias = ALL_FEATURES.filter(
    (f) => `${f.minimumPlan} / ${f.status}` !== MATRIZ_APROVADA[f.key],
  ).map((f) => `${f.key}: ${f.minimumPlan} / ${f.status} ≠ ${MATRIZ_APROVADA[f.key]}`);
  check(
    "matriz bate com a classificação comercial aprovada",
    divergencias.length === 0,
    divergencias.length === 0
      ? `${ALL_FEATURES.length} recursos conferidos`
      : divergencias.join(" | "),
  );
  check(
    "nenhum recurso da matriz ficou fora da classificação aprovada",
    Object.keys(MATRIZ_APROVADA).length === ALL_FEATURES.length,
    `${Object.keys(MATRIZ_APROVADA).length} × ${ALL_FEATURES.length}`,
  );
  check(
    "os três recursos do 'avançado básico' são Essencial, não Pro",
    (["advanced_mode", "sub_recipes", "household_measures"] as const).every(
      (key) =>
        getFeatureDefinition(key).minimumPlan === "essential" &&
        canAccessFeature(ESSENCIAL, key) === true,
    ),
  );
  check(
    "o Pro Anual tem exatamente os 5 recursos de nuvem/automação/IA/relatórios",
    ALL_FEATURES.filter((f) => f.minimumPlan === "pro_annual")
      .map((f) => f.key)
      .join(",") === "menu_engineering,price_history,cloud_sync,pdf_export,ai_scanner",
  );

  /* ── Integridade da matriz ── */

  check(
    "toda definição tem a mesma chave do índice",
    ALL_FEATURES.every((f) => getFeatureDefinition(f.key).key === f.key),
  );
  check(
    "nenhum recurso tem plano mensal",
    ALL_FEATURES.every((f) =>
      ["authenticated", "essential", "pro_annual"].includes(f.minimumPlan),
    ),
  );
  check(
    "nenhum rótulo ou descrição vazio",
    ALL_FEATURES.every((f) => f.label.trim() !== "" && f.description.trim() !== ""),
  );

  /* ── Falha fechada em chave desconhecida ── */

  const chaveInvalida = "recurso_que_nao_existe" as FeatureKey;
  check(
    "chave desconhecida nega acesso (não lança)",
    canAccessFeature(PRO, chaveInvalida) === false,
  );

  return checks;
}

/** `true` se toda a matriz se comporta como esperado. */
export function allFeatureExamplesPass(): boolean {
  return runFeatureValidations().every((r) => r.pass);
}
