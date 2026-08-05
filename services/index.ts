/**
 * Ponto de entrada da camada de persistência (Fase 2-1).
 * Reexporta o storageService e os tipos do estado local para uso conveniente:
 *   import { loadAppState, saveIngredients } from "@/services";
 *
 * A interface (Fase 2+) deve importar SOMENTE por aqui — nunca falar com
 * `localStorage` diretamente (ver CLAUDE.md, regras técnicas).
 */

export * from "./storage-service";
export * from "./storage-examples";
export * from "./backup-service";

export type { AppState, BusinessSettings } from "@/types/app-state";
