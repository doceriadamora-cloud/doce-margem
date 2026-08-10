"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { isStorageAvailable } from "@/services";
import {
  getIngredientsServerSnapshot,
  getIngredientsSnapshot,
  subscribeIngredients,
} from "@/components/ingredients/ingredients-store";
import {
  getRecipesServerSnapshot,
  getRecipesSnapshot,
  subscribeRecipes,
} from "@/components/recipes/recipes-store";
import {
  getFixedCostsServerSnapshot,
  getFixedCostsSnapshot,
  subscribeFixedCosts,
} from "@/components/fixed-costs/fixed-costs-store";
import {
  getCustomChannelsServerSnapshot,
  getCustomChannelsSnapshot,
  subscribeCustomChannels,
} from "@/components/channels/channels-store";
import {
  getPackagingsServerSnapshot,
  getPackagingsSnapshot,
  subscribePackagings,
} from "@/components/packagings/packagings-store";
import StatCard from "./StatCard";

/**
 * Dashboard inicial — Fase 2-2 (revisado na Fase 2). Client Component: lê o
 * storage local, que só existe no navegador.
 *
 * Lê os MESMOS stores reativos das telas de CRUD (ingredientes, receitas,
 * custos fixos, embalagens, canais) em vez de um cache próprio de `loadAppState()`. A
 * versão original tinha cache próprio com `subscribe` no-op — o que funcionava
 * quando nenhuma tela escrevia dados (Fase 2-2), mas passou a mostrar contagens
 * DESATUALIZADAS assim que as Fases 2-3 a 2-6 criaram telas de cadastro: quem
 * cadastrasse um ingrediente e voltasse ao Painel por navegação client-side
 * ainda via "Você ainda não cadastrou nada". Reusar os stores existentes (ver
 * DECISIONS.md, "uma feature pode LER o store de outra") resolve e ainda elimina
 * a duplicação de responsabilidade de leitura.
 */

/**
 * Disponibilidade do storage é a única coisa aqui que NÃO muda durante a
 * sessão — por isso continua com `subscribe` no-op e cache próprio. O snapshot
 * de servidor é otimista (`true`) para não piscar o aviso durante a hidratação.
 */
let cachedStorageOk: boolean | null = null;

function getStorageOkSnapshot(): boolean {
  if (cachedStorageOk === null) {
    cachedStorageOk = isStorageAvailable();
  }
  return cachedStorageOk;
}

function getStorageOkServerSnapshot(): boolean {
  return true;
}

function subscribeStorageOk(): () => void {
  return () => {};
}

export default function Dashboard() {
  const storageOk = useSyncExternalStore(
    subscribeStorageOk,
    getStorageOkSnapshot,
    getStorageOkServerSnapshot,
  );
  const ingredients = useSyncExternalStore(
    subscribeIngredients,
    getIngredientsSnapshot,
    getIngredientsServerSnapshot,
  );
  const recipes = useSyncExternalStore(
    subscribeRecipes,
    getRecipesSnapshot,
    getRecipesServerSnapshot,
  );
  const fixedCosts = useSyncExternalStore(
    subscribeFixedCosts,
    getFixedCostsSnapshot,
    getFixedCostsServerSnapshot,
  );
  const customChannels = useSyncExternalStore(
    subscribeCustomChannels,
    getCustomChannelsSnapshot,
    getCustomChannelsServerSnapshot,
  );
  const packagings = useSyncExternalStore(
    subscribePackagings,
    getPackagingsSnapshot,
    getPackagingsServerSnapshot,
  );

  const counts = {
    ingredients: ingredients.length,
    recipes: recipes.length,
    fixedCosts: fixedCosts.length,
    packagings: packagings.length,
    customChannels: customChannels.length,
  };
  const hasAnyData =
    counts.ingredients +
      counts.recipes +
      counts.fixedCosts +
      counts.packagings +
      counts.customChannels >
    0;

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
          className="grid grid-cols-2 gap-4 lg:grid-cols-5"
        >
          <StatCard label="Ingredientes cadastrados" value={counts.ingredients} />
          <StatCard label="Receitas cadastradas" value={counts.recipes} />
          <StatCard label="Custos fixos cadastrados" value={counts.fixedCosts} />
          <StatCard label="Embalagens cadastradas" value={counts.packagings} />
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
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <NextStepCard
            title="Cadastre suas embalagens"
            description="Inclua caixas, saquinhos, etiquetas e bandejas no custo final de cada venda."
            href="/embalagens"
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
  href?: string;
}

function NextStepCard({ title, description, href }: NextStepCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <p className="font-medium text-stone-900 dark:text-stone-50">{title}</p>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{description}</p>
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
        >
          Disponível
        </Link>
      ) : (
        <span className="mt-3 inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          Em breve
        </span>
      )}
    </div>
  );
}
