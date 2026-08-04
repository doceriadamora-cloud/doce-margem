"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { calculateFixedCostSummary } from "@/modules/pricing";
import {
  getFixedCostsServerSnapshot,
  getFixedCostsSnapshot,
  subscribeFixedCosts,
} from "@/components/fixed-costs/fixed-costs-store";
import {
  getBusinessSettingsServerSnapshot,
  getBusinessSettingsSnapshot,
  subscribeBusinessSettings,
  updateBusinessSettings,
} from "./business-settings-store";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Mostra o número salvo como texto editável (vírgula decimal); `null` vira campo vazio. */
function formatNumberForInput(value: number | null): string {
  if (value === null) return "";
  return value.toString().replace(".", ",");
}

type ParsedField = { ok: true; value: number | null } | { ok: false };

/** Aceita vírgula OU ponto; vazio é válido (limpa o campo); só texto não-numérico é erro. */
function parseSettingsNumber(value: string): ParsedField {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return { ok: true, value: null };
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? { ok: true, value: parsed } : { ok: false };
}

/**
 * Faturamento/volume mensal estimado + resumo ao vivo do percentual de custo
 * fixo. Nunca calcula o percentual na UI — sempre via `calculateFixedCostSummary`
 * (Fase 1C-2), combinando estes campos com os custos fixos já cadastrados.
 */
export default function BusinessSettingsForm() {
  const fixedCosts = useSyncExternalStore(
    subscribeFixedCosts,
    getFixedCostsSnapshot,
    getFixedCostsServerSnapshot,
  );
  const settings = useSyncExternalStore(
    subscribeBusinessSettings,
    getBusinessSettingsSnapshot,
    getBusinessSettingsServerSnapshot,
  );

  // `null` = usuária ainda não editou nesta visita → deriva do valor salvo.
  const [revenueDraft, setRevenueDraft] = useState<string | null>(null);
  const [unitsDraft, setUnitsDraft] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const revenueDisplay = revenueDraft ?? formatNumberForInput(settings.estimatedMonthlyRevenue);
  const unitsDisplay = unitsDraft ?? formatNumberForInput(settings.estimatedMonthlyUnits);

  const parsedRevenue = parseSettingsNumber(revenueDisplay);
  const parsedUnits = parseSettingsNumber(unitsDisplay);

  const summary =
    parsedRevenue.ok && parsedRevenue.value !== null && parsedRevenue.value > 0
      ? calculateFixedCostSummary({
          fixedCosts,
          estimatedMonthlyRevenue: parsedRevenue.value,
          ...(parsedUnits.ok && parsedUnits.value ? { estimatedMonthlyUnits: parsedUnits.value } : {}),
        })
      : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSaved(false);

    if (!parsedRevenue.ok || !parsedUnits.ok) {
      setFormError("Preencha o faturamento e o volume estimado com números válidos.");
      return;
    }

    updateBusinessSettings({
      estimatedMonthlyRevenue: parsedRevenue.value,
      estimatedMonthlyUnits: parsedUnits.value,
    });
    setFormError(null);
    setRevenueDraft(null);
    setUnitsDraft(null);
    setSaved(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form
        onSubmit={handleSubmit}
        className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
      >
        {formError && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {formError}
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-300">
            Faturamento mensal estimado (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={revenueDisplay}
            onChange={(e) => {
              setRevenueDraft(e.target.value);
              setSaved(false);
            }}
            placeholder="Ex.: 10000"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-300">
            Volume mensal estimado (unidades, opcional)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={unitsDisplay}
            onChange={(e) => {
              setUnitsDraft(e.target.value);
              setSaved(false);
            }}
            placeholder="Ex.: 770"
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          className="mt-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
        >
          Salvar configurações
        </button>
        {saved && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Salvo. A tela de Precificação já usa este percentual automaticamente.
          </p>
        )}
      </form>

      <div className="flex flex-col justify-center rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        {summary?.ok ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-stone-400 dark:text-stone-500">Custos fixos ativos</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">
                {formatCurrency(summary.value.totalFixedCosts)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400 dark:text-stone-500">
                Faturamento mensal estimado
              </dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">
                {formatCurrency(summary.value.estimatedMonthlyRevenue)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-400 dark:text-stone-500">
                Percentual de custo fixo
              </dt>
              <dd className="text-lg font-semibold text-rose-600 dark:text-rose-400">
                {formatPercent(summary.value.fixedCostRate)}
              </dd>
            </div>
            {summary.value.fixedCostPerUnit !== undefined && (
              <div>
                <dt className="text-xs text-stone-400 dark:text-stone-500">
                  Custo fixo por unidade
                </dt>
                <dd className="font-medium text-stone-800 dark:text-stone-200">
                  {formatCurrency(summary.value.fixedCostPerUnit)}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Informe o faturamento mensal estimado para calcular o percentual de custo fixo.
          </p>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";
