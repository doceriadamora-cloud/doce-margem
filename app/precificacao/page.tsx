import type { Metadata } from "next";
import PricingForm from "@/components/pricing/PricingForm";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export const metadata: Metadata = {
  title: "Precificação — Minha Fatia",
};

export default async function PrecificacaoPage() {
  // Exige licença Essencial antes de renderizar (Fase 4-5B).
  await requireEssentialAccess();

  return (
    <div className="pricing-page mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="pricing-print-hidden mb-8 max-w-lg">
        <p className="mb-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
          Etapa 4 de 5
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Precificação
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Escolha uma receita, inclua embalagens e mão de obra e descubra por quanto vender. A
          Ficha interna de precificação fica disponível com o resultado.
        </p>
      </header>
      <PricingForm />
    </div>
  );
}
