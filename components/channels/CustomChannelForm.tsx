"use client";

import { useState, type FormEvent } from "react";
import { validateChannel } from "@/modules/pricing";
import type { SalesChannel, ValidationError } from "@/types/pricing";
import { addCustomChannel, updateCustomChannel } from "./channels-store";

/** Aceita vírgula OU ponto decimal; vazio vira 0 (comissão/taxas costumam ter 0 como padrão razoável). */
function parseNumberOrZero(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

interface CustomChannelFormProps {
  /** Canal sendo editado, ou `null` para cadastrar um novo. */
  editingChannel?: SalesChannel | null;
  /** Chamado ao salvar uma edição ou cancelar. */
  onDoneEditing?: () => void;
}

/**
 * Formulário de cadastro/edição de canal de venda customizado. Monta um
 * `SalesChannel` e delega a validação a `validateChannel` (Fase 1C-1) —
 * nenhuma regra reimplementada. Edição usa o mesmo truque de `key`-remount do
 * `IngredientForm` (Fase 2-7).
 */
export default function CustomChannelForm({
  editingChannel = null,
  onDoneEditing = () => {},
}: CustomChannelFormProps) {
  const [name, setName] = useState(editingChannel?.name ?? "");
  const [commissionPercent, setCommissionPercent] = useState(
    editingChannel ? String(editingChannel.commissionPercent) : "0",
  );
  const [paymentPercent, setPaymentPercent] = useState(
    editingChannel ? String(editingChannel.paymentPercent) : "0",
  );
  const [fixedFee, setFixedFee] = useState(editingChannel ? String(editingChannel.fixedFee) : "0");
  const [adPercent, setAdPercent] = useState(
    editingChannel ? String(editingChannel.adPercent) : "0",
  );
  const [monthlyFee, setMonthlyFee] = useState(
    editingChannel ? String(editingChannel.monthlyFee) : "0",
  );
  const [notes, setNotes] = useState(editingChannel?.notes ?? "");
  const [errors, setErrors] = useState<ValidationError[]>([]);

  function errorFor(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function resetForm(): void {
    setName("");
    setCommissionPercent("0");
    setPaymentPercent("0");
    setFixedFee("0");
    setAdPercent("0");
    setMonthlyFee("0");
    setNotes("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const parsedCommission = parseNumberOrZero(commissionPercent);
    const parsedPayment = parseNumberOrZero(paymentPercent);
    const parsedFixedFee = parseNumberOrZero(fixedFee);
    const parsedAd = parseNumberOrZero(adPercent);
    const parsedMonthlyFee = parseNumberOrZero(monthlyFee);

    if (
      parsedCommission === null ||
      parsedPayment === null ||
      parsedFixedFee === null ||
      parsedAd === null ||
      parsedMonthlyFee === null
    ) {
      setErrors([
        {
          field: "form",
          code: "INVALID_NUMBER",
          message: "Preencha as taxas com valores numéricos válidos.",
        },
      ]);
      return;
    }

    const candidate: SalesChannel = {
      id: "",
      name: name.trim(),
      commissionPercent: parsedCommission,
      paymentPercent: parsedPayment,
      fixedFee: parsedFixedFee,
      adPercent: parsedAd,
      monthlyFee: parsedMonthlyFee,
      ...(notes.trim() !== "" ? { notes: notes.trim() } : {}),
    };

    const validationErrors = validateChannel(candidate);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (editingChannel?.id) {
      updateCustomChannel(editingChannel.id, candidate);
      onDoneEditing();
    } else if (editingChannel) {
      onDoneEditing();
    } else {
      addCustomChannel(candidate);
      setErrors([]);
      resetForm();
    }
  }

  const formError = errorFor("form");

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
    >
      <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
        {editingChannel ? "Editar canal customizado" : "Cadastrar canal customizado"}
      </h3>

      {formError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {formError}
        </p>
      )}

      <Field label="Nome do canal" error={errorFor("name")}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Loja própria"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Comissão (%)" error={errorFor("commissionPercent")}>
          <input
            type="text"
            inputMode="decimal"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Taxa de pagamento (%)" error={errorFor("paymentPercent")}>
          <input
            type="text"
            inputMode="decimal"
            value={paymentPercent}
            onChange={(e) => setPaymentPercent(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Taxa fixa por pedido (R$)" error={errorFor("fixedFee")}>
          <input
            type="text"
            inputMode="decimal"
            value={fixedFee}
            onChange={(e) => setFixedFee(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Anúncio (%)" error={errorFor("adPercent")}>
          <input
            type="text"
            inputMode="decimal"
            value={adPercent}
            onChange={(e) => setAdPercent(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Mensalidade (R$)" error={errorFor("monthlyFee")}>
        <input
          type="text"
          inputMode="decimal"
          value={monthlyFee}
          onChange={(e) => setMonthlyFee(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Observação (opcional)">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: taxa negociada até dez/2026"
          className={inputClass}
        />
      </Field>

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
        >
          {editingChannel ? "Salvar alterações" : "Cadastrar canal"}
        </button>
        {editingChannel && (
          <button
            type="button"
            onClick={onDoneEditing}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancelar edição
          </button>
        )}
      </div>
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
