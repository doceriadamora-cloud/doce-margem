"use client";

import { useSyncExternalStore } from "react";
import { calculatePackagingUnitCost } from "@/modules/pricing";
import {
  getPackagingsServerSnapshot,
  getPackagingsSnapshot,
  removePackaging,
  subscribePackagings,
} from "./packagings-store";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export default function PackagingList() {
  const packagings = useSyncExternalStore(
    subscribePackagings,
    getPackagingsSnapshot,
    getPackagingsServerSnapshot,
  );

  if (packagings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="font-medium text-stone-900 dark:text-stone-50">
          Nenhuma embalagem cadastrada ainda
        </p>
        <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">
          Cadastre a primeira para incluir esse custo na sua precificação.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {packagings.map((packaging) => {
        const unitCost = calculatePackagingUnitCost(packaging);
        return (
          <li
            key={packaging.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="min-w-0">
              <p className="font-medium text-stone-900 dark:text-stone-50">{packaging.name}</p>
              <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                Pacote com {packaging.packageQuantity} un por {formatCurrency(packaging.purchasePrice)}
                {unitCost.ok && (
                  <>
                    {" — "}
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(unitCost.value)}/un
                    </span>
                  </>
                )}
              </p>
              {packaging.notes && (
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {packaging.notes}
                </p>
              )}
              {!unitCost.ok && (
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                  Não foi possível calcular o custo: {unitCost.errors[0]?.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!packaging.id) return;
                if (!window.confirm("Tem certeza que deseja excluir esta embalagem?")) return;
                removePackaging(packaging.id);
              }}
              className="shrink-0 rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
            >
              Excluir
            </button>
          </li>
        );
      })}
    </ul>
  );
}
