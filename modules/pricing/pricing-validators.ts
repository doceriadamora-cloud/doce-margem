/**
 * Validações do pricing engine — Fase 1C-3. Funções puras, sem UI.
 *
 * `fixedCostRate` e `desiredProfitRate` são DECIMAIS (0 a <1); os percentuais do
 * canal seguem 0–100 (validados por `validateChannel`). Regras:
 *  - todo valor numérico precisa ser finito (NaN/Infinity → INVALID_NUMBER);
 *  - custo direto unitário: obrigatório (direto ou via receita) e > 0;
 *  - custo de embalagens (se informado): ≥ 0;
 *  - custo de mão de obra por unidade (se informado): ≥ 0;
 *  - fixedCostRate: ≥ 0 e < 1 (100%);
 *  - desiredProfitRate: ≥ 0 e < 1 (100%);
 *  - canal (se houver): válido (reaproveita `validateChannel`);
 *  - preço praticado (se informado): > 0;
 *  - soma (custo fixo + lucro + taxas de canal) deve ser < 1, senão o
 *    denominador do preço fica ≤ 0 (preço infinito/negativo).
 */

import type { PricingEngineInput, ValidationError } from "@/types/pricing";
import { validateChannel } from "./channel-validators";

/**
 * Valida a entrada do pricing engine.
 * Retorna a lista de erros; lista vazia significa entrada válida.
 */
export function validatePricingEngineInput(
  input: PricingEngineInput,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Custo direto unitário (direto ou derivado da receita calculada).
  const directUnitCost = input.directUnitCost ?? input.recipe?.unitCost;
  if (directUnitCost === undefined) {
    errors.push({
      field: "directUnitCost",
      code: "REQUIRED",
      message:
        "Informe o custo direto unitário (ou uma receita calculada).",
    });
  } else if (!Number.isFinite(directUnitCost)) {
    errors.push({
      field: "directUnitCost",
      code: "INVALID_NUMBER",
      message: "Informe um número válido para o custo direto unitário.",
    });
  } else if (directUnitCost <= 0) {
    errors.push({
      field: "directUnitCost",
      code: "NON_POSITIVE",
      message: "O custo direto unitário precisa ser maior que zero.",
    });
  }

  // Embalagens são custo direto adicional e podem ser zero quando nenhuma foi selecionada.
  if (input.packagingCost !== undefined) {
    if (!Number.isFinite(input.packagingCost)) {
      errors.push({
        field: "packagingCost",
        code: "INVALID_NUMBER",
        message: "Informe um número válido para o custo de embalagens.",
      });
    } else if (input.packagingCost < 0) {
      errors.push({
        field: "packagingCost",
        code: "NEGATIVE",
        message: "O custo de embalagens não pode ser negativo.",
      });
    }
  }

  // Mão de obra por unidade é custo direto adicional e pode ser zero.
  if (input.laborCost !== undefined) {
    if (!Number.isFinite(input.laborCost)) {
      errors.push({
        field: "laborCost",
        code: "INVALID_NUMBER",
        message: "Informe um número válido para o custo de mão de obra.",
      });
    } else if (input.laborCost < 0) {
      errors.push({
        field: "laborCost",
        code: "NEGATIVE",
        message: "O custo de mão de obra não pode ser negativo.",
      });
    }
  }

  // Percentual de custo fixo (decimal 0 a <1).
  let fixedValid = true;
  if (!Number.isFinite(input.fixedCostRate)) {
    fixedValid = false;
    errors.push({
      field: "fixedCostRate",
      code: "INVALID_NUMBER",
      message: "Informe um número válido para o percentual de custo fixo.",
    });
  } else if (input.fixedCostRate < 0) {
    fixedValid = false;
    errors.push({
      field: "fixedCostRate",
      code: "NEGATIVE",
      message: "O percentual de custo fixo não pode ser negativo.",
    });
  } else if (input.fixedCostRate >= 1) {
    fixedValid = false;
    errors.push({
      field: "fixedCostRate",
      code: "OUT_OF_RANGE",
      message: "O percentual de custo fixo precisa ser menor que 100%.",
    });
  }

  // Lucro desejado (decimal 0 a <1).
  let profitValid = true;
  if (!Number.isFinite(input.desiredProfitRate)) {
    profitValid = false;
    errors.push({
      field: "desiredProfitRate",
      code: "INVALID_NUMBER",
      message: "Informe um número válido para o lucro desejado.",
    });
  } else if (input.desiredProfitRate < 0) {
    profitValid = false;
    errors.push({
      field: "desiredProfitRate",
      code: "NEGATIVE",
      message: "O lucro desejado não pode ser negativo.",
    });
  } else if (input.desiredProfitRate >= 1) {
    profitValid = false;
    errors.push({
      field: "desiredProfitRate",
      code: "OUT_OF_RANGE",
      message: "O lucro desejado precisa ser menor que 100%.",
    });
  }

  // Canal (opcional): reaproveita a validação de canal da Fase 1C-1.
  let channelValid = true;
  let channelRates = 0;
  if (input.channel) {
    const channelErrors = validateChannel(input.channel);
    if (channelErrors.length > 0) {
      channelValid = false;
      for (const e of channelErrors) {
        errors.push({ ...e, field: `channel.${e.field}` });
      }
    }
    channelRates =
      (input.channel.commissionPercent +
        input.channel.paymentPercent +
        input.channel.adPercent) /
      100;
  }

  // Preço praticado (opcional): > 0.
  if (input.practicedPrice !== undefined) {
    if (!Number.isFinite(input.practicedPrice)) {
      errors.push({
        field: "practicedPrice",
        code: "INVALID_NUMBER",
        message: "Informe um número válido para o preço praticado.",
      });
    } else if (input.practicedPrice <= 0) {
      errors.push({
        field: "practicedPrice",
        code: "NON_POSITIVE",
        message: "O preço praticado precisa ser maior que zero.",
      });
    }
  }

  // Soma das taxas: o denominador (1 − custo fixo − lucro − taxas de canal) tem
  // de ser > 0. Só checa quando as taxas individuais são válidas (evita ruído).
  if (fixedValid && profitValid && channelValid) {
    const totalRate =
      input.fixedCostRate + input.desiredProfitRate + channelRates;
    if (totalRate >= 1) {
      const pct = Math.round(totalRate * 1000) / 10;
      errors.push({
        field: "rateTotal",
        code: "OUT_OF_RANGE",
        message: `A soma de custo fixo, lucro desejado e taxas do canal (${pct}%) precisa ser menor que 100%.`,
      });
    }
  }

  return errors;
}
