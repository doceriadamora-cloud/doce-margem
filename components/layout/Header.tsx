"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
}

/** Todas as seções principais já têm tela própria — links reais, destacados quando ativos. */
const availableSections: NavItem[] = [
  { label: "Painel", href: "/" },
  { label: "Ingredientes", href: "/ingredientes" },
  { label: "Receitas", href: "/receitas" },
  { label: "Precificação", href: "/precificacao" },
  { label: "Configurações", href: "/configuracoes" },
];

const activeClass =
  "rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300";
const inactiveClass =
  "rounded-full px-3 py-1 font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-50";

/**
 * Cabeçalho fixo do app: marca + navegação principal. Client Component só por
 * causa de `usePathname()` (precisa saber qual link destacar como ativo).
 */
export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <span className="text-lg font-semibold tracking-tight text-rose-600 dark:text-rose-400">
          Doce Margem
        </span>
        <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-1 text-sm">
          {availableSections.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={isActive ? activeClass : inactiveClass}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
