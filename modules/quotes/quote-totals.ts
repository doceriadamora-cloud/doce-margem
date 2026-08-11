export interface CommercialQuoteItem {
  quantity: number;
  unitPrice: number;
}

export interface CommercialQuoteTotals {
  itemTotals: number[];
  subtotal: number;
  discount: number;
  total: number;
}

function toNonNegativeFinite(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Calcula somente valores comerciais informados manualmente no orçamento.
 * Não recebe nem conhece custos, margem, markup, lucro ou o pricing engine.
 */
export function calculateCommercialQuoteTotals(
  items: CommercialQuoteItem[],
  requestedDiscount = 0,
): CommercialQuoteTotals {
  const itemTotals = items.map(
    (item) => toNonNegativeFinite(item.quantity) * toNonNegativeFinite(item.unitPrice),
  );
  const subtotal = itemTotals.reduce((sum, itemTotal) => sum + itemTotal, 0);
  const discount = Math.min(toNonNegativeFinite(requestedDiscount), subtotal);

  return {
    itemTotals,
    subtotal,
    discount,
    total: subtotal - discount,
  };
}
