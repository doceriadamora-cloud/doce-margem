/** Validações puras de mão de obra — Fase P0-2. */

import type {
  LaborCostInput,
  LaborCostPerUnitInput,
  LaborTimeInput,
  TotalDirectCostInput,
  ValidationError,
} from "@/types/pricing";

function validateNonNegative(
  value: number,
  field: string,
  label: string,
): ValidationError[] {
  if (!Number.isFinite(value)) {
    return [{ field, code: "INVALID_NUMBER", message: `Informe um número válido para ${label}.` }];
  }
  if (value < 0) {
    return [{ field, code: "NEGATIVE", message: `${label} não pode ser negativo.` }];
  }
  return [];
}

/** Valida horas e minutos da produção. */
export function validateLaborTime(input: LaborTimeInput): ValidationError[] {
  const errors = [
    ...validateNonNegative(input.hours, "hours", "o tempo em horas"),
    ...validateNonNegative(input.minutes, "minutes", "o tempo em minutos"),
  ];

  if (Number.isFinite(input.minutes) && input.minutes >= 60) {
    errors.push({
      field: "minutes",
      code: "OUT_OF_RANGE",
      message: "Informe os minutos entre 0 e 59.",
    });
  }

  return errors;
}

/** Valida valor/hora e tempo de produção. Zero é permitido nos três campos. */
export function validateLaborCostInput(input: LaborCostInput): ValidationError[] {
  return [
    ...validateNonNegative(
      input.laborHourlyRate,
      "laborHourlyRate",
      "o valor da hora de trabalho",
    ),
    ...validateLaborTime(input),
  ];
}

/** Valida a mão de obra e o rendimento usado no rateio por unidade. */
export function validateLaborCostPerUnitInput(
  input: LaborCostPerUnitInput,
): ValidationError[] {
  const errors = validateLaborCostInput(input);
  if (!Number.isFinite(input.yieldQuantity)) {
    errors.push({
      field: "yieldQuantity",
      code: "INVALID_NUMBER",
      message: "Informe um rendimento válido para calcular a mão de obra por unidade.",
    });
  } else if (input.yieldQuantity <= 0) {
    errors.push({
      field: "yieldQuantity",
      code: "NON_POSITIVE",
      message: "O rendimento precisa ser maior que zero para calcular a mão de obra por unidade.",
    });
  }
  return errors;
}

/** Valida as três parcelas do custo direto unitário. */
export function validateTotalDirectCostInput(
  input: TotalDirectCostInput,
): ValidationError[] {
  return [
    ...validateNonNegative(input.recipeUnitCost, "recipeUnitCost", "o custo da receita"),
    ...validateNonNegative(input.packagingCost, "packagingCost", "o custo de embalagens"),
    ...validateNonNegative(
      input.laborCostPerUnit,
      "laborCostPerUnit",
      "o custo de mão de obra",
    ),
  ];
}
