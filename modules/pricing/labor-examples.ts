/** Checagens manuais e puras do módulo de mão de obra — Fase P0-2. */

import {
  calculateLaborCostPerUnit,
  calculateTotalDirectCost,
  calculateTotalLaborCost,
} from "./labor";

export interface LaborCheckResult {
  label: string;
  expected: number;
  actual: number | null;
  pass: boolean;
}

export function runLaborValidations(): LaborCheckResult[] {
  const checks: LaborCheckResult[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-10;

  const total = calculateTotalLaborCost({ laborHourlyRate: 30, hours: 2, minutes: 0 });
  checks.push({
    label: "R$ 30/h por 2 horas — custo total",
    expected: 60,
    actual: total.ok ? total.value : null,
    pass: total.ok && near(total.value, 60),
  });

  const perUnit = calculateLaborCostPerUnit({
    laborHourlyRate: 30,
    hours: 2,
    minutes: 0,
    yieldQuantity: 20,
  });
  checks.push({
    label: "R$ 60 para 20 unidades — custo por unidade",
    expected: 3,
    actual: perUnit.ok ? perUnit.value.laborCostPerUnit : null,
    pass: perUnit.ok && near(perUnit.value.laborCostPerUnit, 3),
  });

  const direct = calculateTotalDirectCost({
    recipeUnitCost: 1.36,
    packagingCost: 2,
    laborCostPerUnit: 3,
  });
  checks.push({
    label: "Receita + embalagem + mão de obra — custo direto",
    expected: 6.36,
    actual: direct.ok ? direct.value : null,
    pass: direct.ok && near(direct.value, 6.36),
  });

  const zero = calculateLaborCostPerUnit({
    laborHourlyRate: 0,
    hours: 0,
    minutes: 0,
    yieldQuantity: 20,
  });
  checks.push({
    label: "Valor/hora e tempo zero — cálculo válido",
    expected: 0,
    actual: zero.ok ? zero.value.laborCostPerUnit : null,
    pass: zero.ok && near(zero.value.laborCostPerUnit, 0),
  });

  return checks;
}

export function allLaborExamplesPass(): boolean {
  return runLaborValidations().every((check) => check.pass);
}
