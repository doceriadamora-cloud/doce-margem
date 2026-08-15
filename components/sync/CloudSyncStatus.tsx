"use client";

import { useSyncExternalStore } from "react";
import {
  getCloudSyncServerSnapshot,
  getCloudSyncSnapshot,
  subscribeCloudSync,
  type CloudSyncPhase,
} from "./cloud-sync-store";

/**
 * Status da cópia em nuvem — Fase P0-10.
 *
 * Duas apresentações do mesmo store: `badge` para o rodapé (uma linha, discreta)
 * e `panel` para as Configurações (com explicação e horário).
 *
 * Enquanto a fase for `idle` — visitante, ou app recém-aberto — não renderiza
 * nada. Status de sincronização em tela de quem não sincroniza é ruído.
 */

const LABEL: Record<CloudSyncPhase, string> = {
  idle: "",
  syncing: "Salvando…",
  saved: "Salvo na nuvem",
  "local-only": "Salvo neste navegador",
  error: "Erro ao salvar na nuvem",
};

const DOT_CLASS: Record<CloudSyncPhase, string> = {
  idle: "",
  syncing: "bg-amber-500",
  saved: "bg-emerald-500",
  "local-only": "bg-stone-400",
  error: "bg-red-500",
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CloudSyncStatusProps {
  variant?: "badge" | "panel";
}

export default function CloudSyncStatus({ variant = "badge" }: CloudSyncStatusProps) {
  const state = useSyncExternalStore(
    subscribeCloudSync,
    getCloudSyncSnapshot,
    getCloudSyncServerSnapshot,
  );

  if (state.phase === "idle") return null;

  if (variant === "badge") {
    return (
      <span
        // `polite` para o leitor de tela anunciar sem interromper o que a
        // usuária está fazendo — salvar é fundo, não interrupção.
        aria-live="polite"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"
      >
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full ${DOT_CLASS[state.phase]}`}
        />
        {LABEL[state.phase]}
      </span>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${DOT_CLASS[state.phase]}`}
        />
        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
          {LABEL[state.phase]}
        </h3>
      </div>

      {state.detail !== null && (
        <p
          aria-live="polite"
          className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400"
        >
          {state.detail}
        </p>
      )}

      {state.lastSyncedAt !== null && (
        <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
          Última sincronização: {formatDateTime(state.lastSyncedAt)}
        </p>
      )}
    </div>
  );
}
