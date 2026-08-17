/**
 * Regras do histórico de preço — Fase P0-13.
 *
 * Módulo **puro**: sem UI, sem I/O, sem estado. Decide quando um registro nasce,
 * como a variação é medida e o que conta como "mudança recente".
 *
 * Nenhuma fórmula de custo mora aqui. O `unitCost` do registro vem de
 * `calculateIngredient`, do domínio — este arquivo só o guarda e compara.
 */

import type { Ingredient } from "@/types/pricing";
import type { IngredientPriceSnapshot } from "@/types/price-history";

/**
 * Quantos registros por ingrediente ficam guardados.
 *
 * O `AppState` inteiro vai para o JSONB da nuvem a cada gravação (P0-10), então
 * um histórico sem limite viraria custo de rede em cada tecla. Cinquenta
 * mudanças de preço no mesmo ingrediente é muito mais do que a realidade de uma
 * confeiteira, e os mais antigos saem primeiro.
 */
export const MAX_SNAPSHOTS_PER_INGREDIENT = 50;

/** Janela do "mudou de preço recentemente". */
export const RECENT_PRICE_CHANGE_DAYS = 30;

/**
 * Tolerância para comparar dois custos.
 *
 * Existe só por causa de ponto flutuante: `0.1 + 0.2 !== 0.3`. Não é limiar de
 * relevância de produto — qualquer diferença real aparece para a usuária.
 */
const EPSILON = 1e-9;

/**
 * Os campos que mudam o custo.
 *
 * Nome, categoria e observação ficam fora: editá-los não altera nenhum preço, e
 * criar registro por causa deles encheria o histórico de linhas idênticas.
 *
 * `baseUnit` **entra**, apesar de parecer só apresentação: trocar a unidade-base
 * muda o divisor do custo por unidade, e portanto muda o número que as receitas
 * consomem.
 */
export function isCostRelevantChange(previous: Ingredient, next: Ingredient): boolean {
  return (
    previous.purchasePrice !== next.purchasePrice ||
    previous.purchaseQuantity !== next.purchaseQuantity ||
    previous.purchaseUnit !== next.purchaseUnit ||
    previous.baseUnit !== next.baseUnit ||
    (previous.correctionFactor ?? 1) !== (next.correctionFactor ?? 1)
  );
}

/**
 * O registro novo diz a mesma coisa que o último?
 *
 * Segunda barreira contra duplicata: `isCostRelevantChange` compara o que foi
 * digitado, esta função compara o que foi gravado. Salvar duas vezes o mesmo
 * valor não deve render duas linhas.
 */
export function isSameAsLatest(
  latest: IngredientPriceSnapshot | null,
  candidate: Omit<IngredientPriceSnapshot, "id" | "date">,
): boolean {
  if (latest === null) return false;
  return (
    latest.purchasePrice === candidate.purchasePrice &&
    latest.purchaseQuantity === candidate.purchaseQuantity &&
    latest.purchaseUnit === candidate.purchaseUnit &&
    latest.baseUnit === candidate.baseUnit &&
    latest.correctionFactor === candidate.correctionFactor
  );
}

/** Como o preço se comportou entre dois registros. */
export type PriceVariation =
  /** Primeiro registro do ingrediente — não há com o que comparar. */
  | { kind: "first" }
  | { kind: "increase"; percent: number }
  | { kind: "decrease"; percent: number }
  /** Os valores informados mudaram, mas o custo por unidade ficou igual. */
  | { kind: "stable" }
  /** Algum dos lados não tinha custo calculável. */
  | { kind: "unknown" };

/**
 * Variação percentual entre dois registros.
 *
 * **Compara o custo por unidade-base, não o preço do pacote.** É a diferença
 * entre uma resposta certa e uma errada: comprar 2 kg por R$ 68 depois de
 * comprar 1 kg por R$ 52 é um preço de pacote 30% maior e um custo por grama
 * 35% **menor**. Quem decide preço de venda precisa do segundo número.
 *
 * `percent` vem em pontos percentuais (30.8 = +30,8%), sempre positivo; o sinal
 * está no `kind`.
 */
export function describeVariation(
  current: IngredientPriceSnapshot,
  previous: IngredientPriceSnapshot | null,
): PriceVariation {
  if (previous === null) return { kind: "first" };
  if (current.unitCost === null || previous.unitCost === null) return { kind: "unknown" };
  if (previous.unitCost === 0) return { kind: "unknown" };

  const delta = current.unitCost - previous.unitCost;
  if (Math.abs(delta) <= EPSILON * Math.max(1, Math.abs(previous.unitCost))) {
    return { kind: "stable" };
  }

  const percent = Math.abs(delta / previous.unitCost) * 100;
  return delta > 0 ? { kind: "increase", percent } : { kind: "decrease", percent };
}

/** Registros de um ingrediente, do mais recente para o mais antigo. */
export function historyForIngredient(
  history: IngredientPriceSnapshot[],
  ingredientId: string,
): IngredientPriceSnapshot[] {
  return history
    .filter((snapshot) => snapshot.ingredientId === ingredientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface IngredientPriceSummary {
  latest: IngredientPriceSnapshot | null;
  previous: IngredientPriceSnapshot | null;
  variation: PriceVariation;
  /** Todos os registros, do mais recente para o mais antigo. */
  entries: IngredientPriceSnapshot[];
}

/** Resumo pronto para a tela: último registro, anterior e a variação entre eles. */
export function summarizeIngredientPrice(
  history: IngredientPriceSnapshot[],
  ingredientId: string,
): IngredientPriceSummary {
  const entries = historyForIngredient(history, ingredientId);
  const latest = entries[0] ?? null;
  const previous = entries[1] ?? null;
  return {
    latest,
    previous,
    variation: latest === null ? { kind: "first" } : describeVariation(latest, previous),
    entries,
  };
}

/** Corta o histórico de um ingrediente no limite, descartando os mais antigos. */
export function trimHistoryForIngredient(
  history: IngredientPriceSnapshot[],
  ingredientId: string,
): IngredientPriceSnapshot[] {
  const doIngrediente = historyForIngredient(history, ingredientId);
  if (doIngrediente.length <= MAX_SNAPSHOTS_PER_INGREDIENT) return history;

  const manter = new Set(
    doIngrediente.slice(0, MAX_SNAPSHOTS_PER_INGREDIENT).map((snapshot) => snapshot.id),
  );
  return history.filter(
    (snapshot) => snapshot.ingredientId !== ingredientId || manter.has(snapshot.id),
  );
}

export interface RecentPriceIncrease {
  ingredientId: string;
  percent: number;
  date: string;
}

/**
 * Ingredientes que ficaram mais caros na janela recente.
 *
 * Só **aumentos**: é o caso que pede ação. Queda de preço é boa notícia e não
 * precisa interromper ninguém.
 */
export function listRecentPriceIncreases(
  history: IngredientPriceSnapshot[],
  now: Date = new Date(),
  days: number = RECENT_PRICE_CHANGE_DAYS,
): RecentPriceIncrease[] {
  const limite = now.getTime() - days * 24 * 60 * 60 * 1000;
  const ingredientIds = [...new Set(history.map((snapshot) => snapshot.ingredientId))];

  const aumentos: RecentPriceIncrease[] = [];
  for (const ingredientId of ingredientIds) {
    const { latest, variation } = summarizeIngredientPrice(history, ingredientId);
    if (latest === null || variation.kind !== "increase") continue;

    const quando = new Date(latest.date).getTime();
    if (!Number.isFinite(quando) || quando < limite) continue;

    aumentos.push({ ingredientId, percent: variation.percent, date: latest.date });
  }

  return aumentos.sort((a, b) => b.date.localeCompare(a.date));
}
