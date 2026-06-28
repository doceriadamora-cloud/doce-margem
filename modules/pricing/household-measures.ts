/**
 * Conversão de medidas caseiras para unidades-base — Fase 1B-3. Funções puras, sem UI.
 *
 * Medida caseira NÃO tem conversão universal: 1 xícara de farinha ≠ 1 xícara de açúcar.
 * A conversão depende de uma chave de ingrediente/categoria (ex.: "farinha_trigo", "liquido").
 *
 * Fluxo:
 *   getHouseholdConversion(conversionKey, measure) → { amountPerMeasure, baseUnit } | null
 *   quantityInBaseUnit = quantityUsed × amountPerMeasure
 *
 * Chaves disponíveis (MVP): farinha_trigo | acucar | cacau | liquido.
 * Medidas caseiras nunca produzem "un" — conversão para "un" é bloqueada na validação.
 */

import type { HouseholdMeasure } from "@/types/pricing";

/** Unidade-base possível de saída de uma conversão caseira (nunca "un"). */
export type HouseholdBaseUnit = "g" | "ml";

interface HouseholdConversionEntry {
  /** Unidade-base produzida pela conversão desta categoria. */
  baseUnit: HouseholdBaseUnit;
  /** Quantidade em unidade-base por medida caseira. */
  perMeasure: Record<HouseholdMeasure, number>;
}

/**
 * Tabela de conversões caseiras por chave de categoria/ingrediente.
 *
 * Valores de referência para MVP; personalizável por usuária em versão futura.
 *
 * Fontes aproximadas (TACO/medidas culinárias brasileiras):
 *   farinha_trigo : xícara 120 g  | sopa 7,5 g  | chá 2,5 g  | café 1,25 g
 *   acucar        : xícara 180 g  | sopa 11,25g | chá 3,75 g | café 1,875 g
 *   cacau         : xícara 90 g   | sopa 5,625g | chá 1,875g | café 0,9375g
 *   liquido       : xícara 240 ml | sopa 15 ml  | chá 5 ml   | café 2,5 ml
 */
const HOUSEHOLD_CONVERSIONS: Record<string, HouseholdConversionEntry> = {
  farinha_trigo: {
    baseUnit: "g",
    perMeasure: {
      xicara: 120,
      colher_sopa: 7.5,
      colher_cha: 2.5,
      colher_cafe: 1.25,
    },
  },
  acucar: {
    baseUnit: "g",
    perMeasure: {
      xicara: 180,
      colher_sopa: 11.25,
      colher_cha: 3.75,
      colher_cafe: 1.875,
    },
  },
  cacau: {
    baseUnit: "g",
    perMeasure: {
      xicara: 90,
      colher_sopa: 5.625,
      colher_cha: 1.875,
      colher_cafe: 0.9375,
    },
  },
  liquido: {
    baseUnit: "ml",
    perMeasure: {
      xicara: 240,
      colher_sopa: 15,
      colher_cha: 5,
      colher_cafe: 2.5,
    },
  },
};

/** Chaves de conversão disponíveis na tabela (para referência em UI futura). */
export const HOUSEHOLD_CONVERSION_KEYS: readonly string[] = Object.freeze(
  Object.keys(HOUSEHOLD_CONVERSIONS),
);

/**
 * Retorna a quantidade em unidade-base por medida e a unidade-base correspondente.
 * Retorna null se a chave não estiver na tabela.
 *
 * Ex.: getHouseholdConversion("farinha_trigo", "xicara")
 *      → { amountPerMeasure: 120, baseUnit: "g" }
 */
export function getHouseholdConversion(
  conversionKey: string,
  measure: HouseholdMeasure,
): { amountPerMeasure: number; baseUnit: HouseholdBaseUnit } | null {
  const entry = HOUSEHOLD_CONVERSIONS[conversionKey];
  if (!entry) return null;
  return { amountPerMeasure: entry.perMeasure[measure], baseUnit: entry.baseUnit };
}
