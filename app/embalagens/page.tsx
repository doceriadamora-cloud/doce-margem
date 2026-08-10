import type { Metadata } from "next";
import PackagingsScreen from "@/components/packagings/PackagingsScreen";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export const metadata: Metadata = {
  title: "Embalagens — Minha Fatia",
};

export default async function EmbalagensPage() {
  await requireEssentialAccess();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Embalagens
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Cadastre caixas, saquinhos, etiquetas e bandejas para incluir o custo real de cada uma no seu preço.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <PackagingsScreen />
      </div>
    </div>
  );
}
