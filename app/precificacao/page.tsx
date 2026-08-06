import type { Metadata } from "next";
import PricingForm from "@/components/pricing/PricingForm";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export const metadata: Metadata = {
  title: "Precificação — Doce Margem",
};

export default async function PrecificacaoPage() {
  // Exige licença Essencial antes de renderizar (Fase 4-5B).
  await requireEssentialAccess();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Precificação
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Escolha uma receita e descubra quanto custa, por quanto vender e quanto sobra de lucro.
        </p>
      </header>
      <PricingForm />
    </div>
  );
}
