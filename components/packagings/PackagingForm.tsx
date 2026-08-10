"use client";

import { useState, type FormEvent } from "react";
import { calculatePackagingUnitCost, validatePackaging } from "@/modules/pricing";
import type { Packaging, ValidationError } from "@/types/pricing";
import { addPackaging } from "./packagings-store";

function parseRequiredNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export default function PackagingForm() {
  const [name, setName] = useState("");
  const [packageQuantity, setPackageQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<ValidationError[]>([]);

  function errorFor(field: string): string | undefined {
    return errors.find((error) => error.field === field)?.message;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const parsedQuantity = parseRequiredNumber(packageQuantity);
    const parsedPrice = parseRequiredNumber(purchasePrice);
    if (parsedQuantity === null || parsedPrice === null) {
      setErrors([
        {
          field: "form",
          code: "INVALID_NUMBER",
          message: "Preencha a quantidade e o preço do pacote com valores válidos.",
        },
      ]);
      return;
    }

    const candidate: Packaging = {
      name: name.trim(),
      packageQuantity: parsedQuantity,
      purchasePrice: parsedPrice,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const validationErrors = validatePackaging(candidate);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    addPackaging(candidate);
    setName("");
    setPackageQuantity("");
    setPurchasePrice("");
    setNotes("");
    setErrors([]);
  }

  const previewQuantity = parseRequiredNumber(packageQuantity);
  const previewPrice = parseRequiredNumber(purchasePrice);
  const preview =
    previewQuantity !== null &&
    previewQuantity > 0 &&
    previewPrice !== null &&
    previewPrice > 0
      ? calculatePackagingUnitCost({
          name: name || "Embalagem",
          packageQuantity: previewQuantity,
          purchasePrice: previewPrice,
        })
      : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
        Cadastrar embalagem
      </h2>

      {errorFor("form") && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {errorFor("form")}
        </p>
      )}

      <Field label="Nome" error={errorFor("name")}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Caixa kraft 12x12"
          className={inputClass}
        />
      </Field>

      <Field
        label="Quantidade no pacote"
        error={errorFor("packageQuantity")}
        hint="Quantas unidades vieram na compra."
      >
        <input
          type="text"
          inputMode="decimal"
          value={packageQuantity}
          onChange={(event) => setPackageQuantity(event.target.value)}
          placeholder="Ex.: 10"
          className={inputClass}
        />
      </Field>

      <Field label="Preço pago no pacote (R$)" error={errorFor("purchasePrice")}>
        <input
          type="text"
          inputMode="decimal"
          value={purchasePrice}
          onChange={(event) => setPurchasePrice(event.target.value)}
          placeholder="Ex.: 18,00"
          className={inputClass}
        />
      </Field>

      <Field label="Observação (opcional)" hint="Ex.: fornecedor, tamanho ou cor.">
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Ex.: Usada nos kits com 4 doces"
          className={inputClass}
        />
      </Field>

      {preview?.ok && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
          Custo unitário: <strong>{formatCurrency(preview.value)}/un</strong>
        </p>
      )}

      <button
        type="submit"
        className="w-fit rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
      >
        Cadastrar embalagem
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
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : (
        hint && <span className="text-xs text-stone-400 dark:text-stone-500">{hint}</span>
      )}
    </label>
  );
}
