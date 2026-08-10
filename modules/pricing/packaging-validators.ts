/** Validações puras de embalagens — Fase P0-1. */

import type { Packaging, ValidationError } from "@/types/pricing";

/** Valida uma embalagem cadastrável. Lista vazia significa dado válido. */
export function validatePackaging(packaging: Packaging): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!packaging.name || packaging.name.trim() === "") {
    errors.push({
      field: "name",
      code: "REQUIRED",
      message: "Informe o nome da embalagem.",
    });
  }

  if (!Number.isFinite(packaging.packageQuantity)) {
    errors.push({
      field: "packageQuantity",
      code: "INVALID_NUMBER",
      message: "Informe uma quantidade válida para o pacote.",
    });
  } else if (packaging.packageQuantity <= 0) {
    errors.push({
      field: "packageQuantity",
      code: "NON_POSITIVE",
      message: "A quantidade do pacote precisa ser maior que zero.",
    });
  }

  if (!Number.isFinite(packaging.purchasePrice)) {
    errors.push({
      field: "purchasePrice",
      code: "INVALID_NUMBER",
      message: "Informe um preço válido para o pacote.",
    });
  } else if (packaging.purchasePrice <= 0) {
    errors.push({
      field: "purchasePrice",
      code: "NON_POSITIVE",
      message: "O preço do pacote precisa ser maior que zero.",
    });
  }

  return errors;
}

/** Valida a quantidade usada de uma embalagem em uma venda/produto. */
export function validatePackagingQuantityUsed(quantityUsed: number): ValidationError[] {
  if (!Number.isFinite(quantityUsed)) {
    return [
      {
        field: "quantityUsed",
        code: "INVALID_NUMBER",
        message: "Informe uma quantidade usada válida.",
      },
    ];
  }

  if (quantityUsed <= 0) {
    return [
      {
        field: "quantityUsed",
        code: "NON_POSITIVE",
        message: "A quantidade usada precisa ser maior que zero.",
      },
    ];
  }

  return [];
}
