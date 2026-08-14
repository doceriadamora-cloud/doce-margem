"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  areUnitsCompatible,
  calculateRecipe,
  isPurchaseUnit,
  validateRecipe,
} from "@/modules/pricing";
import type {
  Ingredient,
  IngredientRecipeItem,
  PurchaseUnit,
  Recipe,
  RecipeItem,
  SubRecipeItem,
  ValidationError,
} from "@/types/pricing";
import {
  getIngredientsServerSnapshot,
  getIngredientsSnapshot,
  subscribeIngredients,
} from "@/components/ingredients/ingredients-store";
import AdvancedSection from "@/components/advanced/AdvancedSection";
import {
  addRecipe,
  getRecipesServerSnapshot,
  getRecipesSnapshot,
  subscribeRecipes,
  updateRecipe,
} from "./recipes-store";

const PURCHASE_UNITS: { value: PurchaseUnit; label: string }[] = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
  { value: "un", label: "un" },
];

function parseRequiredNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
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

/** Percentual já formatado, para o resumo e o efeito da perda de produção. */
function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function buildIngredientsById(ingredients: Ingredient[]): Record<string, Ingredient> {
  const map: Record<string, Ingredient> = {};
  for (const ingredient of ingredients) {
    if (ingredient.id) map[ingredient.id] = ingredient;
  }
  return map;
}

function buildRecipesById(recipes: Recipe[]): Record<string, Recipe> {
  const map: Record<string, Recipe> = {};
  for (const recipe of recipes) map[recipe.id] = recipe;
  return map;
}

/**
 * Unidades que a usuária pode escolher ao usar uma sub-receita — Fase P0-9B.
 *
 * `isUnitCompatibleWithYield` (Fase 1B-2) exige mesma dimensão do rendimento da
 * sub-receita. Oferecer só as compatíveis evita que a usuária escolha uma
 * combinação que o validador vai recusar depois.
 */
function compatibleUnitsForYield(yieldUnit: string): PurchaseUnit[] {
  if (!isPurchaseUnit(yieldUnit)) return [];
  return PURCHASE_UNITS.map((u) => u.value).filter((unit) =>
    areUnitsCompatible(unit, yieldUnit),
  );
}

/**
 * Uma receita só pode virar componente de outra quando o rendimento dela está
 * numa unidade conhecida (g, kg, ml, l, un).
 *
 * Motivo, no domínio: `SubRecipeItem.unit` é `PurchaseUnit`, e
 * `isUnitCompatibleWithYield` compara com o rendimento. Rendimento em texto
 * livre ("porções", "fatias") não casa com nenhuma unidade de compra, então o
 * item seria sempre recusado na validação. Filtrar aqui é honesto; deixar
 * escolher para falhar depois, não.
 */
function canBeUsedAsSubRecipe(recipe: Recipe): boolean {
  return isPurchaseUnit(recipe.yieldUnit);
}

/* ── Exibição dos itens já adicionados ──
 *
 * Cobrem os três `kind` da união, inclusive medida caseira: a interface não
 * cria esse tipo (é a P0-9C), mas um backup importado pode conter, e a lista
 * precisa mostrá-lo sem quebrar para que o item sobreviva à edição.
 */

function itemKey(item: RecipeItem, index: number): string {
  if (item.kind === "subRecipe") return `sub-${item.subRecipeId}-${index}`;
  return `${item.kind}-${item.ingredientId}-${index}`;
}

function itemLabel(item: RecipeItem): string {
  return item.kind === "subRecipe" ? item.subRecipeName : item.ingredientName;
}

function itemQuantityLabel(item: RecipeItem): string {
  if (item.kind === "householdMeasure") return `${item.quantityUsed} (medida caseira)`;
  return `${item.quantityUsed} ${item.unit}`;
}

interface RecipeFormProps {
  /** Receita sendo editada, ou `null` para cadastrar uma nova. */
  editingRecipe?: Recipe | null;
  /** Chamado ao salvar uma edição ou cancelar. */
  onDoneEditing?: () => void;
}

/**
 * Formulário de cadastro/edição de receita, com ingredientes e sub-receitas.
 * Monta o `Recipe` e delega validação/cálculo a `validateRecipe`/`calculateRecipe`
 * (Fase 1B) — não reimplementa nenhuma regra aqui.
 *
 * Edição usa o mesmo truque de `key`-remount do `IngredientForm` (Fase 2-7):
 * o pai renderiza `<RecipeForm key={editingRecipe?.id ?? "new"} .../>`.
 *
 * **Corrigido na Fase P0-9B:** `items` era inicializado filtrando só
 * `kind: "ingredient"`, então salvar uma edição descartava qualquer outro tipo
 * de item. Era inócuo enquanto a interface não criava sub-receitas e virou
 * destrutivo no instante em que passou a criar. Agora a lista carrega e devolve
 * a receita inteira; medidas caseiras (P0-9C) atravessam intactas mesmo sem
 * interface para editá-las.
 *
 * O `id` da receita em edição entra no candidato de propósito: é ele que
 * permite a `validateRecipe` detectar auto-referência e ciclo indireto ao
 * salvar. Com `id: ""`, a receita nunca se reconheceria na própria árvore.
 */
export default function RecipeForm({
  editingRecipe = null,
  onDoneEditing = () => {},
}: RecipeFormProps) {
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
  const ingredientsById = buildIngredientsById(ingredients);
  const recipesById = buildRecipesById(recipes);

  const [name, setName] = useState(editingRecipe?.name ?? "");
  // A receita inteira, sem filtro por `kind` — ver a nota no topo sobre a
  // correção da P0-9B.
  const [items, setItems] = useState<RecipeItem[]>(editingRecipe?.items ?? []);
  const [yieldQuantity, setYieldQuantity] = useState(
    editingRecipe ? String(editingRecipe.yieldQuantity) : "",
  );
  const [yieldUnit, setYieldUnit] = useState(editingRecipe?.yieldUnit ?? "un");
  const [productionLossPercent, setProductionLossPercent] = useState(
    editingRecipe?.productionLossPercent !== undefined
      ? String(editingRecipe.productionLossPercent)
      : "0",
  );
  const [notes, setNotes] = useState(editingRecipe?.notes ?? "");
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Modo avançado (P0-9A). Congelado no primeiro render de propósito: se
  // dependesse do valor atual, apagar a perda para redigitar fecharia a seção
  // no meio da edição. O remount por `key` do componente pai já recalcula isto
  // ao trocar de receita.
  const [advancedStartsOpen] = useState(
    () =>
      (editingRecipe?.productionLossPercent ?? 0) > 0 ||
      (editingRecipe?.notes ?? "").trim() !== "",
  );

  // Sub-formulário de "adicionar componente à receita".
  const [componentKind, setComponentKind] = useState<"ingredient" | "subRecipe">(
    "ingredient",
  );
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [itemQuantityUsed, setItemQuantityUsed] = useState("");
  const [itemUnit, setItemUnit] = useState<PurchaseUnit>("g");
  const [itemError, setItemError] = useState<string | null>(null);

  // Sub-receitas (P0-9B).
  const [selectedSubRecipeId, setSelectedSubRecipeId] = useState("");
  const [subRecipeQuantityUsed, setSubRecipeQuantityUsed] = useState("");
  const [subRecipeUnit, setSubRecipeUnit] = useState<PurchaseUnit>("g");

  /**
   * Receitas oferecíveis como componente: nunca a própria receita em edição
   * (auto-referência) e só as com rendimento em unidade conhecida.
   */
  const availableSubRecipes = recipes.filter(
    (recipe) => recipe.id !== editingRecipe?.id && canBeUsedAsSubRecipe(recipe),
  );
  const hiddenSubRecipeCount =
    recipes.filter((recipe) => recipe.id !== editingRecipe?.id).length -
    availableSubRecipes.length;
  const selectedSubRecipe =
    availableSubRecipes.find((recipe) => recipe.id === selectedSubRecipeId) ?? null;
  const subRecipeUnitOptions = selectedSubRecipe
    ? compatibleUnitsForYield(selectedSubRecipe.yieldUnit)
    : [];

  function errorFor(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }
  const itemErrors = errors.filter((e) => e.field.startsWith("items"));

  function handleSelectIngredient(id: string): void {
    setSelectedIngredientId(id);
    const ingredient = ingredientsById[id];
    if (ingredient) setItemUnit(ingredient.baseUnit);
  }

  function handleAddItem(): void {
    const ingredient = ingredientsById[selectedIngredientId];
    if (!ingredient) {
      setItemError("Escolha um ingrediente cadastrado.");
      return;
    }
    const parsedQuantity = parseRequiredNumber(itemQuantityUsed);
    if (parsedQuantity === null || parsedQuantity <= 0) {
      setItemError("Informe uma quantidade usada válida (maior que zero).");
      return;
    }

    const newItem: IngredientRecipeItem = {
      kind: "ingredient",
      ingredientId: selectedIngredientId,
      ingredientName: ingredient.name,
      quantityUsed: parsedQuantity,
      unit: itemUnit,
    };
    setItems((prev) => [...prev, newItem]);
    setItemQuantityUsed("");
    setItemError(null);
  }

  /**
   * Reaproveita a proteção contra referência circular do domínio (Fase 1B-2)
   * em vez de reimplementar a caminhada no grafo aqui. Monta a receita como ela
   * ficaria com o item novo e pergunta ao validador; os demais erros são
   * ignorados de propósito, porque o formulário ainda pode estar incompleto.
   */
  function createsCircularReference(candidateItems: RecipeItem[]): boolean {
    const prospective: Recipe = {
      id: editingRecipe?.id ?? "",
      name: name.trim() || "Receita",
      items: candidateItems,
      // Valores neutros: só a árvore de dependências importa nesta checagem.
      yieldQuantity: 1,
      yieldUnit: yieldUnit.trim() || "un",
    };
    return validateRecipe(prospective, ingredientsById, recipesById).some(
      (error) => error.code === "CIRCULAR_REFERENCE",
    );
  }

  function handleSelectSubRecipe(id: string): void {
    setSelectedSubRecipeId(id);
    setItemError(null);
    const recipe = availableSubRecipes.find((r) => r.id === id);
    // Começa na própria unidade de rendimento: é a escolha certa na maioria dos
    // casos e sempre compatível.
    if (recipe && isPurchaseUnit(recipe.yieldUnit)) setSubRecipeUnit(recipe.yieldUnit);
  }

  function handleAddSubRecipe(): void {
    const subRecipe = availableSubRecipes.find((r) => r.id === selectedSubRecipeId);
    if (!subRecipe) {
      setItemError("Escolha uma receita cadastrada para usar como componente.");
      return;
    }
    const parsedQuantity = parseRequiredNumber(subRecipeQuantityUsed);
    if (parsedQuantity === null || parsedQuantity <= 0) {
      setItemError("Informe uma quantidade usada válida (maior que zero).");
      return;
    }

    const newItem: SubRecipeItem = {
      kind: "subRecipe",
      subRecipeId: subRecipe.id,
      subRecipeName: subRecipe.name,
      quantityUsed: parsedQuantity,
      unit: subRecipeUnit,
    };

    if (createsCircularReference([...items, newItem])) {
      setItemError(
        `Essa sub-receita criaria um ciclo: "${subRecipe.name}" já depende desta receita. Escolha outra.`,
      );
      return;
    }

    setItems((prev) => [...prev, newItem]);
    setSubRecipeQuantityUsed("");
    setItemError(null);
  }

  function handleRemoveItem(index: number): void {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm(): void {
    setName("");
    setItems([]);
    setYieldQuantity("");
    setYieldUnit("un");
    setProductionLossPercent("0");
    setNotes("");
    setComponentKind("ingredient");
    setSelectedIngredientId("");
    setItemQuantityUsed("");
    setItemUnit("g");
    setSelectedSubRecipeId("");
    setSubRecipeQuantityUsed("");
    setSubRecipeUnit("g");
    setItemError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const parsedYield = parseRequiredNumber(yieldQuantity);
    const parsedLoss = parseOptionalNumber(productionLossPercent);

    if (parsedYield === null || parsedLoss === null) {
      setErrors([
        {
          field: "form",
          code: "INVALID_NUMBER",
          message: "Preencha o rendimento e a perda com valores numéricos válidos.",
        },
      ]);
      return;
    }

    const trimmedNotes = notes.trim();
    const candidate: Recipe = {
      // P0-9B: o id real da receita em edição. É ele que faz `validateRecipe`
      // reconhecer a própria receita dentro da árvore e recusar auto-referência
      // ou ciclo indireto. `updateRecipe` preserva o id original de qualquer
      // forma, então isto não muda a persistência.
      id: editingRecipe?.id ?? "",
      name: name.trim(),
      items,
      yieldQuantity: parsedYield,
      yieldUnit: yieldUnit.trim(),
      ...(parsedLoss !== undefined ? { productionLossPercent: parsedLoss } : {}),
      // Campo opcional desde a Fase 1B-1, sem interface até a P0-9A. Só entra
      // quando tem conteúdo, para não gravar `notes: ""` em receita que nunca
      // usou observação — mantém os dados antigos e os novos com o mesmo
      // formato.
      ...(trimmedNotes !== "" ? { notes: trimmedNotes } : {}),
    };

    // P0-9B: passa as receitas cadastradas. Com `{}`, qualquer sub-receita
    // seria recusada como "não encontrada".
    const validationErrors = validateRecipe(candidate, ingredientsById, recipesById);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (editingRecipe?.id) {
      updateRecipe(editingRecipe.id, candidate);
      onDoneEditing();
    } else if (editingRecipe) {
      onDoneEditing();
    } else {
      addRecipe(candidate);
      setErrors([]);
      resetForm();
    }
  }

  // Prévia do custo, só quando dá pra calcular algo coerente (ao menos 1 item
  // e rendimento válido) — mesma função de domínio usada na listagem.
  const previewYield = parseRequiredNumber(yieldQuantity);
  const previewLoss = parseOptionalNumber(productionLossPercent);
  const preview =
    items.length > 0 && previewYield !== null && previewYield > 0 && previewLoss !== null
      ? calculateRecipe(
          {
            id: editingRecipe?.id ?? "preview",
            name: name || "Receita",
            items,
            yieldQuantity: previewYield,
            yieldUnit: yieldUnit.trim() || "un",
            ...(previewLoss !== undefined ? { productionLossPercent: previewLoss } : {}),
          },
          ingredientsById,
          recipesById,
        )
      : null;

  // Efeito da perda no custo, lido do próprio `calculateRecipe` — a UI não
  // repete a divisão por (1 − perda). Só aparece quando já dá para calcular.
  const lossEffect =
    preview?.ok && preview.value.productionLossPercent > 0
      ? {
          percent: preview.value.productionLossPercent,
          grossCost: preview.value.grossCost,
          totalCostWithLoss: preview.value.totalCostWithLoss,
        }
      : null;

  const summaryParts: string[] = [];
  if (previewLoss !== null && previewLoss !== undefined && previewLoss > 0) {
    summaryParts.push(`Perda ${formatPercent(previewLoss)}`);
  }
  if (notes.trim() !== "") summaryParts.push("Observações");
  const advancedSummary = summaryParts.length > 0 ? summaryParts.join(" · ") : null;

  const formError = errorFor("form");
  const noIngredientsRegistered = ingredients.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
        {editingRecipe ? "Editar receita" : "Cadastrar receita"}
      </h2>

      {formError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {formError}
        </p>
      )}

      {noIngredientsRegistered && (
        <div className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p>Você precisa de pelo menos um ingrediente antes de montar uma receita.</p>
          <Link
            href="/ingredientes"
            className="mt-2 inline-flex font-semibold text-amber-900 underline underline-offset-2 dark:text-amber-100"
          >
            Ir para Ingredientes
          </Link>
        </div>
      )}

      <Field label="Nome da receita" error={errorFor("name")}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Brownie simples"
          className={inputClass}
        />
      </Field>

      <div className="rounded-xl border border-dashed border-stone-300 p-3 dark:border-stone-700">
        <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
          Adicionar componente
        </p>

        {/* Sub-receitas (P0-9B). Dois caminhos no mesmo lugar: o padrão continua
            sendo ingrediente, e quem precisa de recheio/massa/base troca aqui. */}
        <div
          role="group"
          aria-label="Tipo de componente"
          className="mb-3 flex gap-1 rounded-full bg-stone-100 p-1 dark:bg-stone-950"
        >
          <ComponentKindButton
            active={componentKind === "ingredient"}
            onClick={() => {
              setComponentKind("ingredient");
              setItemError(null);
            }}
          >
            Ingrediente
          </ComponentKindButton>
          <ComponentKindButton
            active={componentKind === "subRecipe"}
            disabled={availableSubRecipes.length === 0}
            onClick={() => {
              setComponentKind("subRecipe");
              setItemError(null);
            }}
          >
            Sub-receita
          </ComponentKindButton>
        </div>

        {componentKind === "ingredient" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedIngredientId}
                onChange={(e) => handleSelectIngredient(e.target.value)}
                className={`col-span-2 ${inputClass}`}
                disabled={noIngredientsRegistered}
                aria-label="Ingrediente"
              >
                <option value="">Escolha um ingrediente</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={itemQuantityUsed}
                onChange={(e) => setItemQuantityUsed(e.target.value)}
                placeholder="Quantidade usada"
                className={inputClass}
                disabled={noIngredientsRegistered}
                aria-label="Quantidade usada do ingrediente"
              />
              <select
                value={itemUnit}
                onChange={(e) => setItemUnit(e.target.value as PurchaseUnit)}
                className={inputClass}
                disabled={noIngredientsRegistered}
                aria-label="Unidade do ingrediente"
              >
                {PURCHASE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            {itemError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{itemError}</p>
            )}
            <button
              type="button"
              onClick={handleAddItem}
              disabled={noIngredientsRegistered}
              className={addButtonClass}
            >
              + Adicionar à receita
            </button>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
              Use outra receita como componente — um recheio, uma massa base, uma calda. O custo
              dela entra proporcionalmente à quantidade usada.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedSubRecipeId}
                onChange={(e) => handleSelectSubRecipe(e.target.value)}
                className={`col-span-2 ${inputClass}`}
                aria-label="Sub-receita"
              >
                <option value="">Escolha uma receita já cadastrada</option>
                {availableSubRecipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} (rende {recipe.yieldQuantity} {recipe.yieldUnit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={subRecipeQuantityUsed}
                onChange={(e) => setSubRecipeQuantityUsed(e.target.value)}
                placeholder="Quantidade usada"
                className={inputClass}
                disabled={selectedSubRecipe === null}
                aria-label="Quantidade usada da sub-receita"
              />
              <select
                value={subRecipeUnit}
                onChange={(e) => setSubRecipeUnit(e.target.value as PurchaseUnit)}
                className={inputClass}
                disabled={selectedSubRecipe === null}
                aria-label="Unidade da sub-receita"
              >
                {subRecipeUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            {itemError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{itemError}</p>
            )}
            <button
              type="button"
              onClick={handleAddSubRecipe}
              disabled={selectedSubRecipe === null}
              className={addButtonClass}
            >
              + Adicionar à receita
            </button>
          </>
        )}

        {componentKind === "subRecipe" && hiddenSubRecipeCount > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {hiddenSubRecipeCount === 1
              ? "1 receita não aparece aqui porque o rendimento dela está numa unidade livre."
              : `${hiddenSubRecipeCount} receitas não aparecem aqui porque o rendimento delas está numa unidade livre.`}{" "}
            Para usar uma receita como componente, o rendimento precisa estar em g, kg, ml, l ou
            un — assim dá para calcular quanto dela entra.
          </p>
        )}

        {availableSubRecipes.length === 0 && componentKind === "ingredient" && recipes.length > 0 && (
          <p className="mt-3 text-xs leading-5 text-stone-400 dark:text-stone-500">
            Para usar outra receita como componente, ela precisa estar cadastrada com rendimento em
            g, kg, ml, l ou un.
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Itens da receita ({items.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {items.map((item, index) => (
              <li
                key={itemKey(item, index)}
                className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-1.5 text-sm dark:bg-stone-950"
              >
                <span className="min-w-0 text-stone-700 dark:text-stone-300">
                  {item.kind === "subRecipe" && (
                    <span className="mr-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      sub-receita
                    </span>
                  )}
                  {itemLabel(item)} — {itemQuantityLabel(item)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-xs font-medium text-stone-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {itemErrors.length > 0 && (
        <ul className="flex flex-col gap-1">
          {itemErrors.map((e, i) => (
            <li key={i} className="text-xs text-red-600 dark:text-red-400">
              {e.message}
            </li>
          ))}
        </ul>
      )}
      {errorFor("items") && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorFor("items")}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Rendimento" error={errorFor("yieldQuantity")}>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={yieldQuantity}
            onChange={(e) => setYieldQuantity(e.target.value)}
            placeholder="Ex.: 10"
            className={inputClass}
          />
        </Field>
        <Field label="Unidade do rendimento">
          <input
            type="text"
            value={yieldUnit}
            onChange={(e) => setYieldUnit(e.target.value)}
            placeholder="un, porções, fatias..."
            className={inputClass}
          />
        </Field>
      </div>

      {/*
        Modo avançado (P0-9A). A perda de produção era um campo fixo com a dica
        "deixe 0 se não sabe o que é isso" — pedir para ignorar um campo é pior
        do que recolhê-lo. Aqui ela ganha explicação de verdade, o efeito no
        custo aparece antes de salvar, e as observações técnicas passam a ter
        onde ser escritas.
      */}
      <AdvancedSection
        description="Perda de produção e observações técnicas da ficha."
        defaultOpen={advancedStartsOpen}
        activeSummary={advancedSummary}
      >
        <Field
          label="Perda de produção (%)"
          error={errorFor("productionLossPercent")}
          hint="Use quando parte da produção se perde no forno, no corte, no manuseio ou no acabamento. Deixe 0 se aproveita tudo."
        >
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            max="99"
            value={productionLossPercent}
            onChange={(e) => setProductionLossPercent(e.target.value)}
            className={inputClass}
          />
        </Field>

        {lossEffect && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs leading-5 text-stone-600 dark:bg-stone-900 dark:text-stone-400">
            Com {formatPercent(lossEffect.percent)} de perda, o custo total sai de{" "}
            {formatCurrency(lossEffect.grossCost)} para{" "}
            <strong className="font-semibold text-rose-700 dark:text-rose-300">
              {formatCurrency(lossEffect.totalCostWithLoss)}
            </strong>
            . É esse valor maior que entra na precificação.
          </p>
        )}

        <Field
          label="Observações técnicas (uso interno)"
          hint="Temperatura, tempo de forno, ponto, ordem de preparo — o que você quer ter à mão na produção. Aparece só na Ficha técnica da receita; nunca vai para o orçamento do cliente."
        >
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex.: forno a 180 °C por 25 min. Desenformar só depois de frio."
            className={`${inputClass} min-h-20 resize-y`}
          />
        </Field>
      </AdvancedSection>

      {preview && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {preview.ok ? (
            <>
              Custo total: <span className="font-semibold">{formatCurrency(preview.value.totalCostWithLoss)}</span>
              {" · "}
              Custo unitário:{" "}
              <span className="font-semibold">
                {formatCurrency(preview.value.unitCost)}/{yieldUnit.trim() || "un"}
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
          // P0-9B: uma receita pode ser feita só de sub-receitas (um kit montado
          // a partir de bases já cadastradas), então travar em "não há
          // ingredientes" passou a ser cedo demais.
          disabled={noIngredientsRegistered && availableSubRecipes.length === 0}
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {editingRecipe ? "Salvar alterações" : "Cadastrar receita"}
        </button>
        {editingRecipe && (
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
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";

const addButtonClass =
  "mt-2 rounded-full border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950";

interface ComponentKindButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/** Botão do seletor Ingrediente × Sub-receita. */
function ComponentKindButton({
  active,
  disabled = false,
  onClick,
  children,
}: ComponentKindButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-white text-rose-700 shadow-sm dark:bg-stone-800 dark:text-rose-300"
          : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

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
