/**
 * Canais de venda e taxas — Fase 1C-1. Funções puras, sem UI.
 *
 * A partir de um valor líquido desejado (o que a confeiteira quer receber depois
 * das taxas do canal), calcula o preço de venda necessário e o detalhamento das
 * taxas. Não inclui custos fixos, margem, markup nem pricing engine.
 *
 * Fórmula (percentuais já convertidos para decimal):
 *   total% = comissão + pagamento + anúncio          (taxa fixa NÃO entra no %)
 *   preço necessário = (líquido desejado + taxa fixa) / (1 − total%)
 *
 * Detalhamento sobre o preço necessário:
 *   comissão R$ = preço × comissão%
 *   pagamento R$ = preço × pagamento%
 *   anúncio R$  = preço × anúncio%
 *   taxa fixa R$ = taxa fixa
 *   total de taxas = soma das quatro
 *   líquido após taxas = preço − total de taxas   (deve bater com o desejado)
 *
 * A mensalidade do canal NÃO entra aqui — fica registrada para custos fixos (fase futura).
 */

import type {
  CalculationResult,
  ChannelPriceBreakdown,
  SalesChannel,
} from "@/types/pricing";
import { validateChannelPrice } from "./channel-validators";

/**
 * Biblioteca inicial de canais (MVP). Valores aproximados e editáveis depois.
 * Percentuais em 0–100; valores em R$.
 */
export const defaultSalesChannels: SalesChannel[] = [
  {
    id: "balcao-pix",
    name: "Balcão/Pix",
    commissionPercent: 0,
    paymentPercent: 0,
    fixedFee: 0,
    adPercent: 0,
    monthlyFee: 0,
  },
  {
    id: "cartao-maquininha",
    name: "Cartão maquininha",
    commissionPercent: 0,
    paymentPercent: 3.5,
    fixedFee: 0,
    adPercent: 0,
    monthlyFee: 0,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    commissionPercent: 0,
    paymentPercent: 0,
    fixedFee: 0,
    adPercent: 0,
    monthlyFee: 0,
  },
  {
    id: "ifood-basico",
    name: "iFood Básico",
    commissionPercent: 12,
    paymentPercent: 3.2,
    fixedFee: 1,
    adPercent: 0,
    monthlyFee: 100,
  },
  {
    id: "ifood-entrega",
    name: "iFood Entrega",
    commissionPercent: 23,
    paymentPercent: 3.2,
    fixedFee: 1,
    adPercent: 0,
    monthlyFee: 130,
  },
  {
    id: "99food",
    name: "99Food",
    commissionPercent: 15,
    paymentPercent: 3.5,
    fixedFee: 0,
    adPercent: 0,
    monthlyFee: 0,
  },
  {
    id: "rappi",
    name: "Rappi",
    commissionPercent: 27,
    paymentPercent: 3.5,
    fixedFee: 0,
    adPercent: 0,
    monthlyFee: 0,
  },
  {
    id: "uber-eats",
    name: "Uber Eats",
    commissionPercent: 30,
    paymentPercent: 3.5,
    fixedFee: 0,
    adPercent: 0,
    monthlyFee: 0,
  },
];

/**
 * Calcula o preço de venda necessário em um canal para que, após as taxas,
 * reste o valor líquido desejado. Valida antes; se inválido, retorna
 * { ok: false, errors }.
 */
export function calculateChannelPrice(
  channel: SalesChannel,
  desiredNet: number,
): CalculationResult<ChannelPriceBreakdown> {
  const errors = validateChannelPrice(channel, desiredNet);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const commissionRate = channel.commissionPercent / 100;
  const paymentRate = channel.paymentPercent / 100;
  const adRate = channel.adPercent / 100;
  const totalRate = commissionRate + paymentRate + adRate;

  const requiredPrice = (desiredNet + channel.fixedFee) / (1 - totalRate);

  const commissionAmount = requiredPrice * commissionRate;
  const paymentAmount = requiredPrice * paymentRate;
  const adAmount = requiredPrice * adRate;
  const fixedFeeAmount = channel.fixedFee;
  const totalFees = commissionAmount + paymentAmount + adAmount + fixedFeeAmount;
  const netAfterFees = requiredPrice - totalFees;

  return {
    ok: true,
    value: {
      channel,
      desiredNet,
      requiredPrice,
      commissionAmount,
      paymentAmount,
      fixedFeeAmount,
      adAmount,
      totalFees,
      netAfterFees,
    },
  };
}
