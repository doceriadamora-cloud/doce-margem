/**
 * Unidade de rendimento: opções e tolerância a entrada antiga — Fase P0-9C.
 *
 * Mora em `lib/` e não em `modules/pricing/` de propósito. O domínio conhece
 * **cinco** unidades canônicas (`PurchaseUnit`) e nada mais; tolerar o que a
 * usuária digitou é responsabilidade da camada de aplicação. Misturar as duas
 * coisas faria o domínio carregar sinônimos de português para sempre.
 *
 * O problema concreto que isto resolve, encontrado na P0-9B: o rendimento era
 * campo de texto livre, e quem escreveu "gr" ficou com uma receita que **não
 * podia virar sub-receita** — `isUnitCompatibleWithYield` compara com as
 * unidades canônicas, e "gr" não é nenhuma delas. A receita parecia certa e o
 * app dizia não, sem explicar.
 *
 * Módulo puro: sem UI, sem I/O, sem estado.
 */

import { isPurchaseUnit } from "@/modules/pricing";
import type { PurchaseUnit } from "@/types/pricing";

/** Opções do seletor de rendimento, na ordem em que aparecem. */
export const YIELD_UNIT_OPTIONS: readonly { value: PurchaseUnit; label: string }[] =
  Object.freeze([
    { value: "un", label: "un — unidades, potes, fatias, porções" },
    { value: "g", label: "g — gramas" },
    { value: "kg", label: "kg — quilos" },
    { value: "ml", label: "ml — mililitros" },
    { value: "l", label: "l — litros" },
  ]);

/**
 * Sinônimos aceitos ao ler dados antigos.
 *
 * Só entram equivalências **exatas**: "gr" é grama, ponto final. Deliberadamente
 * fora daqui: "porção", "fatia", "pedaço", "pote". Parecem contagem, mas mapear
 * para "un" apagaria a informação que a usuária quis registrar e mudaria o
 * significado do número dela sem avisar. Essas continuam sendo unidade livre, e
 * a interface pede para ela escolher.
 */
const UNIT_ALIASES: Readonly<Record<string, PurchaseUnit>> = Object.freeze({
  g: "g",
  gr: "g",
  grs: "g",
  grama: "g",
  gramas: "g",
  kg: "kg",
  kgs: "kg",
  quilo: "kg",
  quilos: "kg",
  kilo: "kg",
  kilos: "kg",
  quilograma: "kg",
  quilogramas: "kg",
  kilograma: "kg",
  kilogramas: "kg",
  ml: "ml",
  mls: "ml",
  mililitro: "ml",
  mililitros: "ml",
  l: "l",
  lt: "l",
  lts: "l",
  litro: "l",
  litros: "l",
  un: "un",
  und: "un",
  unid: "un",
  unids: "un",
  uns: "un",
  unidade: "un",
  unidades: "un",
});

/**
 * Minúsculas, sem acento, sem espaço nas pontas e sem ponto final.
 *
 * Os acentos são removidos comparando o código do caractere, sem classe de
 * regex: a faixa U+0300..U+036F que o `NFD` separa da letra é invisível no
 * editor, e uma linha que ninguém consegue ler direito é uma linha que ninguém
 * consegue revisar.
 */
function normalizeKey(raw: string): string {
  const semAcento = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
  return semAcento.replace(/\.$/, "");
}

/**
 * Converte o que está gravado na unidade canônica equivalente, ou `null` quando
 * não há equivalência segura.
 *
 * `null` **não** é erro: significa "unidade livre", que continua legível na
 * receita e só impede o uso como sub-receita.
 */
export function normalizeYieldUnit(raw: string): PurchaseUnit | null {
  const key = normalizeKey(raw);
  if (key === "") return null;
  if (isPurchaseUnit(key)) return key;
  return UNIT_ALIASES[key] ?? null;
}

/** A receita pode ser usada como componente de outra? */
export function hasUsableYieldUnit(yieldUnit: string): boolean {
  return normalizeYieldUnit(yieldUnit) !== null;
}

/**
 * Normaliza o rendimento de uma receita, devolvendo **a mesma referência**
 * quando nada muda.
 *
 * A identidade importa: os stores usam `useSyncExternalStore`, que compara
 * snapshots por referência. Recriar todo objeto a cada leitura provocaria
 * re-render infinito.
 */
export function withNormalizedYieldUnit<T extends { yieldUnit: string }>(recipe: T): T {
  const normalized = normalizeYieldUnit(recipe.yieldUnit);
  if (normalized === null || normalized === recipe.yieldUnit) return recipe;
  return { ...recipe, yieldUnit: normalized };
}

/**
 * Normaliza uma lista inteira, preservando a referência da lista quando nenhum
 * item muda — mesma razão de identidade acima.
 */
export function withNormalizedYieldUnits<T extends { yieldUnit: string }>(
  recipes: T[],
): T[] {
  let changed = false;
  const next = recipes.map((recipe) => {
    const normalized = withNormalizedYieldUnit(recipe);
    if (normalized !== recipe) changed = true;
    return normalized;
  });
  return changed ? next : recipes;
}
