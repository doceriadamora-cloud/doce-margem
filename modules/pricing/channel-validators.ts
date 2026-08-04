/**
 * Validações de canal de venda — Fase 1C-1. Funções puras, sem UI.
 *
 * Percentuais são informados de 0 a 100. Regras:
 *  - nome obrigatório;
 *  - comissão/pagamento/anúncio: não negativos e ≤ 100;
 *  - taxa fixa e mensalidade: não negativas;
 *  - soma das taxas percentuais (comissão + pagamento + anúncio) deve ser < 100
 *    (caso contrário o preço necessário seria infinito/negativo);
 *  - valor líquido desejado (no cálculo de preço): > 0.
 */

import type { SalesChannel, ValidationError } from "@/types/pricing";

/**
 * Valida um percentual (0–100): NaN/Infinity → INVALID_NUMBER; negativo →
 * NEGATIVE; acima de 100 → OUT_OF_RANGE.
 *
 * O guard de número finito vem primeiro porque NaN faz toda comparação
 * (`<`, `>`) devolver false e passaria silenciosamente pela validação.
 */
function validatePercent(
  value: number,
  field: string,
  label: string,
  errors: ValidationError[],
): void {
  if (!Number.isFinite(value)) {
    errors.push({
      field,
      code: "INVALID_NUMBER",
      message: `Informe um número válido para a ${label}.`,
    });
  } else if (value < 0) {
    errors.push({
      field,
      code: "NEGATIVE",
      message: `A ${label} não pode ser negativa.`,
    });
  } else if (value > 100) {
    errors.push({
      field,
      code: "OUT_OF_RANGE",
      message: `A ${label} não pode ser maior que 100%.`,
    });
  }
}

/** Valida um valor em R$ que não pode ser NaN/Infinity nem negativo. */
function validateNonNegative(
  value: number,
  field: string,
  label: string,
  errors: ValidationError[],
): void {
  if (!Number.isFinite(value)) {
    errors.push({
      field,
      code: "INVALID_NUMBER",
      message: `Informe um número válido para a ${label}.`,
    });
  } else if (value < 0) {
    errors.push({
      field,
      code: "NEGATIVE",
      message: `A ${label} não pode ser negativa.`,
    });
  }
}

/**
 * Valida a definição de um canal de venda.
 * Retorna a lista de erros; lista vazia significa canal válido.
 */
export function validateChannel(channel: SalesChannel): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!channel.name || channel.name.trim() === "") {
    errors.push({
      field: "name",
      code: "REQUIRED",
      message: "Informe o nome do canal.",
    });
  }

  validatePercent(channel.commissionPercent, "commissionPercent", "comissão", errors);
  validatePercent(channel.paymentPercent, "paymentPercent", "taxa de pagamento", errors);
  validatePercent(channel.adPercent, "adPercent", "taxa de anúncio", errors);

  validateNonNegative(channel.fixedFee, "fixedFee", "taxa fixa", errors);
  validateNonNegative(channel.monthlyFee, "monthlyFee", "mensalidade", errors);

  // Soma das taxas percentuais não pode atingir 100% (denominador (1 - total) ≤ 0).
  const totalPercent =
    channel.commissionPercent + channel.paymentPercent + channel.adPercent;
  if (totalPercent >= 100) {
    errors.push({
      field: "percentTotal",
      code: "OUT_OF_RANGE",
      message: `A soma das taxas percentuais (${totalPercent}%) precisa ser menor que 100%.`,
    });
  }

  return errors;
}

/**
 * Valida o canal e o valor líquido desejado para o cálculo de preço por canal.
 * Reúne os erros do canal mais a checagem do líquido desejado (> 0).
 */
export function validateChannelPrice(
  channel: SalesChannel,
  desiredNet: number,
): ValidationError[] {
  const errors = validateChannel(channel);

  if (!Number.isFinite(desiredNet)) {
    errors.push({
      field: "desiredNet",
      code: "INVALID_NUMBER",
      message: "Informe um número válido para o valor líquido desejado.",
    });
  } else if (desiredNet <= 0) {
    errors.push({
      field: "desiredNet",
      code: "NON_POSITIVE",
      message: "O valor líquido desejado precisa ser maior que zero.",
    });
  }

  return errors;
}
