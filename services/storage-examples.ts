/**
 * Validações manuais do storageService — Fase 2-1.
 *
 * Não é um framework de teste (ver DECISIONS.md, "Validação de cálculo sem
 * dependências de teste"): são funções puras que exercitam o storageService de
 * verdade e comparam esperado × obtido, no mesmo espírito de
 * `modules/pricing/examples.ts`.
 *
 * Fica em `services/` (não em `modules/pricing/examples.ts`) de propósito: essas
 * validações dependem de localStorage, e `modules/pricing` não pode depender de
 * `services/` sem quebrar a separação cálculo × armazenamento (CLAUDE.md).
 *
 * IMPORTANTE: só produz resultados reais num ambiente com `window.localStorage`
 * (navegador, ou um polyfill de teste). Usa a CHAVE REAL do app
 * (`APP_STATE_STORAGE_KEY`) e limpa o estado antes/depois — não é para rodar
 * contra dados de uma usuária real.
 */

import type { Recipe, SalesChannel } from "@/types/pricing";
import { exampleIngredients } from "@/modules/pricing/examples";
import {
  APP_STATE_STORAGE_KEY,
  clearAppState,
  isStorageAvailable,
  loadAppState,
  loadBusinessSettings,
  loadCustomChannels,
  loadFixedCosts,
  loadIngredients,
  loadRecipes,
  saveAppState,
  saveBusinessSettings,
  saveCustomChannels,
  saveFixedCosts,
  saveIngredients,
  saveRecipes,
} from "./storage-service";

/** Resultado de uma checagem manual do storageService. */
export interface StorageCheckResult {
  label: string;
  pass: boolean;
  detail?: string;
}

const sampleRecipe: Recipe = {
  id: "val-storage-recipe",
  name: "Receita de validação de storage",
  items: [],
  yieldQuantity: 1,
  yieldUnit: "un",
};

const sampleCustomChannel: SalesChannel = {
  id: "loja-propria",
  name: "Loja própria",
  commissionPercent: 0,
  paymentPercent: 2,
  fixedFee: 0,
  adPercent: 0,
  monthlyFee: 0,
};

/** Escreve uma string crua direto na chave do app (simula dado corrompido/legado). */
function writeRawState(value: string): void {
  window.localStorage.setItem(APP_STATE_STORAGE_KEY, value);
}

/**
 * Roda as checagens do storageService: round-trip de cada fatia, isolamento
 * entre fatias, `clearAppState`, e os casos de dado inválido (JSON quebrado,
 * schema ausente/desconhecido, campos ausentes ou com tipo errado).
 */
export function runStorageValidations(): StorageCheckResult[] {
  const checks: StorageCheckResult[] = [];

  if (!isStorageAvailable()) {
    checks.push({
      label: "localStorage disponível neste ambiente",
      pass: false,
      detail:
        "isStorageAvailable() = false — rode num navegador (ou com um polyfill de window.localStorage) para validar de verdade",
    });
    return checks;
  }

  // Sempre parte de um estado limpo.
  clearAppState();

  // 1. Estado vazio no primeiro load (sem nada salvo ainda).
  const empty = loadAppState();
  checks.push({
    label: "Primeiro load sem dados — estado vazio",
    pass:
      empty.schemaVersion === 1 &&
      empty.ingredients.length === 0 &&
      empty.recipes.length === 0 &&
      empty.fixedCosts.length === 0 &&
      empty.customChannels.length === 0 &&
      empty.businessSettings.estimatedMonthlyRevenue === null &&
      empty.businessSettings.estimatedMonthlyUnits === null,
  });

  // 2. Round-trip de ingredientes.
  saveIngredients(exampleIngredients);
  const loadedIngredients = loadIngredients();
  checks.push({
    label: "Ingredientes — round-trip salva/carrega",
    pass:
      loadedIngredients.length === exampleIngredients.length &&
      loadedIngredients[0]?.name === exampleIngredients[0]?.name,
  });

  // 3. Round-trip de receitas.
  saveRecipes([sampleRecipe]);
  const loadedRecipes = loadRecipes();
  checks.push({
    label: "Receitas — round-trip salva/carrega",
    pass: loadedRecipes.length === 1 && loadedRecipes[0]?.id === sampleRecipe.id,
  });

  // 4. Salvar uma fatia não apaga as outras já salvas.
  checks.push({
    label: "Salvar receitas não apaga ingredientes já salvos",
    pass: loadIngredients().length === exampleIngredients.length,
  });

  // 5. Round-trip de custos fixos.
  const fixedCost = {
    id: "aluguel",
    name: "Aluguel",
    category: "aluguel" as const,
    monthlyValue: 800,
    active: true,
  };
  saveFixedCosts([fixedCost]);
  checks.push({
    label: "Custos fixos — round-trip salva/carrega",
    pass: loadFixedCosts().length === 1 && loadFixedCosts()[0]?.monthlyValue === 800,
  });

  // 6. Round-trip de canais customizados.
  saveCustomChannels([sampleCustomChannel]);
  checks.push({
    label: "Canais customizados — round-trip salva/carrega",
    pass: loadCustomChannels().length === 1 && loadCustomChannels()[0]?.id === "loja-propria",
  });

  // 6b. Round-trip de configurações financeiras (Fase 2-6).
  saveBusinessSettings({ estimatedMonthlyRevenue: 10000, estimatedMonthlyUnits: 770, updatedAt: "" });
  const loadedSettings = loadBusinessSettings();
  checks.push({
    label: "Configurações financeiras — round-trip salva/carrega",
    pass:
      loadedSettings.estimatedMonthlyRevenue === 10000 && loadedSettings.estimatedMonthlyUnits === 770,
  });

  // 7. saveAppState grava com sucesso e atualiza updatedAt (ISO válido).
  const saveResult = saveAppState({ ...loadAppState(), ingredients: [] });
  const updatedAtIso = loadAppState().updatedAt;
  checks.push({
    label: "saveAppState devolve true e grava updatedAt em ISO válido",
    pass: saveResult === true && !Number.isNaN(new Date(updatedAtIso).getTime()),
  });

  // 8. clearAppState remove tudo — load seguinte volta ao estado vazio.
  clearAppState();
  const afterClear = loadAppState();
  checks.push({
    label: "clearAppState — load seguinte volta ao estado vazio",
    pass:
      afterClear.ingredients.length === 0 &&
      afterClear.recipes.length === 0 &&
      afterClear.fixedCosts.length === 0 &&
      afterClear.customChannels.length === 0 &&
      afterClear.businessSettings.estimatedMonthlyRevenue === null,
  });

  // 9. JSON inválido — loadAppState não lança, devolve estado vazio.
  writeRawState("{ isso não é json válido");
  let threwOnInvalidJson = false;
  let afterInvalidJson: ReturnType<typeof loadAppState> | null = null;
  try {
    afterInvalidJson = loadAppState();
  } catch {
    threwOnInvalidJson = true;
  }
  checks.push({
    label: "JSON inválido — não lança e devolve estado vazio",
    pass: !threwOnInvalidJson && afterInvalidJson !== null && afterInvalidJson.ingredients.length === 0,
  });

  // 10. schemaVersion ausente — fallback para estado vazio.
  writeRawState(JSON.stringify({ ingredients: [{ name: "sem versão" }] }));
  const noVersion = loadAppState();
  checks.push({
    label: "schemaVersion ausente — fallback para estado vazio",
    pass: noVersion.ingredients.length === 0 && noVersion.schemaVersion === 1,
  });

  // 11. schemaVersion desconhecida (futura) — fallback para estado vazio.
  writeRawState(JSON.stringify({ schemaVersion: 999, ingredients: [{ name: "versão futura" }] }));
  const futureVersion = loadAppState();
  checks.push({
    label: "schemaVersion desconhecida (999) — fallback para estado vazio",
    pass: futureVersion.ingredients.length === 0,
  });

  // 12. Estado antigo de ANTES da Fase 2-6: tem ingredientes/receitas, mas
  // nunca teve o campo `businessSettings` (nem existia). Não pode descartar
  // tudo, só recompor os campos faltando com um padrão seguro — é o teste que
  // prova a compatibilidade retroativa exigida pela Fase 2-6.
  writeRawState(
    JSON.stringify({
      schemaVersion: 1,
      ingredients: exampleIngredients,
      updatedAt: "2026-01-01T00:00:00.000Z",
      // recipes, fixedCosts, customChannels e businessSettings propositalmente ausentes.
    }),
  );
  const partial = loadAppState();
  checks.push({
    label:
      "Estado antigo pré-Fase 2-6 (sem businessSettings nem outros arrays) — ingredientes preservados, resto vira padrão seguro",
    pass:
      partial.ingredients.length === exampleIngredients.length &&
      Array.isArray(partial.recipes) &&
      partial.recipes.length === 0 &&
      Array.isArray(partial.fixedCosts) &&
      partial.fixedCosts.length === 0 &&
      Array.isArray(partial.customChannels) &&
      partial.customChannels.length === 0 &&
      partial.businessSettings.estimatedMonthlyRevenue === null &&
      partial.businessSettings.estimatedMonthlyUnits === null &&
      typeof partial.businessSettings.updatedAt === "string",
  });

  // 13. Campo com tipo errado (não é array) — vira [] em vez de quebrar.
  writeRawState(
    JSON.stringify({
      schemaVersion: 1,
      ingredients: "isso deveria ser um array",
      recipes: [],
      fixedCosts: [],
      customChannels: [],
    }),
  );
  const corruptedField = loadAppState();
  checks.push({
    label: "Campo com tipo errado (ingredients como string) — vira [] em vez de quebrar",
    pass: Array.isArray(corruptedField.ingredients) && corruptedField.ingredients.length === 0,
  });

  // 14. businessSettings com tipo errado (não é objeto, e campos internos com
  // tipo errado) — vira o padrão seguro, sem quebrar o resto do estado.
  writeRawState(
    JSON.stringify({
      schemaVersion: 1,
      ingredients: [],
      recipes: [],
      fixedCosts: [],
      customChannels: [],
      businessSettings: "isso deveria ser um objeto",
    }),
  );
  const corruptedSettings1 = loadAppState();
  checks.push({
    label: "businessSettings como string (não objeto) — vira padrão seguro",
    pass:
      corruptedSettings1.businessSettings.estimatedMonthlyRevenue === null &&
      corruptedSettings1.businessSettings.estimatedMonthlyUnits === null,
  });

  writeRawState(
    JSON.stringify({
      schemaVersion: 1,
      ingredients: [],
      recipes: [],
      fixedCosts: [],
      customChannels: [],
      businessSettings: { estimatedMonthlyRevenue: "dez mil", estimatedMonthlyUnits: NaN },
    }),
  );
  const corruptedSettings2 = loadAppState();
  checks.push({
    label: "businessSettings com campos de tipo/valor errado (string, NaN) — cada campo vira null",
    pass:
      corruptedSettings2.businessSettings.estimatedMonthlyRevenue === null &&
      corruptedSettings2.businessSettings.estimatedMonthlyUnits === null,
  });

  // Não deixa rastro na máquina de quem rodou a validação.
  clearAppState();

  return checks;
}

/** Retorna true se todas as checagens do storageService baterem com o esperado. */
export function allStorageExamplesPass(): boolean {
  return runStorageValidations().every((r) => r.pass);
}
