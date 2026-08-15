"use client";

/**
 * Recarrega todos os stores a partir do localStorage — Fase P0-10.
 *
 * Extraído do `BackupPanel`, que já fazia exatamente isto depois de importar um
 * arquivo. Agora há um segundo chamador — a hidratação vinda da nuvem — e duas
 * cópias da mesma lista seria o jeito clássico de um store novo ser esquecido
 * em uma delas e a tela ficar mostrando dado velho.
 *
 * Sempre que nascer um store de feature, ele entra aqui.
 */

import { reloadCustomChannelsFromStorage } from "@/components/channels/channels-store";
import { reloadClientsFromStorage } from "@/components/clients/clients-store";
import { reloadFixedCostsFromStorage } from "@/components/fixed-costs/fixed-costs-store";
import { reloadIngredientsFromStorage } from "@/components/ingredients/ingredients-store";
import { reloadPackagingsFromStorage } from "@/components/packagings/packagings-store";
import { reloadQuoteDraftFromStorage } from "@/components/quotes/quote-draft-store";
import { reloadQuoteIdentityFromStorage } from "@/components/quotes/quote-identity-store";
import { reloadSavedQuotesFromStorage } from "@/components/quotes/saved-quotes-store";
import { reloadRecipesFromStorage } from "@/components/recipes/recipes-store";
import { reloadBusinessSettingsFromStorage } from "@/components/settings/business-settings-store";

export function reloadAllStoresFromStorage(): void {
  reloadIngredientsFromStorage();
  reloadPackagingsFromStorage();
  reloadRecipesFromStorage();
  reloadFixedCostsFromStorage();
  reloadCustomChannelsFromStorage();
  reloadBusinessSettingsFromStorage();
  reloadQuoteIdentityFromStorage();
  reloadQuoteDraftFromStorage();
  // P0-11
  reloadClientsFromStorage();
  reloadSavedQuotesFromStorage();
}
