import type { Metadata } from "next";
import IngredientsScreen from "@/components/ingredients/IngredientsScreen";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export const metadata: Metadata = {
  title: "Ingredientes — Minha Fatia",
};

export default async function IngredientesPage() {
  // Exige licença Essencial antes de renderizar (Fase 4-5B).
  await requireEssentialAccess();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Ingredientes
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Cadastre o que você compra e por quanto — a gente calcula o custo real de cada grama,
          mililitro ou unidade.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <IngredientsScreen />
      </div>
    </div>
  );
}
