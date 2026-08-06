import type { UserAccess } from "@/types/access";

/**
 * Matriz de recursos por plano — Fase 4-4A.
 *
 * Fonte única da verdade sobre o que pertence ao Essencial e o que pertence ao
 * Pro Anual. Em **código**, versionado e type-safe — nunca em tabela (ver
 * DECISIONS.md, 2026-08-05: uma flag no banco custaria uma consulta por
 * verificação, ficaria fora do controle de versão e permitiria abrir um recurso
 * Pro com um UPDATE, sem review).
 *
 * Módulo **puro**: não importa `services/supabase`, não consulta banco, não lê
 * cookie. `canAccessFeature` depende exclusivamente de um `UserAccess` que
 * alguém já resolveu — o que o torna testável isolado e utilizável tanto em
 * Server quanto em Client Component.
 *
 * ⚠️ Esta fase **não bloqueia nada**. O gating entra na Fase 4-5, construído
 * por cima daqui.
 */

/* ──────────────────────────── Tipos ──────────────────────────── */

export type FeatureKey =
  // Essencial — já disponíveis
  | "ingredients"
  | "recipes"
  | "fixed_costs"
  | "custom_channels"
  | "pricing"
  | "backup_export_import"
  | "account"
  // Essencial — planejados (motor existe, interface não)
  | "advanced_mode"
  | "sub_recipes"
  | "household_measures"
  // Pro Anual — planejados
  | "menu_engineering"
  | "price_history"
  | "cloud_sync"
  | "pdf_export"
  | "ai_scanner";

/**
 * Plano mínimo para usar o recurso.
 *
 * `"authenticated"` não estava previsto na especificação e foi acrescentado por
 * um motivo concreto: `account` (a tela `/conta`) precisa ser acessível a quem
 * está logada **sem licença nenhuma** — é justamente onde ela vê "Sem licença
 * ativa" e, futuramente, o botão de comprar. Classificá-la como `"essential"`
 * criaria, na Fase 4-5, o bug de trancar a porta exatamente para quem quer
 * entrar.
 *
 * Não existe plano mensal (DECISIONS.md, 2026-06-27).
 */
export type FeatureMinimumPlan = "authenticated" | "essential" | "pro_annual";

/** Se o recurso já existe na interface ou ainda é promessa. */
export type FeatureStatus = "available" | "planned";

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  minimumPlan: FeatureMinimumPlan;
  /**
   * Informativo. **Não** participa de `canAccessFeature` — um recurso
   * `planned` continua respondendo pelo plano, para que a tela de preços e os
   * selos "em breve" possam ser montados a partir desta mesma matriz.
   */
  status: FeatureStatus;
}

/* ──────────────────────────── Matriz ──────────────────────────── */

/**
 * `Record<FeatureKey, …>` de propósito: o TypeScript exige exaustividade, então
 * adicionar uma chave em `FeatureKey` sem definir o recurso aqui **não
 * compila**. É a garantia de que nenhum recurso nasce sem classificação.
 */
const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  /* ── Essencial, disponíveis hoje ── */
  ingredients: {
    key: "ingredients",
    label: "Ingredientes",
    description: "Cadastre o que você compra e descubra o custo real por grama, ml ou unidade.",
    minimumPlan: "essential",
    status: "available",
  },
  recipes: {
    key: "recipes",
    label: "Receitas",
    description: "Monte a ficha técnica e veja o custo total e o custo por unidade de cada doce.",
    minimumPlan: "essential",
    status: "available",
  },
  fixed_costs: {
    key: "fixed_costs",
    label: "Custos fixos",
    description: "Cadastre aluguel, energia e demais custos mensais, e veja quanto pesam no preço.",
    minimumPlan: "essential",
    status: "available",
  },
  custom_channels: {
    key: "custom_channels",
    label: "Canais de venda customizados",
    description: "Além dos canais prontos, cadastre canais próprios com suas taxas.",
    minimumPlan: "essential",
    status: "available",
  },
  pricing: {
    key: "pricing",
    label: "Precificação",
    description: "Preço sugerido, margem e markup, com ou sem taxas de canal.",
    minimumPlan: "essential",
    status: "available",
  },
  backup_export_import: {
    key: "backup_export_import",
    label: "Backup dos dados",
    description: "Exporte e importe seus dados em arquivo, para não depender de um só aparelho.",
    minimumPlan: "essential",
    status: "available",
  },
  account: {
    key: "account",
    label: "Minha conta",
    description: "Seus dados de acesso, plano atual e validade da assinatura.",
    // Ver a nota em `FeatureMinimumPlan`: quem não tem licença precisa entrar aqui.
    minimumPlan: "authenticated",
    status: "available",
  },

  /* ── Essencial, ainda não expostos na interface ──
   *
   * Classificação confirmada como decisão comercial em 2026-08-06 (DECISIONS.md):
   * estes três compõem o "avançado básico" do Essencial, coerente com a tabela
   * de planos do README ("Modo simples + avançado básico", ✅ nas duas colunas).
   *
   * O motor de cálculo dos três já existe desde a Fase 1B — falta só a
   * interface, que é a Fase 3 do TASKS.md. Daí `status: "planned"` com
   * `minimumPlan: "essential"`: são perguntas diferentes, e só a segunda
   * depende de a gente escrever a tela.
   */
  advanced_mode: {
    key: "advanced_mode",
    label: "Modo avançado",
    description: "Fator de correção, perda de produção e demais ajustes finos da ficha técnica.",
    minimumPlan: "essential",
    status: "planned",
  },
  sub_recipes: {
    key: "sub_recipes",
    label: "Sub-receitas",
    description: "Use uma receita dentro de outra, como um recheio que vira parte do bolo.",
    minimumPlan: "essential",
    status: "planned",
  },
  household_measures: {
    key: "household_measures",
    label: "Medidas caseiras",
    description: "Informe quantidades em xícaras e colheres, sem precisar de balança.",
    minimumPlan: "essential",
    status: "planned",
  },

  /* ── Pro Anual, planejados ──
   *
   * Critério do Pro (decisão comercial de 2026-08-06, DECISIONS.md): recorrência,
   * nuvem, automação, IA e relatórios. Recurso que não se encaixa em nenhum
   * desses cinco eixos pertence ao Essencial — é a régua para classificar
   * qualquer recurso novo daqui em diante.
   */
  menu_engineering: {
    key: "menu_engineering",
    label: "Engenharia de cardápio",
    description:
      "Cruze popularidade e margem para saber quais doces puxam o lucro e quais só dão trabalho.",
    minimumPlan: "pro_annual",
    status: "planned",
  },
  price_history: {
    key: "price_history",
    label: "Histórico de preços",
    description: "Acompanhe a variação do custo dos ingredientes ao longo do tempo.",
    minimumPlan: "pro_annual",
    status: "planned",
  },
  cloud_sync: {
    key: "cloud_sync",
    label: "Sincronização em nuvem",
    description: "Seus dados em vários aparelhos, sempre atualizados.",
    minimumPlan: "pro_annual",
    status: "planned",
  },
  pdf_export: {
    key: "pdf_export",
    label: "Exportação em PDF",
    description: "Gere fichas técnicas e tabelas de preço prontas para imprimir ou enviar.",
    minimumPlan: "pro_annual",
    status: "planned",
  },
  ai_scanner: {
    key: "ai_scanner",
    label: "Scanner de nota com IA",
    description: "Fotografe a nota do mercado e atualize os preços dos ingredientes de uma vez.",
    minimumPlan: "pro_annual",
    status: "planned",
  },
};

/** Todos os recursos, na ordem de declaração da matriz. */
export const ALL_FEATURES: readonly FeatureDefinition[] = Object.freeze(Object.values(FEATURES));

/* ──────────────────────────── Consultas ──────────────────────────── */

/**
 * Definição de um recurso.
 *
 * O tipo já garante que a chave existe. A checagem em tempo de execução cobre o
 * caso de uma string vinda de fora do TypeScript (JSON, query string), em que
 * devolver `undefined` seria pior do que falhar alto.
 */
export function getFeatureDefinition(feature: FeatureKey): FeatureDefinition {
  const definition = FEATURES[feature];
  if (definition === undefined) {
    throw new Error(`Recurso desconhecido: ${String(feature)}`);
  }
  return definition;
}

/**
 * A usuária pode usar este recurso?
 *
 * Depende **apenas** do `UserAccess` recebido — nenhuma consulta, nenhum efeito
 * colateral. Falha fechada em todos os caminhos: bloqueio, plano insuficiente e
 * chave desconhecida devolvem `false`.
 *
 * `status` não entra na conta: um recurso `planned` responde pelo plano dele,
 * porque a tela de preços precisa mostrar "o Pro terá isto" sem que a matriz
 * minta sobre a que plano pertence.
 */
export function canAccessFeature(access: UserAccess, feature: FeatureKey): boolean {
  // Bloqueio manual derruba tudo, antes de qualquer outra regra.
  if (access.isBlocked) return false;

  const definition = FEATURES[feature];
  // Chave desconhecida (string vinda de fora dos tipos): nega.
  if (definition === undefined) return false;

  switch (definition.minimumPlan) {
    case "authenticated":
      return access.isAuthenticated;
    case "essential":
      // `hasEssential` já é verdadeiro para quem tem Pro (Pro implica Essencial,
      // resolvido no SQL e no DAL) — não precisa de `|| hasPro` aqui.
      return access.hasEssential;
    case "pro_annual":
      return access.hasPro;
    default:
      // Inalcançável enquanto a união estiver completa; se alguém adicionar um
      // plano novo e esquecer deste switch, nega em vez de liberar.
      return false;
  }
}

/** Recursos que a usuária pode usar agora, na ordem da matriz. */
export function getAccessibleFeatures(access: UserAccess): FeatureDefinition[] {
  return ALL_FEATURES.filter((feature) => canAccessFeature(access, feature.key));
}

/** Recursos fora do alcance da usuária — a base para "desbloqueie com o Pro". */
export function getLockedFeatures(access: UserAccess): FeatureDefinition[] {
  return ALL_FEATURES.filter((feature) => !canAccessFeature(access, feature.key));
}
