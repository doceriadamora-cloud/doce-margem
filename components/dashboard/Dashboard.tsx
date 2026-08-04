"use client";

import { useSyncExternalStore } from "react";
import { isStorageAvailable, loadAppState } from "@/services";
import type { AppState } from "@/types/app-state";
import StatCard from "./StatCard";

/**
 * Dashboard inicial — Fase 2-2. Client Component: lê o storageService local
 * (localStorage), que só existe no navegador.
 *
 * Usa `useSyncExternalStore` (não `useEffect` + `setState`) para sincronizar com
 * o localStorage: no servidor e na primeira pintura do cliente (antes da
 * hidratação), devolve `SERVER_SNAPSHOT`; assim que o React hidrata, lê o valor
 * real do navegador e corrige a tela — sem divergência de hidratação e sem o
 * "cascading render" de chamar `setState` dentro de um efeito.
 */

interface DashboardSnapshot {
  appState: AppState;
  storageOk: boolean;
}

/** Estado usado no servidor (sem `window`) e na primeira pintura do cliente. */
const SERVER_SNAPSHOT: DashboardSnapshot = {
  appState: {
    schemaVersion: 1,
    ingredients: [],
    recipes: [],
    fixedCosts: [],
    customChannels: [],
    updatedAt: "",
  },
  // Otimista: assume que o storage funciona até o cliente provar o contrário,
  // para não piscar o aviso de indisponibilidade em todo carregamento normal.
  storageOk: true,
};

/**
 * Cache do snapshot real. `useSyncExternalStore` exige que `getSnapshot`
 * devolva uma referência ESTÁVEL quando nada mudou (senão o React re-renderiza
 * em loop). Como o Dashboard só lê (não grava), uma leitura por carregamento de
 * página é suficiente.
 */
let cachedSnapshot: DashboardSnapshot | null = null;

function getSnapshot(): DashboardSnapshot {
  if (cachedSnapshot === null) {
    cachedSnapshot = {
      appState: loadAppState(),
      storageOk: isStorageAvailable(),
    };
  }
  return cachedSnapshot;
}

function getServerSnapshot(): DashboardSnapshot {
  return SERVER_SNAPSHOT;
}

/** Sem eventos de mudança no storageService ainda — nada para assinar. */
function subscribe(): () => void {
  return () => {};
}

export default function Dashboard() {
  const { appState, storageOk } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const counts = {
    ingredients: appState.ingredients.length,
    recipes: appState.recipes.length,
    fixedCosts: appState.fixedCosts.length,
    customChannels: appState.customChannels.length,
  };
  const hasAnyData =
    counts.ingredients + counts.recipes + counts.fixedCosts + counts.customChannels > 0;

  return (
    <div className="flex flex-col gap-8">
      {!storageOk && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Não conseguimos acessar o armazenamento deste navegador — seus dados não serão salvos
          enquanto isso não for resolvido (ex.: saia da navegação privada).
        </p>
      )}

      {hasAnyData ? (
        <section
          aria-label="Resumo dos seus dados"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <StatCard label="Ingredientes cadastrados" value={counts.ingredients} />
          <StatCard label="Receitas cadastradas" value={counts.recipes} />
          <StatCard label="Custos fixos cadastrados" value={counts.fixedCosts} />
          <StatCard label="Canais customizados" value={counts.customChannels} />
        </section>
      ) : (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950">
          <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
            Você ainda não cadastrou nada por aqui
          </h2>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">
            Comece cadastrando seus ingredientes — é o primeiro passo para descobrir o custo real
            dos seus doces.
          </p>
        </div>
      )}

      <section aria-label="Próximos passos">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          Próximos passos
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <NextStepCard
            title="Cadastre seus ingredientes"
            description="Informe o que você compra e por quanto, para saber o custo real de cada item."
          />
          <NextStepCard
            title="Monte uma receita"
            description="Junte os ingredientes numa ficha técnica e descubra o custo de cada doce."
          />
          <NextStepCard
            title="Calcule o preço"
            description="Defina sua margem e veja por quanto vender sem perder dinheiro."
          />
        </div>
      </section>

      <p className="text-xs text-stone-400 dark:text-stone-600">
        Seus dados ficam salvos neste navegador (localStorage) — nada é enviado para a internet.
      </p>
    </div>
  );
}

interface NextStepCardProps {
  title: string;
  description: string;
}

function NextStepCard({ title, description }: NextStepCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <p className="font-medium text-stone-900 dark:text-stone-50">{title}</p>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{description}</p>
      <span className="mt-3 inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        Em breve
      </span>
    </div>
  );
}
