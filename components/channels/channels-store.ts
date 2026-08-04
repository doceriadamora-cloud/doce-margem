"use client";

/**
 * Leitura reativa de canais customizados — Fase 2-5.
 *
 * Só leitura de propósito: ainda não existe CRUD de canais na interface (fora
 * do escopo desta fase). Não há função de escrita aqui, então `subscribe` é um
 * no-op (mesmo formato do `Dashboard.tsx` da Fase 2-2, quando nada dentro da
 * sessão podia mudar o dado). Quando uma fase futura criar o CRUD de canais,
 * este arquivo deve ganhar `addCustomChannel`/`removeCustomChannel`, seguindo o
 * padrão de `ingredients-store.ts`/`recipes-store.ts` (ver DECISIONS.md, "Store
 * reativo por feature").
 */

import { loadCustomChannels } from "@/services";
import type { SalesChannel } from "@/types/pricing";

/** Referência estável usada como snapshot do servidor / antes da hidratação. */
const EMPTY_CUSTOM_CHANNELS: SalesChannel[] = [];

let cachedCustomChannels: SalesChannel[] | null = null;

function ensureLoaded(): SalesChannel[] {
  if (cachedCustomChannels === null) {
    cachedCustomChannels = loadCustomChannels();
  }
  return cachedCustomChannels;
}

/** Nada para assinar ainda (sem escrita nesta fase). */
export function subscribeCustomChannels(): () => void {
  return () => {};
}

/** Snapshot atual (lê do storage na primeira chamada, depois usa o cache). */
export function getCustomChannelsSnapshot(): SalesChannel[] {
  return ensureLoaded();
}

/** Snapshot usado no servidor e na primeira pintura do cliente. */
export function getCustomChannelsServerSnapshot(): SalesChannel[] {
  return EMPTY_CUSTOM_CHANNELS;
}
