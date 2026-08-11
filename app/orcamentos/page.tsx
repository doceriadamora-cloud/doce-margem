import type { Metadata } from "next";
import QuoteBuilder from "@/components/quotes/QuoteBuilder";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export const metadata: Metadata = {
  title: "Orçamentos — Minha Fatia",
};

export default async function OrcamentosPage() {
  await requireEssentialAccess();

  return (
    <div className="quote-page mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="quote-print-hidden mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
          Etapa 5 de 5
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Orçamentos
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Monte um orçamento comercial para o cliente com itens e valores finais. Custos internos
          permanecem fora do documento.
        </p>
      </header>
      <QuoteBuilder />
    </div>
  );
}
