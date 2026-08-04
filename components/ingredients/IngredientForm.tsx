"use client";

import { useState, type FormEvent } from "react";
import { calculateIngredient, validateIngredient } from "@/modules/pricing";
import type { BaseUnit, Ingredient, PurchaseUnit, ValidationError } from "@/types/pricing";
import { addIngredient } from "./ingredients-store";

const PURCHASE_UNITS: { value: PurchaseUnit; label: string }[] = [
  { value: "g", label: "g (grama)" },
  { value: "kg", label: "kg (quilo)" },
  { value: "ml", label: "ml (mililitro)" },
  { value: "l", label: "l (litro)" },
  { value: "un", label: "un (unidade)" },
];

const BASE_UNITS: { value: BaseUnit; label: string }[] = [
  { value: "g", label: "g (grama)" },
  { value: "ml", label: "ml (mililitro)" },
  { value: "un", label: "unidade" },
];

/** Número obrigatório: vazio ou não-finito vira `null` (erro). */
function parseRequiredNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Número opcional (fator de correção): vazio vira `undefined` (usa o padrão do domínio). */
function parseOptionalNumber(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCost(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/**
 * Formulário de cadastro de ingrediente. Só monta o `Ingredient` e delega
 * validação/cálculo às funções de domínio da Fase 1A (`validateIngredient`,
 * `calculateIngredient`) — não reimplementa nenhuma regra aqui.
 */
export default function IngredientForm() {
  const [name, setName] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState<PurchaseUnit>("g");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>("g");
  const [correctionFactor, setCorrectionFactor] = useState("1");
  const [errors, setErrors] = useState<ValidationError[]>([]);

  function errorFor(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function resetForm(): void {
    setName("");
    setPurchaseQuantity("");
    setPurchaseUnit("g");
    setPurchasePrice("");
    setBaseUnit("g");
    setCorrectionFactor("1");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const parsedQuantity = parseRequiredNumber(purchaseQuantity);
    const parsedPrice = parseRequiredNumber(purchasePrice);
    const parsedCorrection = parseOptionalNumber(correctionFactor);

    if (parsedQuantity === null || parsedPrice === null || parsedCorrection === null) {
      setErrors([
        {
          field: "form",
          code: "INVALID_NUMBER",
          message: "Preencha os campos numéricos com valores válidos.",
        },
      ]);
      return;
    }

    const candidate: Ingredient = {
      name: name.trim(),
      purchaseQuantity: parsedQuantity,
      purchaseUnit,
      purchasePrice: parsedPrice,
      baseUnit,
      ...(parsedCorrection !== undefined ? { correctionFactor: parsedCorrection } : {}),
    };

    const validationErrors = validateIngredient(candidate);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    addIngredient(candidate);
    setErrors([]);
    resetForm();
  }

  // Prévia do custo por unidade-base, calculada com a mesma função de domínio
  // usada na listagem — só aparece quando dá pra calcular algo coerente.
  const previewQuantity = parseRequiredNumber(purchaseQuantity);
  const previewPrice = parseRequiredNumber(purchasePrice);
  const previewCorrection = parseOptionalNumber(correctionFactor);
  const preview =
    previewQuantity !== null &&
    previewQuantity > 0 &&
    previewPrice !== null &&
    previewPrice > 0 &&
    previewCorrection !== null
      ? calculateIngredient({
          name: name || "Ingrediente",
          purchaseQuantity: previewQuantity,
          purchaseUnit,
          purchasePrice: previewPrice,
          baseUnit,
          ...(previewCorrection !== undefined ? { correctionFactor: previewCorrection } : {}),
        })
      : null;

  const formError = errorFor("form");

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
        Cadastrar ingrediente
      </h2>

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
          placeholder="Ex.: Chocolate ao leite"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade comprada" error={errorFor("purchaseQuantity")}>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={purchaseQuantity}
            onChange={(e) => setPurchaseQuantity(e.target.value)}
            placeholder="Ex.: 1"
            className={inputClass}
          />
        </Field>

        <Field label="Unidade de compra">
          <select
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value as PurchaseUnit)}
            className={inputClass}
          >
            {PURCHASE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Preço pago (R$)" error={errorFor("purchasePrice")}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
          placeholder="Ex.: 38"
          className={inputClass}
        />
      </Field>

      <Field
        label="Unidade-base"
        error={errorFor("baseUnit")}
        hint="A unidade usada para calcular o custo (normalmente g, ml ou un)."
      >
        <select
          value={baseUnit}
          onChange={(e) => setBaseUnit(e.target.value as BaseUnit)}
          className={inputClass}
        >
          {BASE_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Fator de correção"
        error={errorFor("correctionFactor")}
        hint="Deixe 1 se você não sabe o que é isso."
      >
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={correctionFactor}
          onChange={(e) => setCorrectionFactor(e.target.value)}
          className={inputClass}
        />
      </Field>

      {preview && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {preview.ok ? (
            <>
              Custo calculado:{" "}
              <span className="font-semibold">
                {formatCost(preview.value.costPerBaseUnit)}/{baseUnit}
              </span>
            </>
          ) : (
            <>Não foi possível calcular: {preview.errors[0]?.message}</>
          )}
        </p>
      )}

      <button
        type="submit"
        className="mt-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
      >
        Cadastrar ingrediente
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-stone-400 dark:text-stone-500">{hint}</span>}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
