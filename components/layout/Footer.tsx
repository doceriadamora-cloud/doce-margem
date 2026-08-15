import Link from "next/link";
import SupportLink from "@/components/support/SupportLink";
import CloudSyncStatus from "@/components/sync/CloudSyncStatus";

/**
 * Rodapé do app — Fase P0-8A.
 *
 * Existe por dois motivos encontrados na auditoria P0-8: não havia canal de
 * suporte em lugar nenhum, e não havia páginas legais. Um rodapé resolve os dois
 * de uma vez e em todas as telas, sem competir com a jornada principal.
 *
 * Server Component: só links.
 *
 * ⚠️ Escondido na impressão por `body > footer` em `globals.css`. Sem isso, todo
 * orçamento enviado ao cliente sairia com "Termos de uso" no rodapé do papel.
 */
export default function Footer() {
  return (
    <footer className="mt-12 border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <nav
          aria-label="Links legais"
          className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500 dark:text-stone-400"
        >
          <FooterLink href="/precos">Planos</FooterLink>
          <FooterLink href="/termos">Termos de uso</FooterLink>
          <FooterLink href="/privacidade">Privacidade</FooterLink>
          <FooterLink href="/reembolso">Reembolso</FooterLink>
        </nav>

        <div className="flex flex-col gap-1 text-xs text-stone-400 sm:items-end dark:text-stone-500">
          {/* P0-10: some sozinho para quem não sincroniza — o componente
              devolve `null` enquanto a fase for `idle`. */}
          <CloudSyncStatus variant="badge" />
          <SupportLink variant="quiet" label="Falar com suporte no WhatsApp" />
          <p>
            O Minha Fatia apoia a formação de preços e não substitui a orientação de um contador.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="transition-colors hover:text-rose-600 dark:hover:text-rose-400">
      {children}
    </Link>
  );
}
