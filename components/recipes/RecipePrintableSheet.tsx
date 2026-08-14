"use client";

import { getHouseholdConversion } from "@/modules/pricing";
import { formatCurrency } from "@/components/pricing/pricing-formatters";
import type {
  CalculatedRecipe,
  CalculatedRecipeItem,
  HouseholdMeasure,
} from "@/types/pricing";

const HOUSEHOLD_MEASURE_LABELS: Record<
  HouseholdMeasure,
  { singular: string; plural: string }
> = {
  xicara: { singular: "xícara", plural: "xícaras" },
  colher_sopa: { singular: "colher de sopa", plural: "colheres de sopa" },
  colher_cha: { singular: "colher de chá", plural: "colheres de chá" },
  colher_cafe: { singular: "colher de café", plural: "colheres de café" },
};

interface RecipePrintableSheetProps {
  calculation: CalculatedRecipe;
  generatedAt: string;
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data não informada"
    : date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
}

function getItemName(calculatedItem: CalculatedRecipeItem): string {
  if (calculatedItem.kind === "subRecipe") {
    return calculatedItem.item.subRecipeName;
  }
  return calculatedItem.item.ingredientName;
}

function getItemType(calculatedItem: CalculatedRecipeItem): string {
  if (calculatedItem.kind === "subRecipe") return "Sub-receita";
  if (calculatedItem.kind === "householdMeasure") return "Medida caseira";
  return "Ingrediente";
}

/**
 * Fator de correção aplicado ao item, ou `null` quando não se aplica.
 *
 * Sub-receita não tem fator próprio: o dela já entrou no custo dos itens da
 * própria sub-receita, um nível abaixo.
 */
function getCorrectionFactor(calculatedItem: CalculatedRecipeItem): number | null {
  if (calculatedItem.kind === "subRecipe") return null;
  return calculatedItem.correctionFactor;
}

function getItemQuantity(calculatedItem: CalculatedRecipeItem): string {
  if (calculatedItem.kind === "householdMeasure") {
    const item = calculatedItem.item;
    const labels = HOUSEHOLD_MEASURE_LABELS[item.measure];
    return `${formatNumber(item.quantityUsed)} ${
      item.quantityUsed === 1 ? labels.singular : labels.plural
    }`;
  }
  const item = calculatedItem.item;
  return `${formatNumber(item.quantityUsed)} ${item.unit}`;
}

/**
 * Quanto a medida caseira virou em peso/volume — Fase P0-9C.
 *
 * A ficha é documento de produção: "1 xícara" sozinho não ajuda quem está com a
 * balança na mão. A unidade-base vem da mesma tabela que fez a conversão, não de
 * uma suposição daqui.
 */
function getHouseholdConversionLabel(calculatedItem: CalculatedRecipeItem): string | null {
  if (calculatedItem.kind !== "householdMeasure") return null;
  const conversion = getHouseholdConversion(
    calculatedItem.item.conversionKey,
    calculatedItem.item.measure,
  );
  if (conversion === null) return null;
  return `${formatNumber(calculatedItem.quantityInBaseUnit)} ${conversion.baseUnit}`;
}

/**
 * Documento interno da receita. Todos os custos vêm de `calculateRecipe`; este
 * componente apenas formata o resultado e abre a impressão nativa do navegador.
 */
export default function RecipePrintableSheet({
  calculation,
  generatedAt,
}: RecipePrintableSheetProps) {
  const { recipe } = calculation;
  const hasCorrectedItem = calculation.items.some((item) => {
    const factor = getCorrectionFactor(item);
    return factor !== null && factor !== 1;
  });
  const hasSubRecipe = calculation.items.some((item) => item.kind === "subRecipe");

  return (
    <section
      className="recipe-print-preview"
      aria-labelledby="recipe-printable-title"
    >
      <div className="recipe-print-hidden mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="recipe-printable-title"
            className="text-lg font-semibold text-stone-900 dark:text-stone-50"
          >
            Ficha técnica da receita
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Documento interno para consulta na produção, com rendimento e custos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="w-fit rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
        >
          Imprimir / salvar PDF
        </button>
      </div>

      <article
        className="recipe-print-sheet rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm sm:p-7 dark:border-stone-700 dark:bg-white dark:text-stone-950"
        aria-label={`Ficha técnica da receita ${recipe.name}`}
      >
        <header className="flex flex-col gap-4 border-b-2 border-rose-700 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-tight text-rose-700">
              Minha Fatia
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-stone-500">
              Ficha técnica interna
            </p>
          </div>
          <div className="sm:text-right">
            <h3 className="text-2xl font-semibold text-stone-950">{recipe.name}</h3>
            <p className="mt-1 text-sm text-stone-600">
              Gerada em {formatGeneratedAt(generatedAt)}
            </p>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Resumo da receita">
          <SheetValue
            label="Rendimento"
            value={`${formatNumber(recipe.yieldQuantity)} ${recipe.yieldUnit}`}
          />
          <SheetValue
            label="Perda de produção"
            value={`${formatNumber(calculation.productionLossPercent)}%`}
          />
        </section>

        <section className="mt-6" aria-labelledby="recipe-print-items-title">
          <h4
            id="recipe-print-items-title"
            className="text-sm font-semibold uppercase tracking-wide text-stone-700"
          >
            Ingredientes e componentes
          </h4>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-2 py-2 font-semibold">Item</th>
                  <th className="px-2 py-2 font-semibold">Tipo</th>
                  <th className="px-2 py-2 text-right font-semibold">Quantidade usada</th>
                  <th className="px-2 py-2 text-right font-semibold">Custo estimado</th>
                </tr>
              </thead>
              <tbody>
                {calculation.items.map((calculatedItem, index) => (
                  <tr
                    key={`${calculatedItem.kind}-${getItemName(calculatedItem)}-${index}`}
                    className="border-b border-stone-200"
                  >
                    <td className="px-2 py-3 font-medium text-stone-900">
                      {getItemName(calculatedItem)}
                    </td>
                    <td className="px-2 py-3 text-stone-600">
                      {getItemType(calculatedItem)}
                    </td>
                    <td className="px-2 py-3 text-right text-stone-700">
                      {getItemQuantity(calculatedItem)}
                      {/* P0-9C: "1 xícara" vira "= 120 g" para quem está na
                          produção com a balança na mão. */}
                      {(() => {
                        const converted = getHouseholdConversionLabel(calculatedItem);
                        return converted !== null ? (
                          <span className="mt-0.5 block text-xs text-stone-500">
                            = {converted}
                          </span>
                        ) : null;
                      })()}
                      {/* Modo avançado (P0-9A): fator ≠ 1 muda o custo do item,
                          então precisa estar visível na ficha, não só no cadastro. */}
                      {(() => {
                        const factor = getCorrectionFactor(calculatedItem);
                        return factor !== null && factor !== 1 ? (
                          <span className="mt-0.5 block text-xs text-stone-500">
                            fator {formatNumber(factor)}
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td className="px-2 py-3 text-right font-medium text-stone-900">
                      {formatCurrency(calculatedItem.itemCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasSubRecipe && (
            <p className="mt-2 text-xs leading-5 text-stone-500">
              Esta ficha inclui componentes calculados a partir de outras receitas cadastradas. O
              custo de cada sub-receita entra proporcionalmente à quantidade usada.
            </p>
          )}
          {hasCorrectedItem && (
            <p className="mt-2 text-xs leading-5 text-stone-500">
              O fator de correção já está aplicado nos custos acima: ele representa quanto do
              ingrediente é consumido do estoque para cada quantidade usada na receita.
            </p>
          )}
        </section>

        <section className="mt-6 flex justify-end" aria-labelledby="recipe-print-cost-title">
          <div className="w-full max-w-md">
            <h4
              id="recipe-print-cost-title"
              className="text-sm font-semibold uppercase tracking-wide text-stone-700"
            >
              Custos da receita
            </h4>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-6">
                <dt className="text-stone-600">Custo dos itens</dt>
                <dd className="font-medium text-stone-900">
                  {formatCurrency(calculation.grossCost)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-6 border-t-2 border-stone-900 pt-3 text-base">
                <dt className="font-semibold text-stone-950">Custo total da receita</dt>
                <dd className="font-semibold text-stone-950">
                  {formatCurrency(calculation.totalCostWithLoss)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-6 rounded-lg bg-rose-50 px-3 py-2 text-base">
                <dt className="font-semibold text-rose-800">
                  Custo por {recipe.yieldUnit}
                </dt>
                <dd className="font-semibold text-rose-950">
                  {formatCurrency(calculation.unitCost)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {recipe.notes?.trim() && (
          <section className="mt-6 border-t border-stone-200 pt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Observações técnicas
            </h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-700">
              {recipe.notes}
            </p>
          </section>
        )}

        <footer className="mt-7 border-t border-stone-200 pt-4 text-center text-xs text-stone-500">
          Documento interno de produção — Minha Fatia.
        </footer>
      </article>
    </section>
  );
}

interface SheetValueProps {
  label: string;
  value: string;
}

function SheetValue({ label, value }: SheetValueProps) {
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-0.5 font-semibold text-stone-950">{value}</p>
    </div>
  );
}
