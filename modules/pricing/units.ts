/**
 * Conversão de unidades — Fase 1A. Funções puras, sem UI.
 *
 * Regras:
 *  - 1 kg = 1000 g; 1 l = 1000 ml; "un" permanece "un".
 *  - Conversão só é válida dentro da mesma dimensão (massa, volume, contagem).
 *  - Conversões entre dimensões diferentes são proibidas (ex.: kg → ml).
 */

import type { PurchaseUnit, UnitDimension } from "@/types/pricing";

/** Dimensão física de cada unidade. */
const UNIT_DIMENSION: Record<PurchaseUnit, UnitDimension> = {
  g: "mass",
  kg: "mass",
  ml: "volume",
  l: "volume",
  un: "count",
};

/**
 * Fator para converter 1 unidade na unidade canônica da sua dimensão.
 * Canônicas: massa = g, volume = ml, contagem = un.
 */
const TO_CANONICAL_FACTOR: Record<PurchaseUnit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  un: 1,
};

/** Retorna a dimensão física de uma unidade. */
export function getUnitDimension(unit: PurchaseUnit): UnitDimension {
  return UNIT_DIMENSION[unit];
}

/** Indica se duas unidades pertencem à mesma dimensão (e portanto são conversíveis). */
export function areUnitsCompatible(a: PurchaseUnit, b: PurchaseUnit): boolean {
  return getUnitDimension(a) === getUnitDimension(b);
}

/**
 * Converte uma quantidade de uma unidade para outra dentro da mesma dimensão.
 *
 * Permitido: kg↔g, l↔ml, un→un (e identidades).
 * Proibido: massa↔volume, qualquer↔contagem (lança Error).
 *
 * Ex.: convert(1, "kg", "g") === 1000; convert(1, "l", "ml") === 1000.
 */
export function convert(
  quantity: number,
  from: PurchaseUnit,
  to: PurchaseUnit,
): number {
  if (!areUnitsCompatible(from, to)) {
    throw new Error(
      `Conversão inválida: ${from} → ${to} (dimensões incompatíveis: ${getUnitDimension(from)} ≠ ${getUnitDimension(to)}).`,
    );
  }
  const inCanonical = quantity * TO_CANONICAL_FACTOR[from];
  return inCanonical / TO_CANONICAL_FACTOR[to];
}
