import Dashboard from "@/components/dashboard/Dashboard";

export default function Home() {
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
