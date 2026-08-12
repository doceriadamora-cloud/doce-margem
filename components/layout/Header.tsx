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
  { label: "Embalagens", href: "/embalagens" },
  { label: "Precificação", href: "/precificacao" },
  { label: "Orçamentos", href: "/orcamentos" },
  { label: "Configurações", href: "/configuracoes" },
];

const activeClass =
  "rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300";
const inactiveClass =
  "rounded-full px-3 py-1 font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-50";

interface HeaderProps {
  /**
   * `true` quando há sessão válida. Vem do layout (Server Component), que a
   * verifica com `getUser()` — o Header não consulta o Supabase por conta
   * própria, e o cliente nunca decide sozinho se está autenticado.
   *
   * Isto é só **exibição** (mostrar "Conta" ou "Entrar"); a autorização de
   * verdade fica no servidor, em cada rota protegida.
   */
  isAuthenticated: boolean;
  /** Indica se a autenticação está configurada; sem ela não há sessão válida. */
  authEnabled: boolean;
}

/**
 * Cabeçalho fixo do app: marca + navegação principal + área de conta.
 * Client Component por causa de `usePathname()` (destaque do link ativo).
 */
export default function Header({ isAuthenticated, authEnabled }: HeaderProps) {
  const pathname = usePathname();
  const showAuthenticatedNavigation = authEnabled && isAuthenticated;

  function linkClass(href: string): string {
    return pathname === href ? activeClass : inactiveClass;
  }

  return (
    <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/"
          aria-label="Minha Fatia — ir para o Painel"
          className="w-fit text-lg font-semibold tracking-tight text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
        >
          Minha Fatia
        </Link>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {showAuthenticatedNavigation && (
            <nav
              aria-label="Navegação principal"
              className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 text-sm sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0"
            >
              {availableSections.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`${linkClass(item.href)} whitespace-nowrap`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <nav
            aria-label="Conta"
            className={`flex flex-wrap items-center gap-1 text-sm ${
              showAuthenticatedNavigation
                ? "border-t border-stone-200 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3 dark:border-stone-800"
                : ""
            }`}
          >
            {showAuthenticatedNavigation ? (
              <Link href="/conta" className={linkClass("/conta")}>
                Conta
              </Link>
            ) : (
              <>
                <Link href="/login" className={linkClass("/login")}>
                  Entrar
                </Link>
                <Link
                  href="/precos"
                  aria-current={pathname === "/precos" ? "page" : undefined}
                  className="rounded-full bg-rose-600 px-3 py-1 font-medium text-white transition-colors hover:bg-rose-700"
                >
                  Ver planos
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
