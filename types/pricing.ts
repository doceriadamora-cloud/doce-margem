/**
 * Tipos base do domínio de precificação — Fase 1A.
 *
 * Estes tipos são puros (sem dependência de UI/armazenamento) e formam a base
 * sobre a qual receitas, canais e o pricing engine serão construídos nas
 * próximas subfases. Não alterar a semântica sem validação (ver DECISIONS.md).
 */

/** Unidades-base usadas para calcular custo (grama, mililitro, unidade). */
export type BaseUnit = "g" | "ml" | "un";

/** Unidades aceitas na compra (massa, volume e contagem). */
export type PurchaseUnit = "g" | "kg" | "ml" | "l" | "un";

/**
 * Medidas caseiras — PREPARADAS para o futuro, ainda NÃO implementadas.
 * Entrarão com receitas (Fase 1B+), pois dependem de densidade/peso por medida.
 */
export type HouseholdMeasure =
  | "xicara"
  | "colher_sopa"
  | "colher_cha"
  | "colher_cafe";

/** Dimensão física de uma unidade. Conversões só são válidas dentro da mesma dimensão. */
export type UnitDimension = "mass" | "volume" | "count";

/** Ingrediente como a usuária cadastra (o que comprou e por quanto). */
export interface Ingredient {
  /** Identificador opcional (preenchido pela camada de persistência). */
  id?: string;
  /** Nome do ingrediente. */
  name: string;
  /** Quantidade que vem na embalagem comprada (ex.: 1 para "1 kg"). */
  purchaseQuantity: number;
  /** Unidade da compra (ex.: "kg"). */
  purchaseUnit: PurchaseUnit;
  /** Preço pago pela embalagem comprada (ex.: 38 para "R$ 38,00"). */
  purchasePrice: number;
  /** Unidade-base para o custo (ex.: "g"). Deve ser compatível com a unidade de compra. */
  baseUnit: BaseUnit;
  /** Fator de correção (default 1). Deve ser maior que zero. */
  correctionFactor?: number;
  /** Categoria opcional (ex.: "Chocolate"). */
  category?: string;
}

/** Ingrediente após o cálculo de custo por unidade-base. */
export interface CalculatedIngredient {
  /** Ingrediente de origem. */
  ingredient: Ingredient;
  /** Unidade-base do custo. */
  baseUnit: BaseUnit;
  /** Quantidade comprada convertida para a unidade-base (ex.: 1 kg → 1000 g). */
  quantityInBaseUnit: number;
  /** Custo por unidade-base (ex.: R$/g). */
  costPerBaseUnit: number;
  /** Fator de correção efetivamente aplicado. */
  correctionFactor: number;
}

/** Códigos de erro de validação (estáveis, úteis para a UI futura). */
export type ValidationErrorCode =
  | "REQUIRED"
  | "NEGATIVE"
  | "ZERO"
  | "NON_POSITIVE"
  | "INCOMPATIBLE_UNIT"
  | "UNKNOWN_UNIT"
  | "EMPTY"
  | "OUT_OF_RANGE"
  | "NOT_FOUND"
  | "INVALID_INGREDIENT"
  | "CIRCULAR_REFERENCE";

/** Erro de validação de um campo. */
export interface ValidationError {
  /** Campo que falhou (ex.: "purchasePrice"). */
  field: string;
  /** Código estável do erro. */
  code: ValidationErrorCode;
  /** Mensagem legível em pt-BR. */
  message: string;
}

/**
 * Resultado genérico de um cálculo: ou deu certo com um valor,
 * ou falhou com uma lista de erros de validação (discriminated union).
 */
export type CalculationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] };

/* ──────────────────── Receitas (Fase 1B-1 + sub-receitas 1B-2) ──────────────────── */

/** Discriminador do tipo de item de receita. */
export type RecipeItemKind = "ingredient" | "subRecipe" | "householdMeasure";

/**
 * Item de receita baseado em INGREDIENTE.
 * Os campos derivados (fator de correção e custo) ficam em `CalculatedIngredientItem`.
 */
export interface IngredientRecipeItem {
  kind: "ingredient";
  /** Id do ingrediente referenciado (deve existir na coleção de ingredientes). */
  ingredientId: string;
  /** Nome do ingrediente (para exibição e mensagens). */
  ingredientName: string;
  /** Quantidade usada na receita, na unidade `unit`. */
  quantityUsed: number;
  /** Unidade da quantidade usada (deve ser compatível com a unidade-base do ingrediente). */
  unit: PurchaseUnit;
}

/**
 * Item de receita que usa MEDIDA CASEIRA (xícara, colher de sopa/chá/café).
 * A conversão para unidade-base depende de uma chave de tabela (ex.: "farinha_trigo").
 * Medidas caseiras não convertem para "un" — apenas para "g" ou "ml".
 */
export interface HouseholdMeasureRecipeItem {
  kind: "householdMeasure";
  /** Id do ingrediente referenciado. */
  ingredientId: string;
  /** Nome do ingrediente (para exibição e mensagens). */
  ingredientName: string;
  /** Quantidade de medidas usadas (ex.: 2 para "2 xícaras"). */
  quantityUsed: number;
  /** Medida caseira utilizada. */
  measure: HouseholdMeasure;
  /** Chave de conversão na tabela de densidades (ex.: "farinha_trigo", "acucar", "liquido"). */
  conversionKey: string;
}

/**
 * Item de receita baseado em SUB-RECEITA (uma receita usada dentro de outra).
 * A sub-receita é calculada e seu custo por unidade de rendimento é aplicado.
 */
export interface SubRecipeItem {
  kind: "subRecipe";
  /** Id da sub-receita referenciada (deve existir na coleção de receitas). */
  subRecipeId: string;
  /** Nome da sub-receita (para exibição e mensagens). */
  subRecipeName: string;
  /** Quantidade usada da sub-receita, na unidade `unit`. */
  quantityUsed: number;
  /** Unidade da quantidade usada (deve ser compatível com a unidade de rendimento da sub-receita). */
  unit: PurchaseUnit;
}

/** Item de receita: ingrediente, medida caseira OU sub-receita (união discriminada por `kind`). */
export type RecipeItem =
  | IngredientRecipeItem
  | HouseholdMeasureRecipeItem
  | SubRecipeItem;

/**
 * Receita: lista de itens (ingredientes e/ou sub-receitas), rendimento e perda.
 * Medidas caseiras NÃO entram nesta subfase.
 */
export interface Recipe {
  /** Identificador da receita. */
  id: string;
  /** Nome da receita. */
  name: string;
  /** Itens (pelo menos 1). */
  items: RecipeItem[];
  /** Rendimento: quantas unidades/porções/gramas a receita produz (> 0). */
  yieldQuantity: number;
  /** Unidade do rendimento (ex.: "un", "porções", "g"). */
  yieldUnit: string;
  /** Perda de produção em PORCENTAGEM (0 a <100). Se omitida, vale 0. */
  productionLossPercent?: number;
  /** Observações opcionais. */
  notes?: string;
}

/** Item de medida caseira após o cálculo de custo. */
export interface CalculatedHouseholdMeasureItem {
  kind: "householdMeasure";
  /** Item de origem. */
  item: HouseholdMeasureRecipeItem;
  /** Quantidade em unidade-base por medida (ex.: 120 g por xícara de farinha). */
  amountPerMeasure: number;
  /** Quantidade total em unidade-base (quantityUsed × amountPerMeasure). */
  quantityInBaseUnit: number;
  /** Fator de correção vindo do ingrediente. */
  correctionFactor: number;
  /** Quantidade base após aplicar o fator de correção. */
  correctedQuantity: number;
  /** Custo por unidade-base do ingrediente. */
  costPerBaseUnit: number;
  /** Custo calculado do item. */
  itemCost: number;
}

/** Item de ingrediente após o cálculo de custo. */
export interface CalculatedIngredientItem {
  kind: "ingredient";
  /** Item de origem. */
  item: IngredientRecipeItem;
  /** Fator de correção vindo do ingrediente. */
  correctionFactor: number;
  /** Quantidade usada convertida para a unidade-base do ingrediente. */
  quantityInBaseUnit: number;
  /** Quantidade base após aplicar o fator de correção. */
  correctedQuantity: number;
  /** Custo por unidade-base do ingrediente. */
  costPerBaseUnit: number;
  /** Custo calculado do item. */
  itemCost: number;
}

/** Item de sub-receita após o cálculo de custo. */
export interface CalculatedSubRecipeItem {
  kind: "subRecipe";
  /** Item de origem. */
  item: SubRecipeItem;
  /** Custo por unidade de rendimento da sub-receita. */
  costPerYieldUnit: number;
  /** Quantidade usada convertida para a unidade de rendimento da sub-receita. */
  quantityInYieldUnit: number;
  /** Custo calculado do item. */
  itemCost: number;
  /** Custo completo calculado da sub-receita (para detalhamento/aninhamento). */
  subRecipe: CalculatedRecipe;
}

/** Item de receita calculado: ingrediente, medida caseira OU sub-receita. */
export type CalculatedRecipeItem =
  | CalculatedIngredientItem
  | CalculatedHouseholdMeasureItem
  | CalculatedSubRecipeItem;

/** Receita após o cálculo de custo total, perda e custo unitário. */
export interface CalculatedRecipe {
  /** Receita de origem. */
  recipe: Recipe;
  /** Itens calculados. */
  items: CalculatedRecipeItem[];
  /** Custo total bruto (soma dos itens, sem perda). */
  grossCost: number;
  /** Perda de produção efetivamente aplicada (em %). */
  productionLossPercent: number;
  /** Custo total considerando a perda de produção. */
  totalCostWithLoss: number;
  /** Custo por unidade de rendimento. */
  unitCost: number;
}

/* ──────────────────── Canais de venda (Fase 1C-1) ──────────────────── */

/**
 * Canal de venda e suas taxas. Todos os percentuais são informados de 0 a 100
 * (não em decimal). A conversão para decimal acontece no cálculo.
 *
 * A `monthlyFee` (mensalidade) NÃO entra no cálculo por pedido nesta fase — fica
 * registrada como dado do canal para uso futuro em custos fixos/rateio.
 */
export interface SalesChannel {
  /** Identificador do canal. */
  id: string;
  /** Nome do canal (ex.: "iFood Básico"). */
  name: string;
  /** Comissão do canal em % (0–100). */
  commissionPercent: number;
  /** Taxa de pagamento online em % (0–100). */
  paymentPercent: number;
  /** Taxa fixa por pedido em R$ (≥ 0). Não entra no percentual. */
  fixedFee: number;
  /** Percentual de anúncio/destaque em % (0–100). */
  adPercent: number;
  /** Mensalidade do canal em R$ (≥ 0). NÃO usada no cálculo por pedido nesta fase. */
  monthlyFee: number;
  /** Observações opcionais. */
  notes?: string;
}

/**
 * Detalhamento do cálculo de preço por canal: o preço de venda necessário para,
 * após descontar todas as taxas, restar exatamente o valor líquido desejado.
 */
export interface ChannelPriceBreakdown {
  /** Canal de origem. */
  channel: SalesChannel;
  /** Valor líquido desejado (entrada). */
  desiredNet: number;
  /** Preço de venda necessário para cobrir as taxas e manter o líquido desejado. */
  requiredPrice: number;
  /** Comissão em R$. */
  commissionAmount: number;
  /** Taxa de pagamento em R$. */
  paymentAmount: number;
  /** Taxa fixa em R$. */
  fixedFeeAmount: number;
  /** Anúncio/destaque em R$. */
  adAmount: number;
  /** Total de taxas em R$ (comissão + pagamento + anúncio + taxa fixa). */
  totalFees: number;
  /** Valor líquido após as taxas (deve bater com `desiredNet`). */
  netAfterFees: number;
}

/* ──────────────────── Custos fixos (Fase 1C-2) ──────────────────── */

/** Categorias de custo fixo mensal. */
export type FixedCostCategory =
  | "aluguel"
  | "energia"
  | "agua"
  | "internet"
  | "gas"
  | "telefone"
  | "contador"
  | "software"
  | "funcionario"
  | "pro_labore"
  | "marketplace"
  | "outros";

/** Custo fixo mensal da operação (ex.: aluguel, energia, pró-labore). */
export interface FixedCost {
  /** Identificador do custo fixo. */
  id: string;
  /** Nome do custo (ex.: "Aluguel"). */
  name: string;
  /** Categoria do custo. */
  category: FixedCostCategory;
  /** Valor mensal em R$ (≥ 0). */
  monthlyValue: number;
  /** Se inativo, não entra no total. */
  active: boolean;
  /** Observações opcionais. */
  notes?: string;
}

/**
 * Entrada do cálculo de custos fixos.
 *
 * `channels` representa os canais ativos cuja mensalidade pode ser somada quando
 * `includeChannelMonthlyFees` for `true` (a mensalidade vem da Fase 1C-1,
 * campo `monthlyFee`). A lista de canais é a própria seleção de "ativos".
 */
export interface FixedCostCalculationInput {
  /** Lista de custos fixos (pode ser vazia → total 0). */
  fixedCosts: FixedCost[];
  /** Faturamento mensal estimado em R$ (> 0). */
  estimatedMonthlyRevenue: number;
  /** Volume mensal estimado de unidades (se informado, > 0). */
  estimatedMonthlyUnits?: number;
  /** Canais cujas mensalidades podem ser incluídas. */
  channels?: SalesChannel[];
  /** Se `true`, soma as mensalidades dos canais ao total. */
  includeChannelMonthlyFees?: boolean;
}

/** Resultado do cálculo de custos fixos e do percentual sobre o faturamento. */
export interface FixedCostSummary {
  /** Soma dos custos fixos ATIVOS (sem mensalidades de canais). */
  totalFixedCosts: number;
  /** Soma das mensalidades de canais incluídas (0 se não incluídas). */
  channelMonthlyFeesTotal: number;
  /** Total efetivamente considerado (custos fixos + mensalidades incluídas). */
  totalConsidered: number;
  /** Faturamento mensal estimado (entrada). */
  estimatedMonthlyRevenue: number;
  /** Percentual de custo fixo sobre o faturamento, em decimal (ex.: 0,231 = 23,1%). */
  fixedCostRate: number;
  /** Volume mensal estimado, se informado. */
  estimatedMonthlyUnits?: number;
  /** Custo fixo médio por unidade, se houver volume estimado. */
  fixedCostPerUnit?: number;
}

/* ──────────────────── Pricing engine (Fase 1C-3) ──────────────────── */

/**
 * Status comparativo entre o preço praticado e o preço sugerido de referência.
 *  - below_suggested: praticado abaixo do sugerido (perde margem);
 *  - at_suggested: praticado dentro da tolerância (no ideal);
 *  - above_suggested: praticado acima do sugerido (margem extra).
 */
export type PriceComparisonStatus =
  | "below_suggested"
  | "at_suggested"
  | "above_suggested";

/**
 * Entrada do pricing engine.
 *
 * `fixedCostRate` e `desiredProfitRate` são DECIMAIS (0 a <1) — diferente dos
 * percentuais de canal (0–100). O `fixedCostRate` costuma vir de
 * `FixedCostSummary.fixedCostRate` (Fase 1C-2).
 *
 * O custo direto unitário (CMV) é a base do cálculo. Pode ser informado direto
 * em `directUnitCost` ou derivado de `recipe.unitCost` (receita calculada).
 */
export interface PricingEngineInput {
  /** Receita calculada de origem (opcional). Se `directUnitCost` for omitido, usa `recipe.unitCost`. */
  recipe?: CalculatedRecipe;
  /** Custo direto unitário (CMV) em R$. Se omitido, usa `recipe.unitCost`. */
  directUnitCost?: number;
  /** Percentual de custo fixo sobre o preço, em decimal (0 ≤ x < 1). Ex.: 0,231. */
  fixedCostRate: number;
  /** Lucro desejado, em decimal (0 ≤ x < 1). Ex.: 0,20. */
  desiredProfitRate: number;
  /** Canal de venda opcional (para preço sugerido com taxas do canal). */
  channel?: SalesChannel;
  /** Preço praticado opcional (para comparação real de margem/markup). */
  practicedPrice?: number;
}

/**
 * Detalhamento do preço sugerido COM canal: além do preço e dos custos, traz
 * cada taxa do canal em R$ e o líquido final (o que sobra após as taxas do canal).
 *
 * Identidade: preço = custo direto + custo fixo + lucro + comissão + pagamento
 * + anúncio + taxa fixa. E líquido final = custo direto + custo fixo + lucro.
 */
export interface ChannelSuggestedPriceBreakdown {
  /** Canal de origem. */
  channel: SalesChannel;
  /** Preço sugerido com canal. */
  suggestedPrice: number;
  /** Custo direto unitário (CMV). */
  directUnitCost: number;
  /** Custo fixo rateado (preço × fixedCostRate). */
  fixedCostAmount: number;
  /** Custo total unitário (custo direto + custo fixo rateado). */
  totalUnitCost: number;
  /** Lucro esperado em R$ (preço × desiredProfitRate). */
  expectedProfitAmount: number;
  /** Comissão do canal em R$. */
  commissionAmount: number;
  /** Taxa de pagamento em R$. */
  paymentAmount: number;
  /** Anúncio/destaque em R$. */
  adAmount: number;
  /** Taxa fixa por pedido em R$. */
  fixedFeeAmount: number;
  /** Total das taxas do canal (comissão + pagamento + anúncio + taxa fixa). */
  totalChannelFees: number;
  /** Líquido final = preço − taxas do canal (deve bater com custo direto + custo fixo + lucro). */
  netFinal: number;
  /** Margem esperada com canal (lucro esperado / preço). */
  expectedMargin: number;
  /** Markup esperado com canal (preço / custo direto). */
  expectedMarkup: number;
  /** Markup esperado em % com canal ((preço − custo direto) / custo direto × 100). */
  expectedMarkupPercent: number;
}

/**
 * Comparação entre o preço praticado e o preço sugerido de referência (com canal
 * se houver canal; senão o preço sem canal). Calcula margem e markup REAIS no
 * preço praticado.
 */
export interface PracticedPriceComparison {
  /** Preço praticado informado. */
  practicedPrice: number;
  /** Preço sugerido usado como referência (com canal se houver; senão sem canal). */
  referencePrice: number;
  /** Diferença em R$ (praticado − sugerido). */
  difference: number;
  /** Diferença percentual em decimal ((praticado − sugerido) / sugerido). */
  differencePercent: number;
  /** Custo fixo real no preço praticado (praticado × fixedCostRate). */
  realFixedCostAmount: number;
  /** Taxas do canal no preço praticado em R$ (0 se sem canal). */
  realChannelFees: number;
  /** Lucro líquido real (praticado − custo direto − custo fixo real − taxas do canal). */
  realProfitAmount: number;
  /** Margem real (lucro líquido real / praticado). */
  realMargin: number;
  /** Markup real (praticado / custo direto). */
  realMarkup: number;
  /** Markup real em % ((praticado − custo direto) / custo direto × 100). */
  realMarkupPercent: number;
  /** Status comparativo (tolerância de 1%). */
  status: PriceComparisonStatus;
}

/**
 * Resultado do pricing engine. Os campos de topo descrevem o cenário SEM canal;
 * `channelPricing` traz o cenário COM canal e `practicedComparison` traz a
 * comparação com o preço praticado (ambos opcionais).
 */
export interface PricingEngineResult {
  /** Custo direto unitário (CMV) usado. */
  directUnitCost: number;
  /** Percentual de custo fixo (decimal). */
  fixedCostRate: number;
  /** Lucro desejado (decimal). */
  desiredProfitRate: number;

  /** Preço sugerido SEM canal. */
  suggestedPrice: number;
  /** Custo fixo rateado no preço sem canal (preço × fixedCostRate). */
  fixedCostAmount: number;
  /** Custo total unitário (custo direto + custo fixo rateado). */
  totalUnitCost: number;
  /** Lucro esperado em R$ no preço sem canal (preço × desiredProfitRate). */
  expectedProfitAmount: number;
  /** Margem esperada sem canal (lucro esperado / preço). */
  expectedMargin: number;
  /** Markup esperado sem canal (preço / custo direto). */
  expectedMarkup: number;
  /** Markup esperado em % sem canal. */
  expectedMarkupPercent: number;

  /** Cenário COM canal (presente apenas se houver canal). */
  channelPricing?: ChannelSuggestedPriceBreakdown;
  /** Comparação com o preço praticado (presente apenas se informado). */
  practicedComparison?: PracticedPriceComparison;
}
