/**
 * Área "Modo avançado" — Fase P0-9A.
 *
 * Casca única dos ajustes finos, para que Ingredientes e Receitas não divirjam
 * em aparência nem em promessa. Não contém regra de negócio: só recolhe.
 *
 * Usa `<details>/<summary>` nativo em vez de estado em React por três motivos
 * concretos: funciona sem JavaScript, já vem com teclado e leitor de tela
 * resolvidos, e não adiciona um `useState` que precisaria ser reinicializado no
 * remount por `key` que os dois formulários usam ao entrar em edição.
 *
 * **Recolhido por padrão** é a regra de produto desta fase: a usuária iniciante
 * precisa cadastrar receita sem esbarrar em fator de correção. A exceção é
 * `defaultOpen`, usada quando o item que está sendo editado já tem ajuste
 * aplicado — esconder um valor que mexe no custo seria pior do que mostrá-lo.
 */

interface AdvancedSectionProps {
  /** Título do bloco. O padrão é o nome que a página de planos anuncia. */
  title?: string;
  /** Uma linha explicando para que serve, antes de a usuária abrir. */
  description: string;
  /**
   * Resumo do que já está preenchido, mostrado ao lado do título mesmo
   * recolhido. `null` quando nada foge do padrão.
   */
  activeSummary?: string | null;
  /** Abrir já expandido — use quando houver ajuste aplicado. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function AdvancedSection({
  title = "Modo avançado",
  description,
  activeSummary = null,
  defaultOpen = false,
  children,
}: AdvancedSectionProps) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-stone-200 bg-stone-50/60 open:bg-white dark:border-stone-700 dark:bg-stone-950/40 dark:open:bg-stone-950"
    >
      <summary className="flex cursor-pointer list-none items-start gap-2 rounded-xl px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-xs text-stone-400 transition-transform group-open:rotate-90 dark:text-stone-500"
        >
          ▶
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-stone-700 dark:text-stone-300">{title}</span>
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
              opcional
            </span>
            {activeSummary !== null && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {activeSummary}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
            {description}
          </span>
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-stone-200 px-3 py-4 dark:border-stone-800">
        {children}
      </div>
    </details>
  );
}
