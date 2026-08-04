import Link from "next/link";

/**
 * Seções planejadas (Fase 2-2+) que ainda não têm tela própria. Mostradas como
 * rótulos "em breve", não como links — evita apontar para rotas inexistentes.
 */
const upcomingSections = ["Ingredientes", "Receitas", "Precificação"];

/** Cabeçalho fixo do app: marca + navegação principal. Sem estado, renderiza no servidor. */
export default function Header() {
  return (
    <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <span className="text-lg font-semibold tracking-tight text-rose-600 dark:text-rose-400">
          Doce Margem
        </span>
        <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-1 text-sm">
          <Link
            href="/"
            aria-current="page"
            className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          >
            Painel
          </Link>
          {upcomingSections.map((section) => (
            <span
              key={section}
              className="rounded-full px-3 py-1 text-stone-400 dark:text-stone-600"
            >
              {section}{" "}
              <span className="text-[10px] font-medium uppercase tracking-wide">em breve</span>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
