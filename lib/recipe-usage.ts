/**
 * Quais receitas usam um ingrediente — Fase P0-13.
 *
 * Módulo **puro**: sem UI, sem I/O, sem cálculo de custo. Só percorre o grafo
 * que as sub-receitas da P0-9B criaram.
 *
 * O caso que justifica o arquivo: chocolate está no "Brigadeiro base", e o
 * "Bolo de pote" usa o brigadeiro como componente. Se o chocolate sobe, o bolo
 * também ficou mais caro — e é exatamente essa receita que a usuária esqueceria
 * de revisar, porque o chocolate não aparece na lista de itens dela.
 */

import type { Recipe } from "@/types/pricing";

/** Como o ingrediente chega na receita. */
export type IngredientUsage =
  /** Está na lista de itens da própria receita. */
  | "direct"
  /** Chega através de uma sub-receita, em qualquer profundidade. */
  | "indirect";

export interface RecipeUsingIngredient {
  recipe: Recipe;
  usage: IngredientUsage;
}

function buildRecipesById(recipes: Recipe[]): Record<string, Recipe> {
  const map: Record<string, Recipe> = {};
  for (const recipe of recipes) map[recipe.id] = recipe;
  return map;
}

/** O ingrediente está nos itens desta receita, sem descer para sub-receitas? */
function usesDirectly(recipe: Recipe, ingredientId: string): boolean {
  return recipe.items.some(
    (item) => item.kind !== "subRecipe" && item.ingredientId === ingredientId,
  );
}

/**
 * O ingrediente aparece nesta receita ou em qualquer componente dela?
 *
 * `visited` protege contra referência circular. A P0-9B impede ciclo no
 * momento de salvar, mas um backup importado pode trazer um — e uma travessia
 * sem essa guarda entraria em laço infinito e congelaria a aba. Vale a rede.
 */
function containsIngredient(
  recipe: Recipe,
  ingredientId: string,
  recipesById: Record<string, Recipe>,
  visited: Set<string>,
): boolean {
  if (visited.has(recipe.id)) return false;
  visited.add(recipe.id);

  for (const item of recipe.items) {
    if (item.kind === "subRecipe") {
      const sub = recipesById[item.subRecipeId];
      if (sub && containsIngredient(sub, ingredientId, recipesById, visited)) return true;
      continue;
    }
    if (item.ingredientId === ingredientId) return true;
  }

  return false;
}

/**
 * Receitas afetadas por um ingrediente, com a forma de uso.
 *
 * `direct` tem prioridade: uma receita que usa o chocolate diretamente **e**
 * através de um recheio aparece uma vez só, como direta — é a informação que a
 * usuária precisa para ir consertar.
 */
export function findRecipesUsingIngredient(
  ingredientId: string,
  recipes: Recipe[],
): RecipeUsingIngredient[] {
  if (ingredientId === "") return [];
  const recipesById = buildRecipesById(recipes);

  const encontradas: RecipeUsingIngredient[] = [];
  for (const recipe of recipes) {
    if (usesDirectly(recipe, ingredientId)) {
      encontradas.push({ recipe, usage: "direct" });
      continue;
    }
    // Cada receita começa com um `visited` novo: o que interessa é se ELA
    // alcança o ingrediente, não o que já foi visto avaliando outra.
    if (containsIngredient(recipe, ingredientId, recipesById, new Set())) {
      encontradas.push({ recipe, usage: "indirect" });
    }
  }

  return encontradas;
}

/** Os ingredientes que esta receita consome, direta ou indiretamente. */
export function collectIngredientIds(
  recipe: Recipe,
  recipes: Recipe[],
): Set<string> {
  const recipesById = buildRecipesById(recipes);
  const encontrados = new Set<string>();
  const visited = new Set<string>();

  function walk(atual: Recipe): void {
    if (visited.has(atual.id)) return;
    visited.add(atual.id);

    for (const item of atual.items) {
      if (item.kind === "subRecipe") {
        const sub = recipesById[item.subRecipeId];
        if (sub) walk(sub);
        continue;
      }
      encontrados.add(item.ingredientId);
    }
  }

  walk(recipe);
  return encontrados;
}
