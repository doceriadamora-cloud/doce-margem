import type { Metadata } from "next";
import RecipeForm from "@/components/recipes/RecipeForm";
import RecipeList from "@/components/recipes/RecipeList";

export const metadata: Metadata = {
  title: "Receitas — Doce Margem",
};

export default function ReceitasPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Receitas
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Monte a ficha técnica com os ingredientes já cadastrados e descubra o custo total e o
          custo unitário de cada doce.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <RecipeForm />
        <RecipeList />
      </div>
    </div>
  );
}
