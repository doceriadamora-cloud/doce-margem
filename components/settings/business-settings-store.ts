"use client";

/**
 * Store reativo de configurações financeiras — Fase 2-6. Mesmo padrão dos
 * demais stores (ver DECISIONS.md, "Store reativo por feature"), mas guarda um
 * objeto ÚNICO (não uma lista) — não há `addX`/`removeX`, só `updateX`.
 */

import { loadBusinessSettings, saveBusinessSettings } from "@/services";
import type { BusinessSettings } from "@/types/app-state";

type Listener = () => void;

/** Referência estável usada como snapshot do servidor / antes da hidratação. */
const EMPTY_SETTINGS: BusinessSettings = {
  estimatedMonthlyRevenue: null,
  estimatedMonthlyUnits: null,
  updatedAt: "",
};

let cachedSettings: BusinessSettings | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): BusinessSettings {
  if (cachedSettings === null) {
    cachedSettings = loadBusinessSettings();
  }
  return cachedSettings;
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Assina mudanças nas configurações (contrato exigido por `useSyncExternalStore`). */
export function subscribeBusinessSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Snapshot atual (lê do storage na primeira chamada, depois usa o cache). */
export function getBusinessSettingsSnapshot(): BusinessSettings {
  return ensureLoaded();
}

/** Snapshot usado no servidor e na primeira pintura do cliente. */
export function getBusinessSettingsServerSnapshot(): BusinessSettings {
  return EMPTY_SETTINGS;
}

/** Atualiza faturamento/volume mensal estimado e persiste. */
export function updateBusinessSettings(
  values: Pick<BusinessSettings, "estimatedMonthlyRevenue" | "estimatedMonthlyUnits">,
): boolean {
  const next: BusinessSettings = {
    ...ensureLoaded(),
    ...values,
    updatedAt: new Date().toISOString(),
  };
  const persisted = saveBusinessSettings(next);
  cachedSettings = next;
  notify();
  return persisted;
}
