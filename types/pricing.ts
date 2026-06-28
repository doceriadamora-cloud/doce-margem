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
  | "UNKNOWN_UNIT";

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
