/**
 * Entrada por medida caseira — Fase P0-9C.
 *
 * Traduz "1 lata de leite condensado" ou "1 xícara de farinha" no item que o
 * domínio já sabe calcular. Módulo puro: sem UI, sem I/O, sem estado.
 *
 * ## A regra que governa este arquivo
 *
 * **Só oferecer conversão que dá para defender.** Medida caseira não tem
 * equivalência universal — 1 xícara de farinha são 120 g e 1 xícara de açúcar
 * são 180 g. Num app de precificação, um número errado aqui vira preço errado
 * na ponta, em silêncio.
 *
 * Por isso as opções são derivadas **do ingrediente escolhido**, e não de uma
 * lista fixa. Quando não dá para inferir com segurança, a interface diz isso e
 * pede g ou ml. É melhor a usuária pesar do que o app chutar.
 *
 * ## Dois mecanismos diferentes, de propósito
 *
 * - **Embalagem** (lata, caixinha): peso de fábrica, não depende de densidade.
 *   Vira um item de ingrediente comum, já convertido. O domínio nem fica
 *   sabendo — e não precisa: 395 g são 395 g.
 * - **Medida caseira** (xícara, colher): depende de densidade. Vira
 *   `HouseholdMeasureRecipeItem`, com a tabela da Fase 1B-3 fazendo a conversão
 *   dentro do domínio, onde ela pode ser auditada e corrigida.
 */

import { getHouseholdConversion } from "@/modules/pricing";
import type { HouseholdMeasure, Ingredient } from "@/types/pricing";

/** Minúsculas e sem acento, para casar nome de ingrediente digitado à mão. */
function normalizeName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
}

/* ────────────────────────── Embalagens ────────────────────────── */

interface PackagePreset {
  id: string;
  /** Rótulo exibido no seletor. */
  label: string;
  /** Quantidade que uma embalagem contém, na unidade-base exigida. */
  amount: number;
  baseUnit: "g" | "ml";
  /** O nome do ingrediente precisa conter um destes termos. */
  matches: readonly string[];
}

/**
 * Pesos de embalagem padrão do mercado brasileiro.
 *
 * Cada preset é preso ao ingrediente por nome: "1 lata" só vale 395 g se a lata
 * for de leite condensado. Oferecer "lata" para cacau colocaria 395 g de cacau
 * na receita sem ninguém perceber.
 */
const PACKAGE_PRESETS: readonly PackagePreset[] = Object.freeze([
  {
    id: "lata-leite-condensado",
    label: "lata de leite condensado (395 g)",
    amount: 395,
    baseUnit: "g",
    matches: ["leite condensado", "condensado"],
  },
  {
    id: "caixinha-creme-de-leite",
    label: "caixinha de creme de leite (200 g)",
    amount: 200,
    baseUnit: "g",
    matches: ["creme de leite"],
  },
]);

/* ──────────────────── Tabelas de medida caseira ──────────────────── */

interface ConversionReference {
  /** Chave da tabela da Fase 1B-3. */
  key: string;
  /** Como a referência é chamada para a usuária. */
  label: string;
  baseUnit: "g" | "ml";
  /** Termos que identificam o ingrediente. */
  matches: readonly string[];
}

/**
 * Da tabela do domínio para o nome do ingrediente.
 *
 * `liquido` é a única que não depende do nome: qualquer ingrediente medido em
 * ml é líquido para efeito de xícara e colher.
 */
const CONVERSION_REFERENCES: readonly ConversionReference[] = Object.freeze([
  {
    key: "farinha_trigo",
    label: "farinha de trigo",
    baseUnit: "g",
    matches: ["farinha"],
  },
  {
    key: "acucar",
    label: "açúcar",
    baseUnit: "g",
    matches: ["acucar", "açucar"],
  },
  {
    key: "cacau",
    label: "cacau em pó",
    baseUnit: "g",
    matches: ["cacau", "chocolate em po", "achocolatado"],
  },
]);

/** Medidas caseiras oferecidas, e quanto cada opção vale na medida do domínio. */
const MEASURE_OPTIONS: readonly {
  id: string;
  label: string;
  measure: HouseholdMeasure;
  /** Multiplicador aplicado à quantidade informada (meia xícara = 0,5). */
  factor: number;
}[] = Object.freeze([
  { id: "xicara", label: "xícara", measure: "xicara", factor: 1 },
  { id: "meia-xicara", label: "meia xícara", measure: "xicara", factor: 0.5 },
  { id: "colher-sopa", label: "colher de sopa", measure: "colher_sopa", factor: 1 },
  { id: "colher-cha", label: "colher de chá", measure: "colher_cha", factor: 1 },
]);

/* ──────────────────────────── Saída ──────────────────────────── */

/** Uma opção oferecida no seletor de medida caseira. */
export type HouseholdInputOption =
  | {
      kind: "package";
      id: string;
      label: string;
      /** Quanto uma embalagem contém, já na unidade-base do ingrediente. */
      amountPerUnit: number;
      baseUnit: "g" | "ml";
    }
  | {
      kind: "measure";
      id: string;
      label: string;
      measure: HouseholdMeasure;
      factor: number;
      /** Chave da tabela usada na conversão. */
      conversionKey: string;
      /** Nome da referência, para a interface mostrar o que está assumindo. */
      referenceLabel: string;
      /** Quanto uma medida cheia vale na unidade-base. */
      amountPerMeasure: number;
      baseUnit: "g" | "ml";
    };

/**
 * Opções seguras para este ingrediente. Lista vazia significa "não temos
 * conversão confiável" — e a interface deve dizer isso, não inventar.
 *
 * Ingrediente contado em `un` nunca entra: o validador do domínio recusa medida
 * caseira nesse caso, e uma xícara de ovos não significa nada.
 */
export function getHouseholdOptions(ingredient: Ingredient): HouseholdInputOption[] {
  if (ingredient.baseUnit === "un") return [];

  const name = normalizeName(ingredient.name);
  const options: HouseholdInputOption[] = [];

  for (const preset of PACKAGE_PRESETS) {
    if (preset.baseUnit !== ingredient.baseUnit) continue;
    if (!preset.matches.some((term) => name.includes(normalizeName(term)))) continue;
    options.push({
      kind: "package",
      id: preset.id,
      label: preset.label,
      amountPerUnit: preset.amount,
      baseUnit: preset.baseUnit,
    });
  }

  const reference = findConversionReference(ingredient);
  if (reference !== null) {
    for (const option of MEASURE_OPTIONS) {
      const conversion = getHouseholdConversion(reference.key, option.measure);
      // Só entra se a tabela do domínio realmente responde por esta medida.
      if (conversion === null) continue;
      options.push({
        kind: "measure",
        id: option.id,
        label: option.label,
        measure: option.measure,
        factor: option.factor,
        conversionKey: reference.key,
        referenceLabel: reference.label,
        amountPerMeasure: conversion.amountPerMeasure * option.factor,
        baseUnit: conversion.baseUnit,
      });
    }
  }

  return options;
}

/**
 * Qual tabela de conversão serve a este ingrediente, ou `null`.
 *
 * Qualquer ingrediente em ml usa `liquido`; os em g dependem do nome bater com
 * uma referência conhecida. Não há palpite: sem correspondência, devolve `null`.
 */
function findConversionReference(
  ingredient: Ingredient,
): { key: string; label: string } | null {
  if (ingredient.baseUnit === "ml") {
    return { key: "liquido", label: "líquido" };
  }
  const name = normalizeName(ingredient.name);
  const match = CONVERSION_REFERENCES.find(
    (reference) =>
      reference.baseUnit === ingredient.baseUnit &&
      reference.matches.some((term) => name.includes(normalizeName(term))),
  );
  return match ? { key: match.key, label: match.label } : null;
}

/** Quanto a quantidade informada representa na unidade-base do ingrediente. */
export function amountInBaseUnit(
  option: HouseholdInputOption,
  quantity: number,
): number {
  return option.kind === "package"
    ? quantity * option.amountPerUnit
    : quantity * option.amountPerMeasure;
}
