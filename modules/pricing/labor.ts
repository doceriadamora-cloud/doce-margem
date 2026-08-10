/** Cálculos puros de mão de obra — Fase P0-2. */

import type {
  CalculationResult,
  LaborCostInput,
  LaborCostPerUnitInput,
  LaborCostSummary,
  LaborTimeInput,
  TotalDirectCostInput,
} from "@/types/pricing";
import {
  validateLaborCostInput,
  validateLaborCostPerUnitInput,
  validateLaborTime,
  validateTotalDirectCostInput,
} from "./labor-validators";

/** Converte horas + minutos em horas decimais. */
export function calculateLaborTimeInHours(
  input: LaborTimeInput,
): CalculationResult<number> {
  const errors = validateLaborTime(input);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input.hours + input.minutes / 60 };
}

/** totalLaborCost = laborHourlyRate × laborTimeInHours. */
export function calculateTotalLaborCost(
  input: LaborCostInput,
): CalculationResult<number> {
  const errors = validateLaborCostInput(input);
  if (errors.length > 0) return { ok: false, errors };

  const laborTimeInHours = input.hours + input.minutes / 60;
  return { ok: true, value: input.laborHourlyRate * laborTimeInHours };
}

/** laborCostPerUnit = totalLaborCost / yieldQuantity. */
export function calculateLaborCostPerUnit(
  input: LaborCostPerUnitInput,
): CalculationResult<LaborCostSummary> {
  const errors = validateLaborCostPerUnitInput(input);
  if (errors.length > 0) return { ok: false, errors };

  const laborTimeInHours = input.hours + input.minutes / 60;
  const totalLaborCost = input.laborHourlyRate * laborTimeInHours;
  return {
    ok: true,
    value: {
      ...input,
      laborTimeInHours,
      totalLaborCost,
      laborCostPerUnit: totalLaborCost / input.yieldQuantity,
    },
  };
}

/** totalDirectCost = receita + embalagens + mão de obra por unidade. */
export function calculateTotalDirectCost(
  input: TotalDirectCostInput,
): CalculationResult<number> {
  const errors = validateTotalDirectCostInput(input);
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: input.recipeUnitCost + input.packagingCost + input.laborCostPerUnit,
  };
}
