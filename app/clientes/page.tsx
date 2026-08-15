import type { Metadata } from "next";
import ClientsScreen from "@/components/clients/ClientsScreen";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export const metadata: Metadata = {
  title: "Clientes — Minha Fatia",
};

export default async function ClientesPage() {
  // Exige licença Essencial antes de renderizar, como as demais telas do app.
  await requireEssentialAccess();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Clientes
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Guarde quem compra com você para montar orçamentos sem redigitar nome e contato toda
          vez. As observações internas ficam só para você — nunca aparecem no documento enviado à
          cliente.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <ClientsScreen />
      </div>
    </div>
  );
}
