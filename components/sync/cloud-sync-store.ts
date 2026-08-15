"use client";

/**
 * Status da sincronização em nuvem — Fase P0-10.
 *
 * Mesmo padrão dos stores de feature (ver DECISIONS.md, "Store reativo por
 * feature"): cache de módulo + assinantes + snapshot estável para
 * `useSyncExternalStore`.
 *
 * Guarda **só o que a interface mostra**. Nenhuma regra de sincronização mora
 * aqui — a decisão é de `lib/cloud-sync-decision.ts` e a execução é do
 * `CloudSync`.
 */

type Listener = () => void;

/** Em que pé está a cópia em nuvem. */
export type CloudSyncPhase =
  /** Ainda não começou (visitante, ou app recém-aberto). */
  | "idle"
  /** Lendo ou gravando agora. */
  | "syncing"
  /** Cópia em nuvem em dia. */
  | "saved"
  /** Gravado no navegador; a nuvem não está disponível agora. */
  | "local-only"
  /** A gravação na nuvem falhou. */
  | "error";

export interface CloudSyncState {
  phase: CloudSyncPhase;
  /** Data/hora ISO da última gravação confirmada na nuvem. */
  lastSyncedAt: string | null;
  /** Explicação curta do estado atual, já em português, pronta para exibir. */
  detail: string | null;
}

const INITIAL_STATE: CloudSyncState = {
  phase: "idle",
  lastSyncedAt: null,
  detail: null,
};

let currentState: CloudSyncState = INITIAL_STATE;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeCloudSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCloudSyncSnapshot(): CloudSyncState {
  return currentState;
}

/**
 * Snapshot do servidor e da primeira pintura. Referência estável e constante —
 * um objeto novo a cada chamada quebraria a hidratação.
 */
export function getCloudSyncServerSnapshot(): CloudSyncState {
  return INITIAL_STATE;
}

/** Atualiza o status. Só notifica quando algo mudou de fato. */
export function setCloudSyncState(next: Partial<CloudSyncState>): void {
  const merged: CloudSyncState = { ...currentState, ...next };
  if (
    merged.phase === currentState.phase &&
    merged.lastSyncedAt === currentState.lastSyncedAt &&
    merged.detail === currentState.detail
  ) {
    return;
  }
  currentState = merged;
  notify();
}

/** Volta ao estado inicial — usado quando a sincronização é desmontada. */
export function resetCloudSyncState(): void {
  if (currentState === INITIAL_STATE) return;
  currentState = INITIAL_STATE;
  notify();
}
