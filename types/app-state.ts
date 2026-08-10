/**
 * Estado local do app — Fase 2-1. Tipos puros, sem storage/localStorage.
 *
 * Descreve a forma serializada que o storageService (services/storage-service.ts)
 * salva e carrega. Não depende de UI nem de armazenamento — só a "foto" dos dados
 * da usuária no dispositivo (Essencial) ou, futuramente, na nuvem (Pro).
 */

import type {
  FixedCost,
  Ingredient,
  Packaging,
  Recipe,
  SalesChannel,
} from "@/types/pricing";

/**
 * Configurações financeiras do negócio — Fase 2-6.
 *
 * Guarda só os INSUMOS que a usuária informa (faturamento/volume mensal
 * estimado). O percentual de custo fixo é sempre DERIVADO — via
 * `calculateFixedCostSummary` (Fase 1C-2), combinando estes insumos com os
 * `fixedCosts` já cadastrados — nunca persistido calculado, para não arriscar
 * ficar desatualizado se os custos fixos mudarem depois sem essa tela ser
 * reaberta (mesma lógica de "nunca persistir valor derivado" já usada em toda
 * a Fase 2 — custo de ingrediente, de receita e de precificação).
 */
export interface BusinessSettings {
  /** Faturamento mensal estimado em R$, ou `null` se ainda não informado. */
  estimatedMonthlyRevenue: number | null;
  /** Volume mensal estimado de unidades vendidas, ou `null` se ainda não informado. */
  estimatedMonthlyUnits: number | null;
  /** Valor desejado da hora de trabalho em R$/h, ou `null` se ainda não informado. */
  laborHourlyRate: number | null;
  /** Data/hora ISO da última gravação. */
  updatedAt: string;
}

/** Estado local completo da usuária (Essencial = localStorage). */
export interface AppState {
  /** Versão do schema deste estado (ver APP_STATE_SCHEMA_VERSION em storage-service.ts). */
  schemaVersion: number;
  /** Ingredientes cadastrados. */
  ingredients: Ingredient[];
  /** Receitas cadastradas (ingredientes, medidas caseiras e/ou sub-receitas). */
  recipes: Recipe[];
  /** Custos fixos cadastrados. */
  fixedCosts: FixedCost[];
  /** Embalagens cadastradas. */
  packagings: Packaging[];
  /** Canais de venda customizados pela usuária (além da biblioteca padrão). */
  customChannels: SalesChannel[];
  /**
   * Configurações financeiras (Fase 2-6 + P0-2). Sempre presente — campos
   * ausentes em dados antigos são normalizados sem descartar o resto do estado.
   */
  businessSettings: BusinessSettings;
  /** Data/hora ISO da última gravação. */
  updatedAt: string;
}
