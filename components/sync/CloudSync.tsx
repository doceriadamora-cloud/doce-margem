"use client";

import { useEffect } from "react";
import {
  hasStoredAppState,
  loadAppState,
  saveAppState,
  subscribeToAppStateSaves,
} from "@/services";
import {
  loadCloudAppState,
  saveCloudAppState,
  type CloudUnavailableReason,
} from "@/services/cloud-app-state";
import { decideInitialSync, isAppStateEmpty } from "@/lib/cloud-sync-decision";
import type { AppState } from "@/types/app-state";
import { reloadAllStoresFromStorage } from "./reload-stores";
import { resetCloudSyncState, setCloudSyncState } from "./cloud-sync-store";

/**
 * Sincronização com a nuvem — Fase P0-10.
 *
 * Não renderiza nada. Montado uma vez pelo layout, e **só para quem tem
 * sessão** — visitante não tem estado para sincronizar.
 *
 * ## O modelo
 *
 * O localStorage continua sendo a fonte que a interface lê, de forma síncrona.
 * A nuvem é uma **cópia**, não a origem. Isso é o que permite entregar esta
 * fase sem reescrever os oito stores: `useSyncExternalStore` exige snapshot
 * síncrono, e Supabase é assíncrono — a incompatibilidade registrada em
 * `DECISIONS.md` desde 2026-08-05 continua de pé, e esta fase passa ao lado
 * dela de propósito.
 *
 * ## O ciclo
 *
 * 1. Ao montar, lê a cópia da nuvem e decide o encontro com o estado local
 *    (`lib/cloud-sync-decision.ts` — pura e testada isolada).
 * 2. Se a nuvem ganha, grava localmente **preservando o `updatedAt` de lá** e
 *    recarrega os stores; a tela se atualiza sozinha.
 * 3. Depois disso, toda gravação local dispara um envio com atraso, para uma
 *    sequência de digitação virar uma requisição, não vinte.
 * 4. Se a nuvem falhar em qualquer ponto, o app segue funcionando com o
 *    navegador e o status diz isso em português.
 */

/** Espera antes de mandar para a nuvem. Agrupa rajadas de digitação. */
const PUSH_DEBOUNCE_MS = 2000;

/** Como cada motivo de indisponibilidade aparece para a usuária. */
const UNAVAILABLE_COPY: Record<CloudUnavailableReason, string> = {
  "not-configured": "Salvo neste navegador. A cópia em nuvem não está ativa neste ambiente.",
  "not-authenticated": "Salvo neste navegador. Entre na sua conta para guardar uma cópia na nuvem.",
  "missing-table": "Salvo neste navegador. A cópia em nuvem ainda não foi ativada nesta conta.",
  network: "Sem conexão — salvo neste navegador. Enviamos assim que a internet voltar.",
  error: "Não foi possível salvar na nuvem agora. Seus dados continuam neste navegador.",
};

/** `error` é o único motivo que merece cara de erro; o resto é degradação normal. */
function phaseFor(reason: CloudUnavailableReason): "local-only" | "error" {
  return reason === "error" ? "error" : "local-only";
}

export default function CloudSync() {
  useEffect(() => {
    let cancelled = false;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    /** Estado esperando envio — usado também para retomar quando a internet volta. */
    let pendingState: AppState | null = null;
    /** Enquanto hidratamos, a gravação local não pode virar envio de volta. */
    let hydrating = false;

    // Capturado ANTES de qualquer `await`: se a usuária cadastrar algo enquanto
    // a busca na nuvem acontece, a chave passa a existir e o navegador deixaria
    // de ser "novo" no meio da decisão.
    const hadLocalStoredState = hasStoredAppState();

    async function push(state: AppState): Promise<void> {
      setCloudSyncState({ phase: "syncing", detail: "Salvando na nuvem…" });
      const result = await saveCloudAppState(state);
      if (cancelled) return;

      if (result.status === "saved") {
        pendingState = null;
        setCloudSyncState({
          phase: "saved",
          lastSyncedAt: result.savedAt,
          detail: "Salvo na nuvem.",
        });
        return;
      }

      // Guarda o que ficou faltando: o ouvinte de `online` reenvia.
      pendingState = state;
      setCloudSyncState({
        phase: phaseFor(result.reason),
        detail: UNAVAILABLE_COPY[result.reason],
      });
    }

    function schedulePush(state: AppState): void {
      pendingState = state;
      if (pushTimer !== null) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        pushTimer = null;
        if (pendingState !== null) void push(pendingState);
      }, PUSH_DEBOUNCE_MS);
    }

    function hydrate(cloudState: AppState): void {
      hydrating = true;
      try {
        // `preserveUpdatedAt` mantém a data de origem: sem isso, o navegador
        // ficaria "mais novo" que a nuvem só por ter recebido a cópia dela, e
        // devolveria o mesmo dado no próximo carregamento.
        const persisted = saveAppState(cloudState, { preserveUpdatedAt: true });
        if (!persisted) {
          setCloudSyncState({
            phase: "error",
            detail:
              "Encontramos sua cópia na nuvem, mas este navegador bloqueou o armazenamento local.",
          });
          return;
        }
        reloadAllStoresFromStorage();
        setCloudSyncState({
          phase: "saved",
          lastSyncedAt: cloudState.updatedAt,
          detail: "Dados restaurados da sua cópia na nuvem.",
        });
      } finally {
        hydrating = false;
      }
    }

    async function initialSync(): Promise<void> {
      setCloudSyncState({ phase: "syncing", detail: "Procurando sua cópia na nuvem…" });

      const cloud = await loadCloudAppState();
      if (cancelled) return;

      if (cloud.status === "unavailable") {
        setCloudSyncState({
          phase: phaseFor(cloud.reason),
          detail: UNAVAILABLE_COPY[cloud.reason],
        });
        return;
      }

      const local = loadAppState();
      const decision = decideInitialSync({
        hasLocalStoredState: hadLocalStoredState,
        localUpdatedAt: local.updatedAt,
        localIsEmpty: isAppStateEmpty(local),
        cloudUpdatedAt: cloud.status === "loaded" ? cloud.updatedAt : null,
      });

      if (decision.action === "hydrate-from-cloud" && cloud.status === "loaded") {
        hydrate(cloud.state);
        return;
      }
      if (decision.action === "push-local") {
        await push(local);
        return;
      }
      setCloudSyncState({
        phase: "saved",
        lastSyncedAt: cloud.status === "loaded" ? cloud.updatedAt : null,
        detail: "Sua cópia na nuvem está em dia.",
      });
    }

    /** Internet de volta: reenvia o que ficou pendente, sem esperar nova edição. */
    function handleOnline(): void {
      if (pendingState !== null) void push(pendingState);
    }

    const unsubscribe = subscribeToAppStateSaves((state) => {
      if (hydrating) return;
      schedulePush(state);
    });
    window.addEventListener("online", handleOnline);

    void initialSync();

    return () => {
      cancelled = true;
      if (pushTimer !== null) clearTimeout(pushTimer);
      window.removeEventListener("online", handleOnline);
      unsubscribe();
      resetCloudSyncState();
    };
  }, []);

  return null;
}
