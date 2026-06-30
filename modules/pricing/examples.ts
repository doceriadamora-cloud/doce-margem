/**
 * Dados de exemplo e validação dos cálculos — Fase 1A a 1C-1.
 *
 * Serve para confirmar, com funções puras, que o custo por unidade-base bate
 * com o esperado. Usado pelo runner de validação (ver REVIEW.md / TASKS.md).
 */

import type { Ingredient, Recipe, SalesChannel } from "@/types/pricing";
import { calculateIngredient } from "./ingredients";
import { calculateRecipe } from "./recipes";
import { calculateChannelPrice, defaultSalesChannels } from "./channels";

/** Ingredientes de exemplo para teste manual e seed futuro. */
export const exampleIngredients: Ingredient[] = [
  {
    name: "Chocolate meio amargo",
    purchaseQuantity: 1,
    purchaseUnit: "kg",
    purchasePrice: 38,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Chocolate",
  },
  {
    name: "Leite",
    purchaseQuantity: 1,
    purchaseUnit: "l",
    purchasePrice: 6,
    baseUnit: "ml",
    correctionFactor: 1,
    category: "Laticínios",
  },
  {
    name: "Ovo",
    purchaseQuantity: 30,
    purchaseUnit: "un",
    purchasePrice: 24,
    baseUnit: "un",
    correctionFactor: 1,
    category: "Básicos",
  },
  {
    name: "Creme de leite",
    purchaseQuantity: 200,
    purchaseUnit: "g",
    purchasePrice: 4.5,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Laticínios",
  },
];

/** Custo por unidade-base esperado para cada exemplo. */
interface ExpectedCheck {
  name: string;
  expectedCostPerBaseUnit: number;
}

const expectedChecks: ExpectedCheck[] = [
  { name: "Chocolate meio amargo", expectedCostPerBaseUnit: 0.038 },
  { name: "Leite", expectedCostPerBaseUnit: 0.006 },
  { name: "Ovo", expectedCostPerBaseUnit: 0.8 },
  { name: "Creme de leite", expectedCostPerBaseUnit: 0.0225 },
];

/** Resultado de uma checagem de exemplo (esperado × obtido). */
export interface ValidationCheckResult {
  name: string;
  expected: number;
  actual: number | null;
  pass: boolean;
  detail?: string;
}

const EPSILON = 1e-9;

/**
 * Roda as checagens dos exemplos e retorna esperado × obtido para cada um.
 * Função pura: não imprime nada, só devolve os resultados.
 */
export function runExampleValidations(): ValidationCheckResult[] {
  return expectedChecks.map((check) => {
    const ingredient = exampleIngredients.find((i) => i.name === check.name);
    if (!ingredient) {
      return {
        name: check.name,
        expected: check.expectedCostPerBaseUnit,
        actual: null,
        pass: false,
        detail: "exemplo não encontrado",
      };
    }

    const result = calculateIngredient(ingredient);
    if (!result.ok) {
      return {
        name: check.name,
        expected: check.expectedCostPerBaseUnit,
        actual: null,
        pass: false,
        detail: result.errors.map((e) => e.message).join("; "),
      };
    }

    const actual = result.value.costPerBaseUnit;
    const pass = Math.abs(actual - check.expectedCostPerBaseUnit) < EPSILON;
    return { name: check.name, expected: check.expectedCostPerBaseUnit, actual, pass };
  });
}

/** Retorna true se todos os exemplos baterem com o esperado. */
export function allExamplesPass(): boolean {
  return runExampleValidations().every((r) => r.pass);
}

/* ─────────────────────────── Receitas (Fase 1B-1) ─────────────────────────── */

/** Ingredientes do exemplo de brigadeiro (com id, para referência em receitas). */
export const brigadeiroIngredients: Ingredient[] = [
  {
    id: "leite-condensado",
    name: "Leite condensado",
    purchaseQuantity: 395,
    purchaseUnit: "g",
    purchasePrice: 6.5,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Doces",
  },
  {
    id: "chocolate-po",
    name: "Chocolate em pó",
    purchaseQuantity: 200,
    purchaseUnit: "g",
    purchasePrice: 8,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Chocolate",
  },
  {
    id: "manteiga",
    name: "Manteiga",
    purchaseQuantity: 200,
    purchaseUnit: "g",
    purchasePrice: 12,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Laticínios",
  },
];

/** Receita de exemplo: Brigadeiro (rendimento 20 un, sem perda). */
export const brigadeiroRecipe: Recipe = {
  id: "brigadeiro",
  name: "Brigadeiro",
  items: [
    {
      kind: "ingredient",
      ingredientId: "leite-condensado",
      ingredientName: "Leite condensado",
      quantityUsed: 395,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "chocolate-po",
      ingredientName: "Chocolate em pó",
      quantityUsed: 40,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "manteiga",
      ingredientName: "Manteiga",
      quantityUsed: 20,
      unit: "g",
    },
  ],
  yieldQuantity: 20,
  yieldUnit: "un",
  productionLossPercent: 0,
};

/** Resultado de uma checagem de receita (esperado × obtido). */
export interface RecipeCheckResult {
  label: string;
  expected: number;
  actual: number | null;
  pass: boolean;
  detail?: string;
}

const RECIPE_EPSILON = 1e-6;

/** Mapa id → ingrediente, montado a partir de uma lista. */
function indexById(ingredients: Ingredient[]): Record<string, Ingredient> {
  const map: Record<string, Ingredient> = {};
  for (const ingredient of ingredients) {
    if (ingredient.id) {
      map[ingredient.id] = ingredient;
    }
  }
  return map;
}

/**
 * Valida o exemplo do brigadeiro: custo total bruto, custo com perda e
 * custo unitário. Função pura: só devolve os resultados.
 */
export function runRecipeValidations(): RecipeCheckResult[] {
  const ingredientsById = indexById(brigadeiroIngredients);
  const result = calculateRecipe(brigadeiroRecipe, ingredientsById);

  if (!result.ok) {
    return [
      {
        label: "Brigadeiro calcula sem erros",
        expected: 0,
        actual: result.errors.length,
        pass: false,
        detail: result.errors.map((e) => e.message).join("; "),
      },
    ];
  }

  const r = result.value;
  const near = (a: number, b: number) => Math.abs(a - b) < RECIPE_EPSILON;

  return [
    {
      label: "Brigadeiro custo total bruto",
      expected: 9.3,
      actual: r.grossCost,
      pass: near(r.grossCost, 9.3),
    },
    {
      label: "Brigadeiro custo total com perda (0%)",
      expected: 9.3,
      actual: r.totalCostWithLoss,
      pass: near(r.totalCostWithLoss, 9.3),
    },
    {
      label: "Brigadeiro custo unitário",
      expected: 0.465,
      actual: r.unitCost,
      pass: near(r.unitCost, 0.465),
    },
  ];
}

/** Retorna true se todas as checagens de receita baterem com o esperado. */
export function allRecipeExamplesPass(): boolean {
  return runRecipeValidations().every((r) => r.pass);
}

/* ─────────────────────────── Sub-receitas (Fase 1B-2) ─────────────────────────── */

/**
 * Sub-receita: Recheio de brigadeiro.
 * Mesmos ingredientes do brigadeiro (custo total R$ 9,30), mas com rendimento
 * em gramas (500 g) → custo por g = 9,30 / 500 = R$ 0,0186.
 */
export const recheioRecipe: Recipe = {
  id: "recheio-brigadeiro",
  name: "Recheio de brigadeiro",
  items: [
    {
      kind: "ingredient",
      ingredientId: "leite-condensado",
      ingredientName: "Leite condensado",
      quantityUsed: 395,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "chocolate-po",
      ingredientName: "Chocolate em pó",
      quantityUsed: 40,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "manteiga",
      ingredientName: "Manteiga",
      quantityUsed: 20,
      unit: "g",
    },
  ],
  yieldQuantity: 500,
  yieldUnit: "g",
  productionLossPercent: 0,
};

/** Ingredientes do brownie (números simples para validar). */
export const brownieIngredients: Ingredient[] = [
  {
    id: "farinha",
    name: "Farinha de trigo",
    purchaseQuantity: 1000,
    purchaseUnit: "g",
    purchasePrice: 5,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Secos",
  },
  {
    id: "acucar",
    name: "Açúcar",
    purchaseQuantity: 1000,
    purchaseUnit: "g",
    purchasePrice: 4,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Secos",
  },
  {
    id: "chocolate-brownie",
    name: "Chocolate meio amargo",
    purchaseQuantity: 1000,
    purchaseUnit: "g",
    purchasePrice: 38,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Chocolate",
  },
];

/**
 * Receita principal: Brownie com recheio.
 * Ingredientes (200 g farinha = 1,00; 250 g açúcar = 1,00; 100 g chocolate = 3,80)
 * + 150 g de recheio (sub-receita) = 150 × 0,0186 = 2,79.
 * Custo total = 8,59; rendimento 10 un → custo unitário 0,859.
 */
export const brownieComRecheioRecipe: Recipe = {
  id: "brownie-com-recheio",
  name: "Brownie com recheio",
  items: [
    {
      kind: "ingredient",
      ingredientId: "farinha",
      ingredientName: "Farinha de trigo",
      quantityUsed: 200,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "acucar",
      ingredientName: "Açúcar",
      quantityUsed: 250,
      unit: "g",
    },
    {
      kind: "ingredient",
      ingredientId: "chocolate-brownie",
      ingredientName: "Chocolate meio amargo",
      quantityUsed: 100,
      unit: "g",
    },
    {
      kind: "subRecipe",
      subRecipeId: "recheio-brigadeiro",
      subRecipeName: "Recheio de brigadeiro",
      quantityUsed: 150,
      unit: "g",
    },
  ],
  yieldQuantity: 10,
  yieldUnit: "un",
  productionLossPercent: 0,
};

/**
 * Valida o exemplo de sub-receita: custo por g do recheio, custo do recheio
 * dentro do brownie, custo total e custo unitário do brownie.
 */
export function runSubRecipeValidations(): RecipeCheckResult[] {
  const checks: RecipeCheckResult[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < RECIPE_EPSILON;

  // Sub-receita isolada (custo por g = custo unitário, pois o rendimento é em g).
  const subIngredients = indexById(brigadeiroIngredients);
  const recheioResult = calculateRecipe(recheioRecipe, subIngredients);
  if (!recheioResult.ok) {
    checks.push({
      label: "Recheio calcula sem erros",
      expected: 0,
      actual: recheioResult.errors.length,
      pass: false,
      detail: recheioResult.errors.map((e) => e.message).join("; "),
    });
    return checks;
  }
  const recheio = recheioResult.value;
  checks.push({
    label: "Recheio custo por g (unitário)",
    expected: 0.0186,
    actual: recheio.unitCost,
    pass: near(recheio.unitCost, 0.0186),
  });

  // Receita principal usando a sub-receita.
  const allIngredients = indexById([
    ...brigadeiroIngredients,
    ...brownieIngredients,
  ]);
  const recipesById: Record<string, Recipe> = {
    [recheioRecipe.id]: recheioRecipe,
  };
  const brownieResult = calculateRecipe(
    brownieComRecheioRecipe,
    allIngredients,
    recipesById,
  );
  if (!brownieResult.ok) {
    checks.push({
      label: "Brownie calcula sem erros",
      expected: 0,
      actual: brownieResult.errors.length,
      pass: false,
      detail: brownieResult.errors.map((e) => e.message).join("; "),
    });
    return checks;
  }
  const brownie = brownieResult.value;
  const subItem = brownie.items.find((i) => i.kind === "subRecipe");
  checks.push({
    label: "Brownie custo do recheio (sub-receita)",
    expected: 2.79,
    actual: subItem ? subItem.itemCost : null,
    pass: subItem ? near(subItem.itemCost, 2.79) : false,
  });
  checks.push({
    label: "Brownie custo total bruto",
    expected: 8.59,
    actual: brownie.grossCost,
    pass: near(brownie.grossCost, 8.59),
  });
  checks.push({
    label: "Brownie custo unitário (10 un)",
    expected: 0.859,
    actual: brownie.unitCost,
    pass: near(brownie.unitCost, 0.859),
  });

  return checks;
}

/** Retorna true se todas as checagens de sub-receita baterem com o esperado. */
export function allSubRecipeExamplesPass(): boolean {
  return runSubRecipeValidations().every((r) => r.pass);
}

/* ─────────────────────────── Medidas caseiras (Fase 1B-3) ─────────────────────────── */

/**
 * Ingredientes para os exemplos de medidas caseiras.
 * IDs distintos dos exemplos anteriores para evitar colisão em mapa combinado.
 */
export const householdExampleIngredients: Ingredient[] = [
  {
    id: "farinha-trigo",
    name: "Farinha de trigo",
    purchaseQuantity: 1,
    purchaseUnit: "kg",
    purchasePrice: 8,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Secos",
  },
  {
    id: "acucar-cristal",
    name: "Açúcar cristal",
    purchaseQuantity: 1,
    purchaseUnit: "kg",
    purchasePrice: 5,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Secos",
  },
  {
    id: "leite-integral",
    name: "Leite integral",
    purchaseQuantity: 1,
    purchaseUnit: "l",
    purchasePrice: 6,
    baseUnit: "ml",
    correctionFactor: 1,
    category: "Laticínios",
  },
  {
    id: "manteiga-sem-sal",
    name: "Manteiga sem sal",
    purchaseQuantity: 200,
    purchaseUnit: "g",
    purchasePrice: 12,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Laticínios",
  },
  {
    id: "choc-amargo",
    name: "Chocolate meio amargo",
    purchaseQuantity: 1,
    purchaseUnit: "kg",
    purchasePrice: 38,
    baseUnit: "g",
    correctionFactor: 1,
    category: "Chocolate",
  },
];

/**
 * Receita Cookie Kinder — usa medidas caseiras para farinha e açúcar.
 *
 * Farinha   : 2 xícaras (farinha_trigo) = 2 × 120 g = 240 g → 240 × 0,008 = R$ 1,92
 * Açúcar    : 1 xícara  (acucar)        = 1 × 180 g = 180 g → 180 × 0,005 = R$ 0,90
 * Manteiga  : 100 g (padrão)                                → 100 × 0,06  = R$ 6,00
 * Total bruto: R$ 8,82 → rendimento 24 un → unitCost R$ 0,3675
 */
export const cookieKinderRecipe: Recipe = {
  id: "cookie-kinder",
  name: "Cookie Kinder",
  items: [
    {
      kind: "householdMeasure",
      ingredientId: "farinha-trigo",
      ingredientName: "Farinha de trigo",
      quantityUsed: 2,
      measure: "xicara",
      conversionKey: "farinha_trigo",
    },
    {
      kind: "householdMeasure",
      ingredientId: "acucar-cristal",
      ingredientName: "Açúcar cristal",
      quantityUsed: 1,
      measure: "xicara",
      conversionKey: "acucar",
    },
    {
      kind: "ingredient",
      ingredientId: "manteiga-sem-sal",
      ingredientName: "Manteiga sem sal",
      quantityUsed: 100,
      unit: "g",
    },
  ],
  yieldQuantity: 24,
  yieldUnit: "un",
  productionLossPercent: 0,
};

/**
 * Receita Brownie Ferrero — mistura medidas caseiras com unidade padrão.
 *
 * Farinha   : 1 xícara  (farinha_trigo) = 1 × 120 g = 120 g → 120 × 0,008 = R$ 0,96
 * Açúcar    : 1 xícara  (acucar)        = 1 × 180 g = 180 g → 180 × 0,005 = R$ 0,90
 * Chocolate : 150 g (padrão)                                 → 150 × 0,038 = R$ 5,70
 * Total bruto: R$ 7,56 → rendimento 12 un → unitCost R$ 0,63
 */
export const brownierFerreroRecipe: Recipe = {
  id: "brownie-ferrero",
  name: "Brownie Ferrero",
  items: [
    {
      kind: "householdMeasure",
      ingredientId: "farinha-trigo",
      ingredientName: "Farinha de trigo",
      quantityUsed: 1,
      measure: "xicara",
      conversionKey: "farinha_trigo",
    },
    {
      kind: "householdMeasure",
      ingredientId: "acucar-cristal",
      ingredientName: "Açúcar cristal",
      quantityUsed: 1,
      measure: "xicara",
      conversionKey: "acucar",
    },
    {
      kind: "ingredient",
      ingredientId: "choc-amargo",
      ingredientName: "Chocolate meio amargo",
      quantityUsed: 150,
      unit: "g",
    },
  ],
  yieldQuantity: 12,
  yieldUnit: "un",
  productionLossPercent: 0,
};

/**
 * Valida os 3 exemplos individuais de medida caseira (brief da Fase 1B-3)
 * e as 2 receitas de exemplo (Cookie Kinder, Brownie Ferrero).
 *
 * Exemplos individuais (receita mínima de 1 item para isolar o custo do item):
 *   1. Farinha  — 1 xícara  (farinha_trigo)  → 120 g  × 0,008/g = R$ 0,96
 *   2. Açúcar   — 2 colheres de sopa (acucar) → 22,5 g × 0,005/g = R$ 0,1125
 *   3. Leite    — 0,5 xícara (liquido)         → 120 ml × 0,006/ml = R$ 0,72
 */
export function runHouseholdMeasureValidations(): RecipeCheckResult[] {
  const checks: RecipeCheckResult[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < RECIPE_EPSILON;
  const hmById = indexById(householdExampleIngredients);

  // ── Exemplo 1: 1 xícara de farinha ──
  const farinhaRecipe: Recipe = {
    id: "val-farinha",
    name: "Validação Farinha",
    items: [{
      kind: "householdMeasure",
      ingredientId: "farinha-trigo",
      ingredientName: "Farinha de trigo",
      quantityUsed: 1,
      measure: "xicara",
      conversionKey: "farinha_trigo",
    }],
    yieldQuantity: 1,
    yieldUnit: "un",
  };
  const r1 = calculateRecipe(farinhaRecipe, hmById);
  if (!r1.ok) {
    checks.push({ label: "Farinha 1 xícara — calcula sem erros", expected: 0, actual: r1.errors.length, pass: false, detail: r1.errors.map((e) => e.message).join("; ") });
  } else {
    const itemCost = r1.value.items[0]?.itemCost ?? null;
    checks.push({ label: "Farinha 1 xícara — itemCost", expected: 0.96, actual: itemCost, pass: itemCost !== null && near(itemCost, 0.96) });
  }

  // ── Exemplo 2: 2 colheres de sopa de açúcar ──
  const acucarRecipe: Recipe = {
    id: "val-acucar",
    name: "Validação Açúcar",
    items: [{
      kind: "householdMeasure",
      ingredientId: "acucar-cristal",
      ingredientName: "Açúcar cristal",
      quantityUsed: 2,
      measure: "colher_sopa",
      conversionKey: "acucar",
    }],
    yieldQuantity: 1,
    yieldUnit: "un",
  };
  const r2 = calculateRecipe(acucarRecipe, hmById);
  if (!r2.ok) {
    checks.push({ label: "Açúcar 2 col. sopa — calcula sem erros", expected: 0, actual: r2.errors.length, pass: false, detail: r2.errors.map((e) => e.message).join("; ") });
  } else {
    const itemCost = r2.value.items[0]?.itemCost ?? null;
    checks.push({ label: "Açúcar 2 col. sopa — itemCost", expected: 0.1125, actual: itemCost, pass: itemCost !== null && near(itemCost, 0.1125) });
  }

  // ── Exemplo 3: 0,5 xícara de leite ──
  const leiteRecipe: Recipe = {
    id: "val-leite",
    name: "Validação Leite",
    items: [{
      kind: "householdMeasure",
      ingredientId: "leite-integral",
      ingredientName: "Leite integral",
      quantityUsed: 0.5,
      measure: "xicara",
      conversionKey: "liquido",
    }],
    yieldQuantity: 1,
    yieldUnit: "un",
  };
  const r3 = calculateRecipe(leiteRecipe, hmById);
  if (!r3.ok) {
    checks.push({ label: "Leite 0,5 xícara — calcula sem erros", expected: 0, actual: r3.errors.length, pass: false, detail: r3.errors.map((e) => e.message).join("; ") });
  } else {
    const itemCost = r3.value.items[0]?.itemCost ?? null;
    checks.push({ label: "Leite 0,5 xícara — itemCost", expected: 0.72, actual: itemCost, pass: itemCost !== null && near(itemCost, 0.72) });
  }

  // ── Cookie Kinder ──
  const cookieResult = calculateRecipe(cookieKinderRecipe, hmById);
  if (!cookieResult.ok) {
    checks.push({ label: "Cookie Kinder — calcula sem erros", expected: 0, actual: cookieResult.errors.length, pass: false, detail: cookieResult.errors.map((e) => e.message).join("; ") });
  } else {
    const c = cookieResult.value;
    checks.push({ label: "Cookie Kinder — custo total bruto", expected: 8.82, actual: c.grossCost, pass: near(c.grossCost, 8.82) });
    checks.push({ label: "Cookie Kinder — custo unitário (24 un)", expected: 0.3675, actual: c.unitCost, pass: near(c.unitCost, 0.3675) });
  }

  // ── Brownie Ferrero ──
  const brownieResult = calculateRecipe(brownierFerreroRecipe, hmById);
  if (!brownieResult.ok) {
    checks.push({ label: "Brownie Ferrero — calcula sem erros", expected: 0, actual: brownieResult.errors.length, pass: false, detail: brownieResult.errors.map((e) => e.message).join("; ") });
  } else {
    const b = brownieResult.value;
    checks.push({ label: "Brownie Ferrero — custo total bruto", expected: 7.56, actual: b.grossCost, pass: near(b.grossCost, 7.56) });
    checks.push({ label: "Brownie Ferrero — custo unitário (12 un)", expected: 0.63, actual: b.unitCost, pass: near(b.unitCost, 0.63) });
  }

  return checks;
}

/** Retorna true se todas as checagens de medidas caseiras baterem com o esperado. */
export function allHouseholdMeasureExamplesPass(): boolean {
  return runHouseholdMeasureValidations().every((r) => r.pass);
}

/* ─────────────────────────── Canais de venda (Fase 1C-1) ─────────────────────────── */

/** Acha um canal da biblioteca padrão pelo id (helper dos exemplos). */
function findChannel(id: string): SalesChannel | undefined {
  return defaultSalesChannels.find((c) => c.id === id);
}

/**
 * Valida o cálculo de preço por canal a partir de um líquido desejado de R$ 20,00.
 *
 *   Balcão/Pix      → preço R$ 20,00;     taxas R$ 0,00; líquido R$ 20,00
 *   Cartão          → preço 20 / 0,965  = R$ 20,7254
 *   iFood Básico    → preço 21 / 0,848  = R$ 24,7641
 *   iFood Entrega   → preço 21 / 0,738  = R$ 28,4553
 */
export function runChannelValidations(): RecipeCheckResult[] {
  const checks: RecipeCheckResult[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < RECIPE_EPSILON;
  const desiredNet = 20;

  function pushPriceCheck(channelId: string, label: string, expected: number): void {
    const channel = findChannel(channelId);
    if (!channel) {
      checks.push({ label, expected, actual: null, pass: false, detail: `canal "${channelId}" não encontrado` });
      return;
    }
    const result = calculateChannelPrice(channel, desiredNet);
    if (!result.ok) {
      checks.push({ label, expected, actual: null, pass: false, detail: result.errors.map((e) => e.message).join("; ") });
      return;
    }
    checks.push({ label, expected, actual: result.value.requiredPrice, pass: near(result.value.requiredPrice, expected) });
  }

  // Balcão/Pix — sem taxas: preço = líquido, taxas = 0.
  const balcao = findChannel("balcao-pix");
  if (balcao) {
    const r = calculateChannelPrice(balcao, desiredNet);
    if (r.ok) {
      checks.push({ label: "Balcão/Pix — preço necessário", expected: 20, actual: r.value.requiredPrice, pass: near(r.value.requiredPrice, 20) });
      checks.push({ label: "Balcão/Pix — total de taxas", expected: 0, actual: r.value.totalFees, pass: near(r.value.totalFees, 0) });
      checks.push({ label: "Balcão/Pix — líquido após taxas", expected: 20, actual: r.value.netAfterFees, pass: near(r.value.netAfterFees, 20) });
    } else {
      checks.push({ label: "Balcão/Pix — calcula sem erros", expected: 0, actual: r.errors.length, pass: false, detail: r.errors.map((e) => e.message).join("; ") });
    }
  }

  pushPriceCheck("cartao-maquininha", "Cartão maquininha — preço necessário", 20.72538860103627);
  pushPriceCheck("ifood-basico", "iFood Básico — preço necessário", 24.764150943396228);
  pushPriceCheck("ifood-entrega", "iFood Entrega — preço necessário", 28.45528455284553);

  // Detalhamento do iFood Básico: o líquido após taxas deve voltar a R$ 20,00.
  const ifoodBasico = findChannel("ifood-basico");
  if (ifoodBasico) {
    const r = calculateChannelPrice(ifoodBasico, desiredNet);
    if (r.ok) {
      checks.push({ label: "iFood Básico — líquido após taxas = desejado", expected: 20, actual: r.value.netAfterFees, pass: near(r.value.netAfterFees, 20) });
    }
  }

  return checks;
}

/** Retorna true se todas as checagens de canais baterem com o esperado. */
export function allChannelExamplesPass(): boolean {
  return runChannelValidations().every((r) => r.pass);
}
