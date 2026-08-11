import type { Metadata } from "next";
import RecipesScreen from "@/components/recipes/RecipesScreen";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export const metadata: Metadata = {
  title: "Receitas — Minha Fatia",
};

export default async function ReceitasPage() {
  // Exige licença Essencial antes de renderizar (Fase 4-5B).
  await requireEssentialAccess();

  return (
    <div className="recipe-page mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="recipe-print-hidden mb-8 max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Receitas
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Monte a ficha técnica com os ingredientes já cadastrados e descubra o custo total e o
          custo unitário de cada doce.
        </p>
      </header>
      <div className="recipe-layout grid gap-6 lg:grid-cols-[380px_1fr]">
        <RecipesScreen />
      </div>
    </div>
  );
}
