/**
 * storageService — Fase 2-1. Persistência local desacoplada (localStorage).
 *
 * Única camada que fala com `window.localStorage`. A interface (Fase 2+) nunca
 * deve importar `localStorage` diretamente — sempre passar por aqui, para que a
 * troca por Supabase/cloud (Pro, Fase 4+) não exija reescrever a UI (mesma
 * assinatura de funções, implementação interna diferente).
 *
 * Guarda um único objeto (AppState) sob uma chave, versionado por `schemaVersion`.
 * Nunca lança: qualquer falha (localStorage indisponível, JSON inválido, schema
 * desconhecido, campos ausentes/corrompidos) devolve um estado inicial seguro em
 * vez de derrubar a aplicação.
 */

import type { AppState } from "@/types/app-state";
import type {
  FixedCost,
  Ingredient,
  Recipe,
  SalesChannel,
} from "@/types/pricing";

/** Versão atual do schema do estado local. Incrementar ao mudar a forma do AppState. */
export const APP_STATE_SCHEMA_VERSION = 1;

/** Chave única do estado local no localStorage. */
export const APP_STATE_STORAGE_KEY = "doce-margem:app-state";

/** Estado inicial seguro (sem dados) — usado sempre que a leitura falha ou não existe. */
export function createEmptyAppState(): AppState {
  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    ingredients: [],
    recipes: [],
    fixedCosts: [],
    customChannels: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * `true` se `window.localStorage` existe e responde. Protege contra SSR (sem
 * `window`), private browsing com quota 0 e navegadores que bloqueiam storage.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const probeKey = "__doce_margem_storage_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function safeGetItem(key: string): string | null {
  if (!isStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normaliza dados brutos lidos do localStorage para um AppState seguro.
 *
 *  - Não é um objeto → estado vazio.
 *  - `schemaVersion` ausente ou de tipo errado → estado vazio (sem versão
 *    confiável não há como saber migrar).
 *  - `schemaVersion` diferente da atual → estado vazio (nenhuma migração entre
 *    versões existe ainda; só a v1 existe hoje).
 *  - Com a versão batendo, cada array ausente ou com tipo errado é reposto por
 *    `[]` individualmente — um campo corrompido não descarta o restante do
 *    estado (ex.: dado antigo sem `customChannels`).
 */
function normalizeStoredState(raw: unknown): AppState {
  if (!isPlainObject(raw)) return createEmptyAppState();
  if (typeof raw.schemaVersion !== "number") return createEmptyAppState();
  if (raw.schemaVersion !== APP_STATE_SCHEMA_VERSION) return createEmptyAppState();

  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    ingredients: Array.isArray(raw.ingredients) ? (raw.ingredients as Ingredient[]) : [],
    recipes: Array.isArray(raw.recipes) ? (raw.recipes as Recipe[]) : [],
    fixedCosts: Array.isArray(raw.fixedCosts) ? (raw.fixedCosts as FixedCost[]) : [],
    customChannels: Array.isArray(raw.customChannels)
      ? (raw.customChannels as SalesChannel[])
      : [],
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

/**
 * Carrega o estado local. Nunca lança: localStorage indisponível, JSON inválido
 * ou schema desconhecido devolvem `createEmptyAppState()`.
 */
export function loadAppState(): AppState {
  const raw = safeGetItem(APP_STATE_STORAGE_KEY);
  if (raw === null) return createEmptyAppState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return createEmptyAppState();
  }

  return normalizeStoredState(parsed);
}

/**
 * Salva o estado local (sobrescreve). Sempre grava a versão atual do schema e
 * atualiza `updatedAt`. Nunca lança: devolve `false` se não conseguiu gravar
 * (localStorage indisponível, quota excedida, dado não serializável).
 */
export function saveAppState(state: AppState): boolean {
  const toSave: AppState = {
    ...state,
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };

  let serialized: string;
  try {
    serialized = JSON.stringify(toSave);
  } catch {
    return false;
  }

  return safeSetItem(APP_STATE_STORAGE_KEY, serialized);
}

/** Remove o estado local por completo. */
export function clearAppState(): boolean {
  return safeRemoveItem(APP_STATE_STORAGE_KEY);
}

/* ──────────────────── Acesso por fatia (conveniência para a UI futura) ──────────────────── */

export function saveIngredients(ingredients: Ingredient[]): boolean {
  return saveAppState({ ...loadAppState(), ingredients });
}

export function loadIngredients(): Ingredient[] {
  return loadAppState().ingredients;
}

export function saveRecipes(recipes: Recipe[]): boolean {
  return saveAppState({ ...loadAppState(), recipes });
}

export function loadRecipes(): Recipe[] {
  return loadAppState().recipes;
}

export function saveFixedCosts(fixedCosts: FixedCost[]): boolean {
  return saveAppState({ ...loadAppState(), fixedCosts });
}

export function loadFixedCosts(): FixedCost[] {
  return loadAppState().fixedCosts;
}

export function saveCustomChannels(customChannels: SalesChannel[]): boolean {
  return saveAppState({ ...loadAppState(), customChannels });
}

export function loadCustomChannels(): SalesChannel[] {
  return loadAppState().customChannels;
}
