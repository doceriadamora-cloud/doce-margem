/**
 * Histórico de preço dos ingredientes — Fase P0-13.
 *
 * Arquivo próprio, fora de `types/pricing.ts`, de propósito. `Ingredient` é
 * tipo de **domínio**: entra em `calculateIngredient` e viaja dentro de cada
 * cálculo de receita. Pendurar nele uma lista que só cresce faria toda conta
 * carregar dado que a conta nunca usa — e faria o domínio conhecer um conceito
 * de aplicação.
 *
 * O histórico é uma coleção própria no `AppState`, no mesmo padrão de `clients`
 * e `savedQuotes` da P0-11.
 */

import type { BaseUnit, PurchaseUnit } from "@/types/pricing";

/**
 * Como o registro nasceu.
 *
 * União de um valor só, e não `string`, para o dia em que existir importação de
 * planilha ou reajuste em lote: acrescentar um valor aqui obriga a revisar quem
 * consome, em vez de passar batido.
 */
export type PriceSnapshotSource = "manual";

/**
 * Foto do preço de um ingrediente num momento.
 *
 * Guarda o que foi **informado** (quantidade, unidade, preço, fator) e também o
 * `unitCost` **derivado** daquilo. Persistir um derivado contraria a regra da
 * Fase 2-6 e aqui é deliberado: o histórico é um registro do passado, não uma
 * projeção do presente. Recalcular depois usaria a tabela de conversão de hoje
 * e poderia reescrever o que aconteceu — o oposto do que um histórico serve.
 */
export interface IngredientPriceSnapshot {
  id: string;
  ingredientId: string;
  /** Data/hora ISO do registro. */
  date: string;
  purchaseQuantity: number;
  purchaseUnit: PurchaseUnit;
  purchasePrice: number;
  baseUnit: BaseUnit;
  /**
   * Custo por unidade-base no momento do registro, ou `null` quando o
   * ingrediente não era calculável. É este número — não o preço do pacote — que
   * a comparação entre registros usa.
   */
  unitCost: number | null;
  correctionFactor: number;
  source: PriceSnapshotSource;
}
