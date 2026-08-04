"use client";

import { useState, type FormEvent } from "react";
import { validateFixedCost } from "@/modules/pricing";
import type { FixedCost, FixedCostCategory, ValidationError } from "@/types/pricing";
import { addFixedCost } from "./fixed-costs-store";

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

const CATEGORIES = Object.keys(CATEGORY_LABEL) as FixedCostCategory[];

/** Aceita vírgula OU ponto decimal. */
function parseRequiredNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Formulário de cadastro de custo fixo. Monta um `FixedCost` e delega a
 * validação a `validateFixedCost` (Fase 1C-2) — nenhuma regra reimplementada.
 */
export default function FixedCostForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FixedCostCategory>("aluguel");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<ValidationError[]>([]);

  function errorFor(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function resetForm(): void {
    setName("");
    setCategory("aluguel");
    setMonthlyValue("");
    setActive(true);
    setNotes("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const parsedValue = parseRequiredNumber(monthlyValue);
    if (parsedValue === null) {
      setErrors([
        {
          field: "form",
          code: "INVALID_NUMBER",
          message: "Preencha o valor mensal com um número válido.",
        },
      ]);
      return;
    }

    const candidate: FixedCost = {
      id: "",
      name: name.trim(),
      category,
      monthlyValue: parsedValue,
      active,
      ...(notes.trim() !== "" ? { notes: notes.trim() } : {}),
    };

    const validationErrors = validateFixedCost(candidate);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    addFixedCost(candidate);
    setErrors([]);
    resetForm();
  }

  const formError = errorFor("form");

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
    >
      <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
        Cadastrar custo fixo
      </h3>

      {formError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {formError}
        </p>
      )}

      <Field label="Nome" error={errorFor("name")}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Aluguel"
          className={inputClass}
        />
      </Field>

      <Field label="Categoria">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FixedCostCategory)}
          className={inputClass}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Valor mensal (R$)" error={errorFor("monthlyValue")}>
        <input
          type="text"
          inputMode="decimal"
          value={monthlyValue}
          onChange={(e) => setMonthlyValue(e.target.value)}
          placeholder="Ex.: 1200"
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-400"
        />
        Ativo (entra no total de custos fixos)
      </label>

      <Field label="Observação (opcional)">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: vence todo dia 10"
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        className="mt-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
      >
        Cadastrar custo fixo
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
