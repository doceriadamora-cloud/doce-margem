import Dashboard from "@/components/dashboard/Dashboard";
import { requireEssentialAccess } from "@/lib/auth/require-access";

export default async function Home() {
  // Gating real (Fase 4-5B). Chamado antes de qualquer render: sem licença, a
  // resposta é um redirecionamento, e o conteúdo nunca chega a ser montado.
  //
  // O guarda falha fechado — sem Supabase configurado, ninguém entra. Não há
  // caminho em que env ausente vire acesso liberado (DECISIONS.md, 2026-08-06).
  await requireEssentialAccess();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Pare de vender doce no achismo.
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Acompanhe o que você já cadastrou e comece a descobrir o custo real de cada doce.
        </p>
      </header>
      <Dashboard />
    </div>
  );
}
