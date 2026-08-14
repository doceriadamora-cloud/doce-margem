"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  calculateFixedCostSummary,
  calculateLaborCostPerUnit,
  calculatePackagingUnitCost,
  calculatePricing,
  calculateRecipe,
  calculateTotalPackagingCost,
  defaultSalesChannels,
} from "@/modules/pricing";
import type {
  CalculatedRecipe,
  CalculationResult,
  Ingredient,
  PackagingUsage,
  Recipe,
  SalesChannel,
} from "@/types/pricing";
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
  getCustomChannelsServerSnapshot,
  getCustomChannelsSnapshot,
  subscribeCustomChannels,
} from "@/components/channels/channels-store";
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
} from "@/components/settings/business-settings-store";
import {
  getPackagingsServerSnapshot,
  getPackagingsSnapshot,
  subscribePackagings,
} from "@/components/packagings/packagings-store";
import { formatCurrency } from "./pricing-formatters";
import PricingResult from "./PricingResult";

/** Aceita vírgula OU ponto decimal (o exemplo da tarefa usa vírgula: "23,1"). */
function parseRequiredNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | undefined | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Percentual (ex.: "23,1") → decimal (ex.: 0.231), como o pricing engine espera. */
function toDecimalOrNull(percentText: string): number | null {
  const parsed = parseRequiredNumber(percentText);
  return parsed === null ? null : parsed / 100;
}

/** Decimal (ex.: 0.231) → texto de percentual com vírgula (ex.: "23,1"), arredondado para 2 casas. */
function formatDecimalRateAsPercentInput(rate: number): string {
  const rounded = Math.round(rate * 100 * 100) / 100;
  return rounded.toString().replace(".", ",");
}

function formatNumberAsInput(value: number | null): string {
  return value === null ? "" : value.toString().replace(".", ",");
}

function buildIngredientsById(list: Ingredient[]): Record<string, Ingredient> {
  const map: Record<string, Ingredient> = {};
  for (const ingredient of list) {
    if (ingredient.id) map[ingredient.id] = ingredient;
  }
  return map;
}

function buildRecipesById(list: Recipe[]): Record<string, Recipe> {
  const map: Record<string, Recipe> = {};
  for (const recipe of list) map[recipe.id] = recipe;
  return map;
}

function hasOwnPackagingQuantity(
  quantities: Record<string, string>,
  packagingId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(quantities, packagingId);
}

/**
 * Monta o input do pricing engine e chama `calculatePricing` só quando todos
 * os campos necessários já são válidos — nunca reimplementa o cálculo aqui.
 */
function computePricingResult(params: {
  recipeCalc: CalculationResult<CalculatedRecipe> | null;
  fixedCostRateDecimal: number | null;
  desiredProfitRateDecimal: number | null;
  practicedPrice: number | undefined | null;
  channel: SalesChannel | undefined;
  packagingCost: number | null;
  laborCost: number | null;
}) {
  const {
    recipeCalc,
    fixedCostRateDecimal,
    desiredProfitRateDecimal,
    practicedPrice,
    channel,
    packagingCost,
    laborCost,
  } = params;
  if (!recipeCalc || !recipeCalc.ok) return null;
  if (fixedCostRateDecimal === null || desiredProfitRateDecimal === null) return null;
  if (practicedPrice === null) return null; // texto inválido digitado no preço praticado
  if (packagingCost === null) return null;
  if (laborCost === null) return null;

  return calculatePricing({
    recipe: recipeCalc.value,
    packagingCost,
    laborCost,
    fixedCostRate: fixedCostRateDecimal,
    desiredProfitRate: desiredProfitRateDecimal,
    channel,
    ...(practicedPrice !== undefined ? { practicedPrice } : {}),
  });
}

/**
 * Tela de precificação simples — Fase 2-5, integrada às Configurações na 2-6.
 * Conecta receitas + ingredientes cadastrados, custo fixo percentual (vem
 * pré-preenchido das Configurações quando houver faturamento salvo; sempre
 * editável aqui), lucro desejado (informado aqui, não persistido) e canal de
 * venda (biblioteca padrão da Fase 1C-1 + canais customizados da Fase 2-6) ao
 * pricing engine da Fase 1C-3.
 *
 * Funciona como calculadora ao vivo: não há botão "calcular" — o resultado
 * aparece assim que os campos necessários fazem sentido.
 */
export default function PricingForm() {
  const recipes = useSyncExternalStore(
    subscribeRecipes,
    getRecipesSnapshot,
    getRecipesServerSnapshot,
  );
  const ingredients = useSyncExternalStore(
    subscribeIngredients,
    getIngredientsSnapshot,
    getIngredientsServerSnapshot,
  );
  const customChannels = useSyncExternalStore(
    subscribeCustomChannels,
    getCustomChannelsSnapshot,
    getCustomChannelsServerSnapshot,
  );
  const fixedCostsForSettings = useSyncExternalStore(
    subscribeFixedCosts,
    getFixedCostsSnapshot,
    getFixedCostsServerSnapshot,
  );
  const businessSettings = useSyncExternalStore(
    subscribeBusinessSettings,
    getBusinessSettingsSnapshot,
    getBusinessSettingsServerSnapshot,
  );
  const packagings = useSyncExternalStore(
    subscribePackagings,
    getPackagingsSnapshot,
    getPackagingsServerSnapshot,
  );

  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  // `null` = a usuária ainda não editou este campo nesta visita → usa o
  // percentual calculado nas Configurações (Fase 2-6), se houver.
  const [fixedCostRateDraft, setFixedCostRateDraft] = useState<string | null>(null);
  const [desiredProfitRatePercent, setDesiredProfitRatePercent] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [practicedPriceInput, setPracticedPriceInput] = useState("");
  const [packagingQuantities, setPackagingQuantities] = useState<Record<string, string>>({});
  const [laborHourlyRateDraft, setLaborHourlyRateDraft] = useState<string | null>(null);
  const [laborHoursInput, setLaborHoursInput] = useState("");
  const [laborMinutesInput, setLaborMinutesInput] = useState("");

  const settingsBasedSummary =
    businessSettings.estimatedMonthlyRevenue !== null && businessSettings.estimatedMonthlyRevenue > 0
      ? calculateFixedCostSummary({
          fixedCosts: fixedCostsForSettings,
          estimatedMonthlyRevenue: businessSettings.estimatedMonthlyRevenue,
          ...(businessSettings.estimatedMonthlyUnits
            ? { estimatedMonthlyUnits: businessSettings.estimatedMonthlyUnits }
            : {}),
        })
      : null;
  const settingsBasedPercentText = settingsBasedSummary?.ok
    ? formatDecimalRateAsPercentInput(settingsBasedSummary.value.fixedCostRate)
    : "";
  const fixedCostRatePercent = fixedCostRateDraft ?? settingsBasedPercentText;
  const isFixedCostRateFromSettings = fixedCostRateDraft === null && settingsBasedPercentText !== "";
  const laborHourlyRateInput =
    laborHourlyRateDraft ?? formatNumberAsInput(businessSettings.laborHourlyRate);
  const isLaborHourlyRateFromSettings =
    laborHourlyRateDraft === null && businessSettings.laborHourlyRate !== null;

  function persistLaborHourlyRate(): void {
    const parsed = parseOptionalNumber(laborHourlyRateInput);
    if (parsed === null || (parsed !== undefined && parsed < 0)) return;
    updateBusinessSettings({ laborHourlyRate: parsed ?? null });
    setLaborHourlyRateDraft(null);
  }

  if (recipes.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="font-medium text-stone-900 dark:text-stone-50">
          Você ainda não cadastrou nenhuma receita.
        </p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Cadastre uma receita antes de calcular o preço.
        </p>
        <Link
          href="/receitas"
          className="mt-3 inline-block rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
        >
          Ir para Receitas
        </Link>
      </div>
    );
  }

  const ingredientsById = buildIngredientsById(ingredients);
  const recipesById = buildRecipesById(recipes);
  const allChannels: SalesChannel[] = [...defaultSalesChannels, ...customChannels];

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) ?? null;
  const recipeCalc = selectedRecipe
    ? calculateRecipe(selectedRecipe, ingredientsById, recipesById)
    : null;
  const selectedChannel = allChannels.find((c) => c.id === selectedChannelId);

  const fixedCostRateDecimal = toDecimalOrNull(fixedCostRatePercent);
  const desiredProfitRateDecimal = toDecimalOrNull(desiredProfitRatePercent);
  const practicedPrice = parseOptionalNumber(practicedPriceInput);
  const parsedLaborHourlyRate = parseOptionalNumber(laborHourlyRateInput);
  const parsedLaborHours = parseOptionalNumber(laborHoursInput);
  const parsedLaborMinutes = parseOptionalNumber(laborMinutesInput);

  const selectedPackagings = packagings.filter(
    (packaging) =>
      packaging.id !== undefined && hasOwnPackagingQuantity(packagingQuantities, packaging.id),
  );
  const invalidPackagingIds = new Set<string>();
  const packagingUsages: PackagingUsage[] = [];
  for (const packaging of selectedPackagings) {
    if (!packaging.id) continue;
    const quantityUsed = parseRequiredNumber(packagingQuantities[packaging.id] ?? "");
    if (quantityUsed === null || quantityUsed <= 0) {
      invalidPackagingIds.add(packaging.id);
      continue;
    }
    packagingUsages.push({ packaging, quantityUsed });
  }
  const packagingCostResult =
    invalidPackagingIds.size === 0 ? calculateTotalPackagingCost(packagingUsages) : null;
  const packagingCost = packagingCostResult?.ok ? packagingCostResult.value.totalCost : null;

  const laborInputsAreNumbers =
    parsedLaborHourlyRate !== null &&
    parsedLaborHours !== null &&
    parsedLaborMinutes !== null;
  const laborCostResult =
    recipeCalc?.ok && laborInputsAreNumbers
      ? calculateLaborCostPerUnit({
          laborHourlyRate: parsedLaborHourlyRate ?? 0,
          hours: parsedLaborHours ?? 0,
          minutes: parsedLaborMinutes ?? 0,
          yieldQuantity: recipeCalc.value.recipe.yieldQuantity,
        })
      : null;
  const laborCost = laborCostResult?.ok ? laborCostResult.value.laborCostPerUnit : null;

  // Campo "inválido" = a usuária digitou algo que não é vazio, mas não dá pra
  // interpretar como número. Campo vazio não é erro — só significa "ainda não
  // preenchido" (a calculadora simplesmente não mostra resultado ainda).
  const fixedCostRateInvalid = fixedCostRatePercent.trim() !== "" && fixedCostRateDecimal === null;
  const profitInvalid = desiredProfitRatePercent.trim() !== "" && desiredProfitRateDecimal === null;
  const practicedPriceInvalid = practicedPriceInput.trim() !== "" && practicedPrice === null;
  const laborHourlyRateError =
    parsedLaborHourlyRate === null
      ? "Confira o valor da hora. Use apenas números maiores ou iguais a zero."
      : laborCostResult && !laborCostResult.ok
        ? laborCostResult.errors.find((error) => error.field === "laborHourlyRate")?.message
        : undefined;
  const laborHoursError =
    parsedLaborHours === null
      ? "Confira as horas. Use apenas números maiores ou iguais a zero."
      : laborCostResult && !laborCostResult.ok
        ? laborCostResult.errors.find((error) => error.field === "hours")?.message
        : undefined;
  const laborMinutesError =
    parsedLaborMinutes === null
      ? "Confira os minutos. Use um número entre 0 e 59."
      : laborCostResult && !laborCostResult.ok
        ? laborCostResult.errors.find((error) => error.field === "minutes")?.message
        : undefined;

  const pricingResult = computePricingResult({
    recipeCalc,
    fixedCostRateDecimal,
    desiredProfitRateDecimal,
    practicedPrice,
    channel: selectedChannel,
    packagingCost,
    laborCost,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="pricing-print-hidden flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <Field label="Escolha a receita">
          <select
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione uma receita</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}
              </option>
            ))}
          </select>
        </Field>

        {!selectedRecipe && (
          <p className="rounded-lg bg-rose-50 px-3 py-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
            Comece escolhendo uma receita. Depois, inclua embalagens e mão de obra quando se
            aplicarem e informe custo fixo e lucro desejado para ver o preço sugerido.
          </p>
        )}

        {selectedRecipe &&
          (recipeCalc?.ok ? (
            <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-950 dark:text-stone-400">
              Custo total: <strong>{formatCurrency(recipeCalc.value.totalCostWithLoss)}</strong>
              {" · "}
              Rendimento: <strong>{recipeCalc.value.recipe.yieldQuantity} {recipeCalc.value.recipe.yieldUnit}</strong>
              {" · "}
              Custo unitário:{" "}
              <strong>
                {formatCurrency(recipeCalc.value.unitCost)}/{recipeCalc.value.recipe.yieldUnit}
              </strong>
            </p>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Não foi possível calcular esta receita: {recipeCalc?.errors[0]?.message}
            </p>
          ))}
      </div>

      {selectedRecipe && recipeCalc?.ok && (
        <div className="pricing-print-hidden flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <h2 className="font-medium text-stone-800 dark:text-stone-200">
              Embalagens usadas
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Selecione o que vai junto em cada produto ou venda e informe a quantidade usada.
            </p>
          </div>

          {packagings.length === 0 ? (
            <p className="rounded-lg bg-stone-50 px-3 py-3 text-sm text-stone-600 dark:bg-stone-950 dark:text-stone-400">
              Você ainda não cadastrou embalagens. O cálculo continua sem esse custo.{" "}
              <Link href="/embalagens" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
                Cadastrar embalagens
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {packagings.map((packaging) => {
                if (!packaging.id) return null;
                const packagingId = packaging.id;
                const checked = hasOwnPackagingQuantity(packagingQuantities, packagingId);
                const quantityInvalid = invalidPackagingIds.has(packagingId);
                const unitCost = calculatePackagingUnitCost(packaging);

                return (
                  <div
                    key={packagingId}
                    className="rounded-xl border border-stone-200 p-3 dark:border-stone-700"
                  >
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!unitCost.ok}
                        onChange={(event) => {
                          setPackagingQuantities((current) => {
                            const next = { ...current };
                            if (event.target.checked) next[packagingId] = "1";
                            else delete next[packagingId];
                            return next;
                          });
                        }}
                        className="mt-0.5 h-4 w-4 accent-rose-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-stone-800 dark:text-stone-200">
                          {packaging.name}
                        </span>
                        <span className="block text-xs text-stone-500 dark:text-stone-400">
                          {unitCost.ok
                            ? `${formatCurrency(unitCost.value)}/un`
                            : unitCost.errors[0]?.message}
                        </span>
                      </span>
                    </label>

                    {checked && (
                      <div className="mt-3 pl-7">
                        <Field
                          label="Quantidade usada por venda/produto"
                          error={
                            quantityInvalid
                              ? "Informe uma quantidade maior que zero."
                              : undefined
                          }
                        >
                          <input
                            type="text"
                            inputMode="decimal"
                            value={packagingQuantities[packagingId] ?? ""}
                            onChange={(event) =>
                              setPackagingQuantities((current) => ({
                                ...current,
                                [packagingId]: event.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {packagingCostResult?.ok && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
              Custo de embalagens: <strong>{formatCurrency(packagingCostResult.value.totalCost)}</strong>
            </p>
          )}
          {packagingCostResult && !packagingCostResult.ok && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Não foi possível calcular as embalagens: {packagingCostResult.errors[0]?.message}
            </p>
          )}
          {packagings.length > 0 && (
            <Link href="/embalagens" className="w-fit text-sm font-medium text-rose-600 hover:underline dark:text-rose-400">
              Gerenciar embalagens
            </Link>
          )}
        </div>
      )}

      {selectedRecipe && recipeCalc?.ok && (
        <div className="pricing-print-hidden flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <h2 className="font-medium text-stone-800 dark:text-stone-200">
              Mão de obra
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Valorize seu tempo: informe quanto vale sua hora e quanto tempo esta produção leva.
            </p>
          </div>

          <Field
            label="Valor da hora de trabalho (R$)"
            hint={
              isLaborHourlyRateFromSettings
                ? "Valor salvo neste navegador — você pode ajustar quando quiser."
                : "Este valor fica salvo neste navegador ao sair do campo."
            }
            error={laborHourlyRateError}
          >
            <input
              type="text"
              inputMode="decimal"
              value={laborHourlyRateInput}
              onChange={(event) => setLaborHourlyRateDraft(event.target.value)}
              onBlur={persistLaborHourlyRate}
              placeholder="Ex.: 30,00"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tempo de produção (horas)" error={laborHoursError}>
              <input
                type="text"
                inputMode="decimal"
                value={laborHoursInput}
                onChange={(event) => setLaborHoursInput(event.target.value)}
                placeholder="Ex.: 2"
                className={inputClass}
              />
            </Field>
            <Field label="Minutos adicionais" error={laborMinutesError}>
              <input
                type="text"
                inputMode="numeric"
                value={laborMinutesInput}
                onChange={(event) => setLaborMinutesInput(event.target.value)}
                placeholder="Ex.: 30"
                className={inputClass}
              />
            </Field>
          </div>

          {laborCostResult?.ok && (
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm dark:bg-rose-950">
              <div>
                <dt className="text-xs text-rose-700 dark:text-rose-300">
                  Custo total de mão de obra
                </dt>
                <dd className="font-semibold text-rose-800 dark:text-rose-200">
                  {formatCurrency(laborCostResult.value.totalLaborCost)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-rose-700 dark:text-rose-300">
                  Custo por {recipeCalc.value.recipe.yieldUnit}
                </dt>
                <dd className="font-semibold text-rose-800 dark:text-rose-200">
                  {formatCurrency(laborCostResult.value.laborCostPerUnit)}
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}

      {selectedRecipe && recipeCalc?.ok && (
        <div className="pricing-print-hidden flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <Field
            label="Custo fixo sobre faturamento (%)"
            hint={
              isFixedCostRateFromSettings
                ? "Preenchido automaticamente com base nas suas Configurações — pode ajustar aqui à vontade."
                : "Se você ainda não sabe, use 20% como ponto de partida e ajuste depois."
            }
            error={
              fixedCostRateInvalid
                ? "Confira o custo fixo. Use apenas números (ex.: 23,1) ou deixe o campo vazio."
                : undefined
            }
          >
            <input
              type="text"
              inputMode="decimal"
              value={fixedCostRatePercent}
              onChange={(e) => setFixedCostRateDraft(e.target.value)}
              placeholder="Ex.: 23,1"
              className={inputClass}
            />
          </Field>

          <Field
            label="Lucro desejado (%)"
            error={profitInvalid ? "Confira o lucro desejado. Use apenas números (ex.: 20)." : undefined}
          >
            <input
              type="text"
              inputMode="decimal"
              value={desiredProfitRatePercent}
              onChange={(e) => setDesiredProfitRatePercent(e.target.value)}
              placeholder="Ex.: 20"
              className={inputClass}
            />
          </Field>

          <Field label="Canal de venda">
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className={inputClass}
            >
              <option value="">Nenhum (venda direta)</option>
              {allChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Preço que você cobra hoje (opcional)"
            error={
              practicedPriceInvalid
                ? "Confira o preço praticado. Use apenas números maiores que zero ou deixe o campo vazio."
                : undefined
            }
          >
            <input
              type="text"
              inputMode="decimal"
              value={practicedPriceInput}
              onChange={(e) => setPracticedPriceInput(e.target.value)}
              placeholder="Ex.: 5,00"
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {pricingResult &&
        (pricingResult.ok ? (
          <PricingResult
            result={pricingResult.value}
            recipeName={recipeCalc?.ok ? recipeCalc.value.recipe.name : "Receita"}
            yieldQuantity={recipeCalc?.ok ? recipeCalc.value.recipe.yieldQuantity : 0}
            yieldUnit={recipeCalc?.ok ? recipeCalc.value.recipe.yieldUnit : "un"}
            // Modo avançado (P0-9A): a perda já está embutida no custo da
            // receita. Passar o percentual é só exibição — o resultado do
            // pricing engine não muda por causa desta prop.
            productionLossPercent={recipeCalc?.ok ? recipeCalc.value.productionLossPercent : 0}
          />
        ) : (
          <div className="flex flex-col gap-1 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            {pricingResult.errors.map((error, index) => (
              <p key={index} className="text-sm text-amber-800 dark:text-amber-200">
                {error.message}
              </p>
            ))}
          </div>
        ))}

      {pricingResult === null && selectedRecipe && recipeCalc?.ok && (
        <p className="pricing-print-hidden rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          Para concluir, preencha o custo fixo sobre o faturamento e o lucro desejado. O resultado
          e a Ficha interna de precificação aparecerão automaticamente.
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, hint, error, children }: FieldProps) {
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
