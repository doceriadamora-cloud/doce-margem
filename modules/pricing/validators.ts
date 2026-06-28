/**
 * Validações de domínio — Fase 1A. Funções puras, sem UI.
 *
 * Impede dados que quebrariam o cálculo: preço/quantidade negativos ou zero,
 * unidade incompatível, ingrediente sem nome e fator de correção ≤ 0.
 */

import type { Ingredient, ValidationError } from "@/types/pricing";
import { areUnitsCompatible } from "./units";

/**
 * Valida um ingrediente e retorna a lista de erros encontrados.
 * Lista vazia significa que o ingrediente é válido.
 */
export function validateIngredient(input: Ingredient): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name || input.name.trim() === "") {
    errors.push({
      field: "name",
      code: "REQUIRED",
      message: "Informe o nome do ingrediente.",
    });
  }

  if (input.purchasePrice < 0) {
    errors.push({
      field: "purchasePrice",
      code: "NEGATIVE",
      message: "O preço não pode ser negativo.",
    });
  } else if (input.purchasePrice === 0) {
    errors.push({
      field: "purchasePrice",
      code: "ZERO",
      message: "O preço não pode ser zero.",
    });
  }

  if (input.purchaseQuantity < 0) {
    errors.push({
      field: "purchaseQuantity",
      code: "NEGATIVE",
      message: "A quantidade comprada não pode ser negativa.",
    });
  } else if (input.purchaseQuantity === 0) {
    errors.push({
      field: "purchaseQuantity",
      code: "ZERO",
      message: "A quantidade comprada não pode ser zero.",
    });
  }

  const correctionFactor = input.correctionFactor ?? 1;
  if (correctionFactor <= 0) {
    errors.push({
      field: "correctionFactor",
      code: "NON_POSITIVE",
      message: "O fator de correção deve ser maior que zero.",
    });
  }

  if (!areUnitsCompatible(input.purchaseUnit, input.baseUnit)) {
    errors.push({
      field: "baseUnit",
      code: "INCOMPATIBLE_UNIT",
      message: `Unidade-base "${input.baseUnit}" é incompatível com a unidade de compra "${input.purchaseUnit}".`,
    });
  }

  return errors;
}
