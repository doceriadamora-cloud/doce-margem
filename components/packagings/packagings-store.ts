"use client";

/** Store reativo de embalagens — Fase P0-1. */

import { loadPackagings, savePackagings } from "@/services";
import type { Packaging } from "@/types/pricing";

type Listener = () => void;

/** Referência estável usada no servidor e antes da hidratação. */
const EMPTY_PACKAGINGS: Packaging[] = [];

let cachedPackagings: Packaging[] | null = null;
const listeners = new Set<Listener>();

function ensureLoaded(): Packaging[] {
  if (cachedPackagings === null) cachedPackagings = loadPackagings();
  return cachedPackagings;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pkg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function subscribePackagings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPackagingsSnapshot(): Packaging[] {
  return ensureLoaded();
}

export function getPackagingsServerSnapshot(): Packaging[] {
  return EMPTY_PACKAGINGS;
}

/** Recarrega o cache após a importação de um backup completo. */
export function reloadPackagingsFromStorage(): void {
  cachedPackagings = loadPackagings();
  notify();
}

/** Adiciona uma embalagem já validada, persiste e notifica assinantes. */
export function addPackaging(packaging: Packaging): boolean {
  const withId: Packaging = { ...packaging, id: packaging.id ?? generateId() };
  const next = [...ensureLoaded(), withId];
  const persisted = savePackagings(next);
  cachedPackagings = next;
  notify();
  return persisted;
}

/** Remove uma embalagem pelo id, persiste e notifica assinantes. */
export function removePackaging(id: string): boolean {
  const next = ensureLoaded().filter((packaging) => packaging.id !== id);
  const persisted = savePackagings(next);
  cachedPackagings = next;
  notify();
  return persisted;
}
