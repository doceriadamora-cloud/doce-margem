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
  Recipe,
  SalesChannel,
} from "@/types/pricing";

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
  /** Canais de venda customizados pela usuária (além da biblioteca padrão). */
  customChannels: SalesChannel[];
  /** Data/hora ISO da última gravação. */
  updatedAt: string;
}
