"use client";

import { useState, type FormEvent } from "react";
import { applyCorrectionFactor, calculateIngredient, validateIngredient } from "@/modules/pricing";
import type { BaseUnit, Ingredient, PurchaseUnit, ValidationError } from "@/types/pricing";
import AdvancedSection from "@/components/advanced/AdvancedSection";
import { addIngredient, updateIngredient } from "./ingredients-store";

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

/** Quantidade sem unidade, para o exemplo do fator de correção. */
function formatQuantity(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

interface IngredientFormProps {
  /** Ingrediente sendo editado, ou `null` para cadastrar um novo. */
  editingIngredient?: Ingredient | null;
  /** Chamado ao salvar uma edição ou cancelar — some da lista o "modo edição". */
  onDoneEditing?: () => void;
}

/**
 * Formulário de cadastro/edição de ingrediente. Só monta o `Ingredient` e
 * delega validação/cálculo às funções de domínio da Fase 1A
 * (`validateIngredient`, `calculateIngredient`) — não reimplementa nenhuma
 * regra aqui.
 *
 * Edição reaproveita o mesmo formulário (Fase 2-7): o componente pai renderiza
 * `<IngredientForm key={editingIngredient?.id ?? "new"} .../>` — trocar a
 * `key` faz o React remontar o componente do zero, o que reinicializa os
 * `useState` com os valores do ingrediente sendo editado sem precisar de
 * `useEffect` (evita o mesmo problema de "cascading render" já corrigido nas
 * fases anteriores).
 */
export default function IngredientForm({
  editingIngredient = null,
  onDoneEditing = () => {},
}: IngredientFormProps) {
  const [name, setName] = useState(editingIngredient?.name ?? "");
  const [purchaseQuantity, setPurchaseQuantity] = useState(
    editingIngredient ? String(editingIngredient.purchaseQuantity) : "",
  );
  const [purchaseUnit, setPurchaseUnit] = useState<PurchaseUnit>(
    editingIngredient?.purchaseUnit ?? "g",
  );
  const [purchasePrice, setPurchasePrice] = useState(
    editingIngredient ? String(editingIngredient.purchasePrice) : "",
  );
  const [baseUnit, setBaseUnit] = useState<BaseUnit>(editingIngredient?.baseUnit ?? "g");
  const [correctionFactor, setCorrectionFactor] = useState(
    editingIngredient?.correctionFactor !== undefined
      ? String(editingIngredient.correctionFactor)
      : "1",
  );
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

    if (editingIngredient?.id) {
      updateIngredient(editingIngredient.id, candidate);
      onDoneEditing();
    } else if (editingIngredient) {
      // Invariante: um ingrediente em edição sempre veio do store, que sempre
      // atribui id antes de persistir — este ramo não deveria ser alcançável.
      onDoneEditing();
    } else {
      addIngredient(candidate);
      setErrors([]);
      resetForm();
    }
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

  // Modo avançado (P0-9A). `correctionFactorIsCustom` alimenta só o resumo e o
  // efeito exibido; o estado inicial de "aberto" é congelado no primeiro render
  // de propósito — se dependesse do valor atual, apagar o campo para redigitar
  // fecharia a seção no meio da edição.
  const [advancedStartsOpen] = useState(
    () => (editingIngredient?.correctionFactor ?? 1) !== 1,
  );
  const correctionFactorIsCustom =
    typeof previewCorrection === "number" && previewCorrection !== 1;
  const correctionEffect =
    correctionFactorIsCustom && previewCorrection > 0
      ? // Usa a própria função de domínio, em vez de repetir a multiplicação:
        // se a semântica do fator mudar, este texto muda junto.
        formatQuantity(applyCorrectionFactor(100, previewCorrection))
      : null;

  const formError = errorFor("form");

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
        {editingIngredient ? "Editar ingrediente" : "Cadastrar ingrediente"}
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

      {/*
        Modo avançado (P0-9A). O fator de correção era um campo fixo com a dica
        "deixe 1 se você não sabe o que é isso" — pedir para ignorar um campo é
        pior do que recolhê-lo. Agora ele fica atrás de uma abertura opcional,
        com explicação de verdade e o efeito visível antes de salvar.

        A seção abre sozinha quando o ingrediente em edição já tem fator
        diferente de 1: esconder um valor que mexe no custo seria pior.
      */}
      <AdvancedSection
        description="Ajuste fino para quem aproveita só parte do que compra."
        defaultOpen={advancedStartsOpen}
        activeSummary={correctionFactorIsCustom ? `Fator ${correctionFactor}` : null}
      >
        <Field
          label="Fator de correção"
          error={errorFor("correctionFactor")}
          hint="Use quando você compra uma quantidade, mas só aproveita parte dela na produção — casca, aparas, descarte ou evaporação. Deixe 1 quando aproveita tudo."
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

        <div className="rounded-lg bg-stone-100 px-3 py-2 text-xs leading-5 text-stone-600 dark:bg-stone-900 dark:text-stone-400">
          <p>
            <strong className="font-semibold text-stone-700 dark:text-stone-300">
              Como calcular:
            </strong>{" "}
            divida o que você compra pelo que sobra limpo. Ex.: 1 kg de morango que rende 800 g
            depois de limpar → 1000 ÷ 800 = <strong>1,25</strong>.
          </p>
          {correctionEffect !== null && (
            <p className="mt-1.5 text-rose-700 dark:text-rose-300">
              Com este fator, cada 100 {baseUnit} usados numa receita consomem{" "}
              <strong>
                {correctionEffect} {baseUnit}
              </strong>{" "}
              do que você comprou.
            </p>
          )}
        </div>
      </AdvancedSection>

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

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
        >
          {editingIngredient ? "Salvar alterações" : "Cadastrar ingrediente"}
        </button>
        {editingIngredient && (
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
