/** Cálculos puros de embalagens — Fase P0-1. */

import type {
  CalculationResult,
  Packaging,
  PackagingCostForSale,
  PackagingCostSummary,
  PackagingUsage,
  ValidationError,
} from "@/types/pricing";
import { validatePackaging, validatePackagingQuantityUsed } from "./packaging-validators";

/** unitCost = purchasePrice / packageQuantity. */
export function calculatePackagingUnitCost(
  packaging: Packaging,
): CalculationResult<number> {
  const errors = validatePackaging(packaging);
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: packaging.purchasePrice / packaging.packageQuantity,
  };
}

/** packagingCostForSale = unitCost × quantityUsed. */
export function calculatePackagingCostForSale(
  packaging: Packaging,
  quantityUsed: number,
): CalculationResult<PackagingCostForSale> {
  const unitCostResult = calculatePackagingUnitCost(packaging);
  const quantityErrors = validatePackagingQuantityUsed(quantityUsed);
  const errors: ValidationError[] = [
    ...(unitCostResult.ok ? [] : unitCostResult.errors),
    ...quantityErrors,
  ];

  if (errors.length > 0 || !unitCostResult.ok) return { ok: false, errors };

  return {
    ok: true,
    value: {
      packaging,
      unitCost: unitCostResult.value,
      quantityUsed,
      totalCost: unitCostResult.value * quantityUsed,
    },
  };
}

/** totalPackagingCost = soma dos custos das embalagens selecionadas. */
export function calculateTotalPackagingCost(
  usages: PackagingUsage[],
): CalculationResult<PackagingCostSummary> {
  const items: PackagingCostForSale[] = [];
  const errors: ValidationError[] = [];

  usages.forEach((usage, index) => {
    const result = calculatePackagingCostForSale(usage.packaging, usage.quantityUsed);
    if (result.ok) {
      items.push(result.value);
      return;
    }

    for (const error of result.errors) {
      errors.push({ ...error, field: `usages[${index}].${error.field}` });
    }
  });

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      items,
      totalCost: items.reduce((total, item) => total + item.totalCost, 0),
    },
  };
}
