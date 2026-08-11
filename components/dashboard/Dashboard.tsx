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
            Comece pelo primeiro ingrediente
          </h2>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">
            Informe o nome, a quantidade comprada e o preço pago. Depois disso, você já pode montar
            sua primeira receita.
          </p>
          <Link
            href="/ingredientes"
            className="mt-4 inline-flex rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            Cadastrar primeiro ingrediente
          </Link>
        </div>
      )}

      <section aria-labelledby="workflow-title">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          <span id="workflow-title">Siga esta ordem</span>
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-stone-500 dark:text-stone-400">
          Cada etapa aproveita o que você cadastrou na anterior. Você pode voltar e ajustar os
          dados quando precisar.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <NextStepCard
            step={1}
            title="Ingredientes"
            description="Cadastre o que compra e quanto paga."
            href="/ingredientes"
            action={counts.ingredients > 0 ? "Revisar ingredientes" : "Cadastrar ingredientes"}
            status={
              counts.ingredients === 0
                ? "Comece aqui"
                : counts.ingredients === 1
                  ? "1 cadastrado"
                  : `${counts.ingredients} cadastrados`
            }
          />
          <NextStepCard
            step={2}
            title="Receitas"
            description="Informe ingredientes e rendimento para calcular o custo."
            href="/receitas"
            action={counts.recipes > 0 ? "Revisar receitas" : "Cadastrar receita"}
            status={
              counts.recipes === 0
                ? "Depois dos ingredientes"
                : counts.recipes === 1
                  ? "1 cadastrada"
                  : `${counts.recipes} cadastradas`
            }
          />
          <NextStepCard
            step={3}
            title="Embalagens"
            description="Cadastre o que acompanha cada venda."
            href="/embalagens"
            action={counts.packagings > 0 ? "Revisar embalagens" : "Cadastrar embalagens"}
            status={
              counts.packagings === 0
                ? "Inclua se usar"
                : counts.packagings === 1
                  ? "1 cadastrada"
                  : `${counts.packagings} cadastradas`
            }
          />
          <NextStepCard
            step={4}
            title="Precificação"
            description="Some custos e mão de obra para definir o preço."
            href="/precificacao"
            action="Calcular preço"
            status="Use uma receita pronta"
          />
          <NextStepCard
            step={5}
            title="Orçamento"
            description="Prepare o documento comercial para o cliente."
            href="/orcamentos"
            action="Criar orçamento"
            status="Use o valor final escolhido"
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
  step: number;
  title: string;
  description: string;
  href: string;
  action: string;
  status: string;
}

function NextStepCard({ step, title, description, href, action, status }: NextStepCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-rose-300 hover:bg-rose-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-rose-800 dark:hover:bg-rose-950/20"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {step}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500">{status}</span>
      </div>
      <p className="mt-3 font-medium text-stone-900 dark:text-stone-50">{title}</p>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{description}</p>
      <span className="mt-3 inline-flex text-xs font-semibold text-rose-700 group-hover:underline dark:text-rose-300">
        {action} →
      </span>
    </Link>
  );
}
