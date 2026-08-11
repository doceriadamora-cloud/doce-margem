const BRL_CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata valores monetários para exibição sem alterar a precisão do cálculo. */
export function formatCurrency(value: number): string {
  return BRL_CURRENCY_FORMATTER.format(value);
}
