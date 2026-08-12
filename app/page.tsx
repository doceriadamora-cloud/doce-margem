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
      <header className="mb-8 max-w-3xl">
        <p className="mb-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
          Gestão e precificação para produção artesanal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Organize seus custos e forme preços com mais clareza.
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600 dark:text-stone-400">
          O Minha Fatia ajuda confeiteiras, doceiras e pequenos negócios de produção e delivery
          artesanal a reunir ingredientes, receitas, embalagens e mão de obra antes de decidir
          quanto cobrar.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-stone-500 dark:text-stone-500">
          Siga o fluxo abaixo com os dados do seu negócio: o app organiza as informações e apoia
          sua decisão, sem prometer resultado ou lucro garantido.
        </p>
      </header>
      <Dashboard />
    </div>
  );
}
