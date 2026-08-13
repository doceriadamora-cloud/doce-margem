import Link from "next/link";
import SupportLink from "@/components/support/SupportLink";

/**
 * Casca das páginas legais — Fase P0-8A.
 *
 * Mesma ideia do `AuthFormShell`: as três páginas (`/termos`, `/privacidade`,
 * `/reembolso`) não podem divergir em tipografia, data de atualização nem no
 * rodapé de contato. O conteúdo mora em cada página; aqui só existe forma.
 *
 * Server Component — é texto, não precisa de JavaScript no cliente.
 */

/**
 * Data única das três páginas. Atualizar **aqui** ao mudar qualquer uma delas:
 * três datas separadas é como uma fica velha sem ninguém notar.
 */
export const LEGAL_UPDATED_AT = "12 de agosto de 2026";

interface LegalPageProps {
  title: string;
  intro: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="border-b border-stone-200 pb-6 dark:border-stone-800">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950 dark:text-white">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-stone-600 dark:text-stone-400">{intro}</p>
        <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
          Última atualização: {LEGAL_UPDATED_AT}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-8">{children}</div>

      <footer className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
          Ficou com dúvida?
        </h2>
        <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
          Fale com a gente antes de tomar qualquer decisão. A maior parte dos problemas de acesso
          se resolve em poucos minutos.
        </p>
        <SupportLink className="mt-3" variant="button" label="Falar com suporte no WhatsApp" />
        <nav className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-200 pt-4 text-sm dark:border-stone-800">
          <LegalNavLink href="/termos">Termos de uso</LegalNavLink>
          <LegalNavLink href="/privacidade">Política de privacidade</LegalNavLink>
          <LegalNavLink href="/reembolso">Política de reembolso</LegalNavLink>
          <LegalNavLink href="/precos">Planos e preços</LegalNavLink>
        </nav>
      </footer>
    </div>
  );
}

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

/** Um bloco de texto legal, com título. */
export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
        {children}
      </div>
    </section>
  );
}

/** Lista simples dentro de uma seção legal. */
export function LegalList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function LegalNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-rose-600 hover:underline dark:text-rose-400"
    >
      {children}
    </Link>
  );
}
