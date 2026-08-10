/** Checagens manuais e puras do módulo de embalagens — Fase P0-1. */

import type { Packaging } from "@/types/pricing";
import {
  calculatePackagingCostForSale,
  calculatePackagingUnitCost,
  calculateTotalPackagingCost,
} from "./packagings";

export interface PackagingCheckResult {
  label: string;
  expected: number;
  actual: number | null;
  pass: boolean;
}

const examples: Array<{ packaging: Packaging; expectedUnitCost: number }> = [
  {
    packaging: { name: "Caixa kraft 12x12", packageQuantity: 10, purchasePrice: 18 },
    expectedUnitCost: 1.8,
  },
  {
    packaging: { name: "Saquinho celofane", packageQuantity: 100, purchasePrice: 12 },
    expectedUnitCost: 0.12,
  },
  {
    packaging: { name: "Etiqueta", packageQuantity: 50, purchasePrice: 10 },
    expectedUnitCost: 0.2,
  },
  {
    packaging: { name: "Bandeja", packageQuantity: 20, purchasePrice: 30 },
    expectedUnitCost: 1.5,
  },
  {
    packaging: { name: "Marmitinha", packageQuantity: 50, purchasePrice: 35 },
    expectedUnitCost: 0.7,
  },
];

export function runPackagingValidations(): PackagingCheckResult[] {
  const checks: PackagingCheckResult[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-10;

  for (const example of examples) {
    const result = calculatePackagingUnitCost(example.packaging);
    const actual = result.ok ? result.value : null;
    checks.push({
      label: `${example.packaging.name} — custo unitário`,
      expected: example.expectedUnitCost,
      actual,
      pass: actual !== null && near(actual, example.expectedUnitCost),
    });
  }

  const saleCost = calculatePackagingCostForSale(examples[0].packaging, 2);
  checks.push({
    label: "Duas caixas kraft — custo da venda",
    expected: 3.6,
    actual: saleCost.ok ? saleCost.value.totalCost : null,
    pass: saleCost.ok && near(saleCost.value.totalCost, 3.6),
  });

  const total = calculateTotalPackagingCost([
    { packaging: examples[0].packaging, quantityUsed: 1 },
    { packaging: examples[2].packaging, quantityUsed: 2 },
  ]);
  checks.push({
    label: "Caixa kraft + duas etiquetas — custo total",
    expected: 2.2,
    actual: total.ok ? total.value.totalCost : null,
    pass: total.ok && near(total.value.totalCost, 2.2),
  });

  return checks;
}

export function allPackagingExamplesPass(): boolean {
  return runPackagingValidations().every((check) => check.pass);
}
