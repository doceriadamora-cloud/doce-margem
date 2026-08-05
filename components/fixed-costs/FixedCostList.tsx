"use client";

import { useSyncExternalStore } from "react";
import type { FixedCostCategory } from "@/types/pricing";
import {
  getFixedCostsServerSnapshot,
  getFixedCostsSnapshot,
  removeFixedCost,
  subscribeFixedCosts,
} from "./fixed-costs-store";

const CATEGORY_LABEL: Record<FixedCostCategory, string> = {
  aluguel: "Aluguel",
  energia: "Energia",
  agua: "Água",
  internet: "Internet",
  gas: "Gás",
  telefone: "Telefone",
  contador: "Contador",
  software: "Software",
  funcionario: "Funcionário",
  pro_labore: "Pró-labore",
  marketplace: "Marketplace",
  outros: "Outros",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface FixedCostListProps {
  /** Id do custo fixo sendo editado agora (destaca a linha), ou `null`. */
  editingId?: string | null;
  /** Chamado quando a usuária clica "Editar" numa linha. */
  onEdit: (id: string) => void;
}

/** Lista os custos fixos cadastrados. */
export default function FixedCostList({ editingId = null, onEdit }: FixedCostListProps) {
  const fixedCosts = useSyncExternalStore(
    subscribeFixedCosts,
    getFixedCostsSnapshot,
    getFixedCostsServerSnapshot,
  );

  if (fixedCosts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="font-medium text-stone-900 dark:text-stone-50">
          Nenhum custo fixo cadastrado ainda
        </p>
        <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">
          Use o formulário para cadastrar o primeiro — ex.: Aluguel, R$ 1.200 por mês.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {fixedCosts.map((cost) => (
        <li
          key={cost.id}
          className={`flex items-start justify-between gap-3 rounded-2xl border bg-white p-4 dark:bg-stone-900 ${
            cost.id === editingId
              ? "border-rose-300 ring-2 ring-rose-100 dark:border-rose-700 dark:ring-rose-950"
              : "border-stone-200 dark:border-stone-800"
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-stone-900 dark:text-stone-50">{cost.name}</p>
              {!cost.active && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  Inativo
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              {CATEGORY_LABEL[cost.category]} — {formatCurrency(cost.monthlyValue)}/mês
            </p>
            {cost.notes && (
              <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">{cost.notes}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onEdit(cost.id)}
              className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-rose-800 dark:hover:bg-rose-950 dark:hover:text-rose-300"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Tem certeza que deseja excluir este custo fixo?")) return;
                removeFixedCost(cost.id);
              }}
              className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
            >
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
