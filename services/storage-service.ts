/**
 * storageService — Fase 2-1. Persistência local desacoplada (localStorage).
 *
 * Única camada que fala com `window.localStorage`. A interface (Fase 2+) nunca
 * deve importar `localStorage` diretamente — sempre passar por aqui, para que a
 * troca por Supabase/cloud (Pro, Fase 4+) não exija reescrever a UI (mesma
 * assinatura de funções, implementação interna diferente).
 *
 * Guarda um único objeto (AppState) sob uma chave, versionado por `schemaVersion`.
 * Nunca lança: qualquer falha (localStorage indisponível, JSON inválido, schema
 * desconhecido, campos ausentes/corrompidos) devolve um estado inicial seguro em
 * vez de derrubar a aplicação.
 */

import type { AppState, BusinessSettings } from "@/types/app-state";
import type {
  FixedCost,
  Ingredient,
  Packaging,
  Recipe,
  SalesChannel,
} from "@/types/pricing";
import {
  DEFAULT_QUOTE_PRIMARY_COLOR,
  DEFAULT_QUOTE_SECONDARY_COLOR,
  MAX_STORED_LOGO_DATA_URL_LENGTH,
  QUOTE_PAYMENT_METHODS,
  SAVED_QUOTE_STATUSES,
  type Client,
  type QuoteClientSnapshot,
  type QuoteDraft,
  type QuoteDraftItem,
  type QuoteIdentity,
  type QuotePaymentMethod,
  type SavedQuote,
  type SavedQuoteStatus,
} from "@/types/quotes";

/** Versão atual do schema do estado local. Incrementar ao mudar a forma do AppState. */
export const APP_STATE_SCHEMA_VERSION = 1;

/** Chave única do estado local no localStorage. */
export const APP_STATE_STORAGE_KEY = "doce-margem:app-state";

/** Configurações financeiras iniciais seguras (nada informado ainda). */
export function createEmptyBusinessSettings(): BusinessSettings {
  return {
    estimatedMonthlyRevenue: null,
    estimatedMonthlyUnits: null,
    laborHourlyRate: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Identidade inicial segura, mantendo a marca do app como fallback visual. */
export function createEmptyQuoteIdentity(): QuoteIdentity {
  return {
    brandName: "",
    logoDataUrl: null,
    primaryColor: DEFAULT_QUOTE_PRIMARY_COLOR,
    secondaryColor: DEFAULT_QUOTE_SECONDARY_COLOR,
    whatsapp: "",
    instagram: "",
    email: "",
    address: "",
    defaultCommercialTerms: "",
    updatedAt: new Date().toISOString(),
  };
}

/** Estado inicial seguro (sem dados) — usado sempre que a leitura falha ou não existe. */
export function createEmptyAppState(): AppState {
  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    ingredients: [],
    recipes: [],
    fixedCosts: [],
    packagings: [],
    customChannels: [],
    businessSettings: createEmptyBusinessSettings(),
    quoteIdentity: createEmptyQuoteIdentity(),
    quoteDraft: null,
    clients: [],
    savedQuotes: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * `true` se `window.localStorage` existe e responde. Protege contra SSR (sem
 * `window`), private browsing com quota 0 e navegadores que bloqueiam storage.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const probeKey = "__doce_margem_storage_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function safeGetItem(key: string): string | null {
  if (!isStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isNonNegativeFiniteNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

/**
 * Normaliza `businessSettings` bruto. Segue o mesmo princípio das listas em
 * `normalizeStoredState`: campo ausente, de tipo errado ou com um número
 * inválido (NaN/Infinity) vira o padrão seguro — nunca quebra a leitura do
 * resto do `AppState`.
 */
function normalizeBusinessSettings(raw: unknown): BusinessSettings {
  if (!isPlainObject(raw)) return createEmptyBusinessSettings();
  return {
    estimatedMonthlyRevenue: isFiniteNumberOrNull(raw.estimatedMonthlyRevenue)
      ? raw.estimatedMonthlyRevenue
      : null,
    estimatedMonthlyUnits: isFiniteNumberOrNull(raw.estimatedMonthlyUnits)
      ? raw.estimatedMonthlyUnits
      : null,
    laborHourlyRate: isNonNegativeFiniteNumberOrNull(raw.laborHourlyRate)
      ? raw.laborHourlyRate
      : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

function normalizeHexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : fallback;
}

function normalizeLogoDataUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_STORED_LOGO_DATA_URL_LENGTH) {
    return null;
  }
  return /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)
    ? value
    : null;
}

function normalizeQuoteIdentity(raw: unknown): QuoteIdentity {
  if (!isPlainObject(raw)) return createEmptyQuoteIdentity();

  return {
    brandName: typeof raw.brandName === "string" ? raw.brandName.slice(0, 120) : "",
    logoDataUrl: normalizeLogoDataUrl(raw.logoDataUrl),
    primaryColor: normalizeHexColor(raw.primaryColor, DEFAULT_QUOTE_PRIMARY_COLOR),
    secondaryColor: normalizeHexColor(raw.secondaryColor, DEFAULT_QUOTE_SECONDARY_COLOR),
    whatsapp: typeof raw.whatsapp === "string" ? raw.whatsapp.slice(0, 60) : "",
    instagram: typeof raw.instagram === "string" ? raw.instagram.slice(0, 80) : "",
    email: typeof raw.email === "string" ? raw.email.slice(0, 160) : "",
    address: typeof raw.address === "string" ? raw.address.slice(0, 240) : "",
    defaultCommercialTerms:
      typeof raw.defaultCommercialTerms === "string"
        ? raw.defaultCommercialTerms.slice(0, 1_000)
        : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

function normalizeQuoteDraftItem(raw: unknown): QuoteDraftItem | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || raw.id.trim() === "") return null;

  return {
    id: raw.id,
    description: typeof raw.description === "string" ? raw.description : "",
    quantity: typeof raw.quantity === "string" ? raw.quantity : "",
    unitPrice: typeof raw.unitPrice === "string" ? raw.unitPrice : "",
  };
}

function isQuotePaymentMethod(value: unknown): value is QuotePaymentMethod {
  return (
    typeof value === "string" &&
    QUOTE_PAYMENT_METHODS.some((paymentMethod) => paymentMethod === value)
  );
}

/** Um rascunho corrompido é descartado sem afetar as demais fatias do AppState. */
/** String opcional que vira `""` quando ausente ou de outro tipo. */
function normalizeText(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

/** Referência opcional a outra entidade: só aceita id não vazio. */
function normalizeOptionalId(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw : null;
}

/**
 * Cliente cadastrada — Fase P0-11.
 *
 * Sem `id` ou sem nome não há cliente: a linha é descartada em vez de virar um
 * registro fantasma que a usuária não consegue identificar nem apagar.
 */
function normalizeClient(raw: unknown): Client | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || raw.id.trim() === "") return null;
  if (typeof raw.name !== "string" || raw.name.trim() === "") return null;

  const now = new Date().toISOString();
  return {
    id: raw.id,
    name: raw.name,
    whatsapp: normalizeText(raw.whatsapp),
    email: normalizeText(raw.email),
    address: normalizeText(raw.address),
    notes: normalizeText(raw.notes),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };
}

function isSavedQuoteStatus(raw: unknown): raw is SavedQuoteStatus {
  return (
    typeof raw === "string" &&
    (SAVED_QUOTE_STATUSES as readonly string[]).includes(raw)
  );
}

/** Só os três campos comerciais — ver a nota em `QuoteClientSnapshot`. */
function normalizeClientSnapshot(raw: unknown): QuoteClientSnapshot {
  if (!isPlainObject(raw)) return { name: "", whatsapp: "", email: "" };
  return {
    name: normalizeText(raw.name),
    whatsapp: normalizeText(raw.whatsapp),
    email: normalizeText(raw.email),
  };
}

/**
 * Orçamento salvo — Fase P0-11.
 *
 * Reaproveita `normalizeQuoteDraftItem`: os itens de um orçamento salvo têm a
 * mesma forma dos itens do rascunho, e duplicar a normalização seria criar duas
 * definições da mesma coisa para divergirem depois.
 */
function normalizeSavedQuote(raw: unknown): SavedQuote | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || raw.id.trim() === "") return null;

  const now = new Date().toISOString();
  return {
    id: raw.id,
    quoteNumber: normalizeText(raw.quoteNumber),
    clientId: normalizeOptionalId(raw.clientId),
    clientSnapshot: normalizeClientSnapshot(raw.clientSnapshot),
    quoteDate: normalizeText(raw.quoteDate),
    validityDays: typeof raw.validityDays === "string" ? raw.validityDays : "7",
    paymentMethod: isQuotePaymentMethod(raw.paymentMethod) ? raw.paymentMethod : "pix",
    paymentTerms: normalizeText(raw.paymentTerms),
    items: Array.isArray(raw.items)
      ? raw.items
          .map((item) => normalizeQuoteDraftItem(item))
          .filter((item): item is QuoteDraftItem => item !== null)
      : [],
    discount: normalizeText(raw.discount),
    notes: normalizeText(raw.notes),
    status: isSavedQuoteStatus(raw.status) ? raw.status : "rascunho",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };
}

function normalizeQuoteDraft(raw: unknown): QuoteDraft | null {
  if (!isPlainObject(raw)) return null;
  if (
    typeof raw.quoteNumber !== "string" ||
    typeof raw.quoteDate !== "string" ||
    !Array.isArray(raw.items)
  ) {
    return null;
  }

  return {
    quoteNumber: raw.quoteNumber,
    quoteDate: raw.quoteDate,
    validityDays: typeof raw.validityDays === "string" ? raw.validityDays : "7",
    clientName: typeof raw.clientName === "string" ? raw.clientName : "",
    clientPhone: typeof raw.clientPhone === "string" ? raw.clientPhone : "",
    clientEmail: typeof raw.clientEmail === "string" ? raw.clientEmail : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
    paymentMethod: isQuotePaymentMethod(raw.paymentMethod) ? raw.paymentMethod : "pix",
    paymentTerms: typeof raw.paymentTerms === "string" ? raw.paymentTerms : "",
    discount: typeof raw.discount === "string" ? raw.discount : "",
    items: raw.items
      .map((item) => normalizeQuoteDraftItem(item))
      .filter((item): item is QuoteDraftItem => item !== null),
    // P0-11: ausentes em rascunhos anteriores à fase, e `null` é exatamente o
    // significado certo — rascunho sem cliente cadastrada e ainda não salvo.
    clientId: normalizeOptionalId(raw.clientId),
    savedQuoteId: normalizeOptionalId(raw.savedQuoteId),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

/**
 * Normaliza dados brutos lidos do localStorage para um AppState seguro.
 *
 *  - Não é um objeto → estado vazio.
 *  - `schemaVersion` ausente ou de tipo errado → estado vazio (sem versão
 *    confiável não há como saber migrar).
 *  - `schemaVersion` diferente da atual → estado vazio (nenhuma migração entre
 *    versões existe ainda; só a v1 existe hoje).
 *  - Com a versão batendo, cada array ausente ou com tipo errado é reposto por
 *    `[]` individualmente — um campo corrompido não descarta o restante do
 *    estado (ex.: dado antigo sem `customChannels`).
 *  - `businessSettings` (incluindo `laborHourlyRate`), `packagings`,
 *    `quoteIdentity` e o `quoteDraft` seguem a
 *    mesma lógica aditiva: dado salvo ANTES dessas fases recebe o padrão seguro
 *    sem perder os outros cadastros.
 *    `businessSettings` vira `createEmptyBusinessSettings()`, `packagings` vira
 *    `[]`, `quoteIdentity` recebe o fallback visual e `quoteDraft` vira `null`,
 *    sem descartar `ingredients`/`recipes`/etc.
 *    já cadastrados. Por isso não foi
 *    necessário incrementar `APP_STATE_SCHEMA_VERSION`: a reconstrução campo a
 *    campo (decisão da Fase 2-1) já resolve "campo novo ausente em dado antigo"
 *    sem precisar de uma migração de verdade.
 */
export function normalizeAppState(raw: unknown): AppState {
  if (!isPlainObject(raw)) return createEmptyAppState();
  if (typeof raw.schemaVersion !== "number") return createEmptyAppState();
  if (raw.schemaVersion !== APP_STATE_SCHEMA_VERSION) return createEmptyAppState();

  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    ingredients: Array.isArray(raw.ingredients) ? (raw.ingredients as Ingredient[]) : [],
    recipes: Array.isArray(raw.recipes) ? (raw.recipes as Recipe[]) : [],
    fixedCosts: Array.isArray(raw.fixedCosts) ? (raw.fixedCosts as FixedCost[]) : [],
    packagings: Array.isArray(raw.packagings) ? (raw.packagings as Packaging[]) : [],
    customChannels: Array.isArray(raw.customChannels)
      ? (raw.customChannels as SalesChannel[])
      : [],
    businessSettings: normalizeBusinessSettings(raw.businessSettings),
    quoteIdentity: normalizeQuoteIdentity(raw.quoteIdentity),
    quoteDraft: normalizeQuoteDraft(raw.quoteDraft),
    // P0-11: ausentes em qualquer dado gravado antes desta fase — inclusive na
    // cópia em nuvem da P0-10 — e normalizados para lista vazia sem descartar
    // nada do resto do estado.
    clients: Array.isArray(raw.clients)
      ? raw.clients
          .map((client) => normalizeClient(client))
          .filter((client): client is Client => client !== null)
      : [],
    savedQuotes: Array.isArray(raw.savedQuotes)
      ? raw.savedQuotes
          .map((quote) => normalizeSavedQuote(quote))
          .filter((quote): quote is SavedQuote => quote !== null)
      : [],
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

/**
 * Já existe estado gravado neste navegador? — Fase P0-10.
 *
 * Diferente de `loadAppState()`, que devolve estado vazio tanto para "nunca
 * gravou" quanto para "gravou e está vazio". A sincronização em nuvem precisa
 * separar os dois casos: navegador novo **sempre** aceita o que vier da nuvem,
 * enquanto navegador com estado gravado disputa por data. Sem esta distinção,
 * abrir o app num aparelho novo compararia um estado vazio recém-criado (com
 * `updatedAt` de agora) contra a nuvem — e o vazio ganharia.
 */
export function hasStoredAppState(): boolean {
  return safeGetItem(APP_STATE_STORAGE_KEY) !== null;
}

/* ── Aviso de gravação (Fase P0-10) ──────────────────────────────────
 *
 * Ponto único para saber que o estado mudou. Toda escrita do app passa por
 * `saveAppState`, então um assinante aqui vê tudo — ingredientes, receitas,
 * embalagens, custos fixos, canais, configurações, identidade e rascunho de
 * orçamento — sem precisar assinar oito stores e sem risco de esquecer um.
 *
 * Deliberadamente burro: não sabe o que é nuvem, não faz I/O, não decide nada.
 * Só avisa.
 */

type AppStateSaveListener = (state: AppState) => void;

const saveListeners = new Set<AppStateSaveListener>();

/** Assina gravações bem-sucedidas do estado local. Devolve a função de cancelar. */
export function subscribeToAppStateSaves(listener: AppStateSaveListener): () => void {
  saveListeners.add(listener);
  return () => {
    saveListeners.delete(listener);
  };
}

/**
 * Carrega o estado local. Nunca lança: localStorage indisponível, JSON inválido
 * ou schema desconhecido devolvem `createEmptyAppState()`.
 */
export function loadAppState(): AppState {
  const raw = safeGetItem(APP_STATE_STORAGE_KEY);
  if (raw === null) return createEmptyAppState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return createEmptyAppState();
  }

  return normalizeAppState(parsed);
}

/** Opções de gravação. Omitir mantém o comportamento de sempre. */
export interface SaveAppStateOptions {
  /**
   * Não sobrescrever `updatedAt` — Fase P0-10.
   *
   * Existe para um caso só: gravar localmente o estado que **veio da nuvem**.
   * Carimbar "agora" nesse momento faria o navegador parecer mais recente do
   * que a origem do dado que ele acabou de receber, e o próximo carregamento
   * devolveria essa cópia para a nuvem como se fosse novidade.
   *
   * Toda gravação feita pela usuária continua carimbando a data — é ela que
   * decide quem ganha na comparação com a nuvem.
   */
  preserveUpdatedAt?: boolean;
}

/**
 * Salva o estado local (sobrescreve). Sempre grava a versão atual do schema e,
 * por padrão, atualiza `updatedAt`. Nunca lança: devolve `false` se não
 * conseguiu gravar (localStorage indisponível, quota excedida, dado não
 * serializável).
 */
export function saveAppState(state: AppState, options: SaveAppStateOptions = {}): boolean {
  const toSave: AppState = {
    ...state,
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    updatedAt:
      options.preserveUpdatedAt === true ? state.updatedAt : new Date().toISOString(),
  };

  let serialized: string;
  try {
    serialized = JSON.stringify(toSave);
  } catch {
    return false;
  }

  const persisted = safeSetItem(APP_STATE_STORAGE_KEY, serialized);

  // Avisa só quando a gravação local deu certo — a nuvem não deve receber um
  // estado que o próprio navegador recusou. Um assinante que lance não pode
  // derrubar a gravação, que já terminou: o contrato desta função é "nunca
  // lança", e isso vale mesmo se quem assinou tiver um defeito.
  if (persisted) {
    for (const listener of saveListeners) {
      try {
        listener(toSave);
      } catch {
        // Silencioso de propósito: falha de sincronização não pode virar falha
        // de salvar. O status da nuvem é reportado pela própria camada de sync.
      }
    }
  }

  return persisted;
}

/** Remove o estado local por completo. */
export function clearAppState(): boolean {
  return safeRemoveItem(APP_STATE_STORAGE_KEY);
}

/* ──────────────────── Acesso por fatia (conveniência para a UI futura) ──────────────────── */

export function saveIngredients(ingredients: Ingredient[]): boolean {
  return saveAppState({ ...loadAppState(), ingredients });
}

export function loadIngredients(): Ingredient[] {
  return loadAppState().ingredients;
}

export function saveRecipes(recipes: Recipe[]): boolean {
  return saveAppState({ ...loadAppState(), recipes });
}

export function loadRecipes(): Recipe[] {
  return loadAppState().recipes;
}

export function saveFixedCosts(fixedCosts: FixedCost[]): boolean {
  return saveAppState({ ...loadAppState(), fixedCosts });
}

export function loadFixedCosts(): FixedCost[] {
  return loadAppState().fixedCosts;
}

export function savePackagings(packagings: Packaging[]): boolean {
  return saveAppState({ ...loadAppState(), packagings });
}

export function loadPackagings(): Packaging[] {
  return loadAppState().packagings;
}

export function saveCustomChannels(customChannels: SalesChannel[]): boolean {
  return saveAppState({ ...loadAppState(), customChannels });
}

export function loadCustomChannels(): SalesChannel[] {
  return loadAppState().customChannels;
}

export function saveBusinessSettings(businessSettings: BusinessSettings): boolean {
  return saveAppState({ ...loadAppState(), businessSettings });
}

export function loadBusinessSettings(): BusinessSettings {
  return loadAppState().businessSettings;
}

export function saveQuoteIdentity(quoteIdentity: QuoteIdentity): boolean {
  return saveAppState({ ...loadAppState(), quoteIdentity });
}

export function loadQuoteIdentity(): QuoteIdentity {
  return loadAppState().quoteIdentity;
}

export function saveQuoteDraft(quoteDraft: QuoteDraft): boolean {
  return saveAppState({ ...loadAppState(), quoteDraft });
}

/* ── Clientes e orçamentos salvos (Fase P0-11) ── */

export function saveClients(clients: Client[]): boolean {
  return saveAppState({ ...loadAppState(), clients });
}

export function loadClients(): Client[] {
  return loadAppState().clients;
}

export function saveSavedQuotes(savedQuotes: SavedQuote[]): boolean {
  return saveAppState({ ...loadAppState(), savedQuotes });
}

export function loadSavedQuotes(): SavedQuote[] {
  return loadAppState().savedQuotes;
}

export function loadQuoteDraft(): QuoteDraft | null {
  return loadAppState().quoteDraft;
}
