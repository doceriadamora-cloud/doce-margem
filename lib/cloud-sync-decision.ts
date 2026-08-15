/**
 * Quem ganha: navegador ou nuvem — Fase P0-10.
 *
 * Função **pura**, isolada de propósito. É a única linha de código do projeto
 * que pode apagar o trabalho da usuária se estiver errada, então não mora
 * dentro de um componente com `useEffect`, cliente Supabase e timer: mora aqui,
 * recebe fatos, devolve uma decisão, e pode ser exercitada sozinha.
 *
 * Sem I/O, sem React, sem Supabase.
 */

/** O que fazer no primeiro encontro entre o estado local e o da nuvem. */
export type SyncAction =
  /** Trazer o estado da nuvem para este navegador. */
  | "hydrate-from-cloud"
  /** Mandar o estado deste navegador para a nuvem. */
  | "push-local"
  /** Os dois lados já estão de acordo. */
  | "none";

export interface SyncDecision {
  action: SyncAction;
  /** Por que, em uma expressão — vai para o status e para diagnóstico. */
  reason:
    | "sem-estado-na-nuvem"
    | "navegador-novo"
    | "data-local-invalida"
    | "nuvem-mais-recente"
    | "local-mais-recente"
    | "em-dia"
    | "nada-para-enviar";
}

export interface SyncDecisionInput {
  /**
   * Já existe a chave do app no localStorage deste navegador?
   *
   * **Não** é o mesmo que "o estado local está vazio". Navegador novo nunca
   * gravou nada, e o estado vazio que ele monta na memória carrega `updatedAt`
   * de agora — o instante mais recente possível. Comparar datas nesse caso
   * faria o vazio ganhar de qualquer nuvem, sempre. É o pior defeito que esta
   * fase poderia ter, e é por isso que este campo existe.
   */
  hasLocalStoredState: boolean;
  /** `updatedAt` do AppState local (ISO). */
  localUpdatedAt: string;
  /** O estado local não tem nenhum cadastro. */
  localIsEmpty: boolean;
  /** `updatedAt` do AppState da nuvem (ISO), ou `null` quando não há linha. */
  cloudUpdatedAt: string | null;
}

/** Forma mínima do estado para saber se há algo cadastrado. */
interface CountableAppState {
  ingredients: unknown[];
  recipes: unknown[];
  fixedCosts: unknown[];
  packagings: unknown[];
  customChannels: unknown[];
  quoteDraft: unknown;
}

/**
 * O estado não tem nenhum cadastro?
 *
 * Configurações e identidade do orçamento ficam de fora da conta: elas sempre
 * existem depois da normalização, então contá-las faria todo estado parecer
 * "com dados" e a checagem nunca valeria nada.
 */
export function isAppStateEmpty(state: CountableAppState): boolean {
  return (
    state.ingredients.length === 0 &&
    state.recipes.length === 0 &&
    state.fixedCosts.length === 0 &&
    state.packagings.length === 0 &&
    state.customChannels.length === 0 &&
    state.quoteDraft === null
  );
}

/** Milissegundos de uma data ISO, ou `null` se não der para interpretar. */
function toTime(iso: string): number | null {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * Decide o encontro inicial entre os dois lados.
 *
 * Ordem das regras, da mais forte para a mais fraca:
 *
 * 1. **Nuvem vazia** → manda o local, se houver o que mandar.
 * 2. **Navegador novo** → aceita a nuvem, sem comparar data. É o caso de trocar
 *    de aparelho, e é exatamente para ele que esta fase existe.
 * 3. **Data local ilegível** → aceita a nuvem. Sem metadado confiável, o lado
 *    que tem histórico vale mais que o lado que não sabe quando mudou.
 * 4. **Comparação de datas** → o mais recente vence.
 *
 * ⚠️ Limite conhecido e assumido: as duas datas são geradas pelo **relógio do
 * navegador**. Aparelho com relógio muito errado pode perder para a nuvem uma
 * alteração que era mais nova. É o custo de "último a escrever vence" sem
 * servidor autoritativo, e a alternativa (merge por entidade) é outra fase.
 */
export function decideInitialSync(input: SyncDecisionInput): SyncDecision {
  const { hasLocalStoredState, localUpdatedAt, localIsEmpty, cloudUpdatedAt } = input;

  // 1. Ainda não há nada na nuvem.
  if (cloudUpdatedAt === null) {
    if (!hasLocalStoredState && localIsEmpty) {
      return { action: "none", reason: "nada-para-enviar" };
    }
    return { action: "push-local", reason: "sem-estado-na-nuvem" };
  }

  // 2. Este navegador nunca gravou nada: a nuvem manda.
  if (!hasLocalStoredState) {
    return { action: "hydrate-from-cloud", reason: "navegador-novo" };
  }

  const localTime = toTime(localUpdatedAt);
  const cloudTime = toTime(cloudUpdatedAt);

  // 3. Sem data local confiável, prefere a nuvem — mas o estado local continua
  //    no navegador até a hidratação dar certo, então nada se perde no caminho.
  if (localTime === null) {
    return { action: "hydrate-from-cloud", reason: "data-local-invalida" };
  }
  // Data da nuvem ilegível é o espelho: o lado com metadado bom prevalece.
  if (cloudTime === null) {
    return { action: "push-local", reason: "local-mais-recente" };
  }

  // 4. O mais recente vence. Empate não gera tráfego.
  if (cloudTime > localTime) {
    return { action: "hydrate-from-cloud", reason: "nuvem-mais-recente" };
  }
  if (localTime > cloudTime) {
    return { action: "push-local", reason: "local-mais-recente" };
  }
  return { action: "none", reason: "em-dia" };
}
