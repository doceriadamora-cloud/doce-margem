import type { Metadata } from "next";
import FixedCostForm from "@/components/fixed-costs/FixedCostForm";
import FixedCostList from "@/components/fixed-costs/FixedCostList";
import BusinessSettingsForm from "@/components/settings/BusinessSettingsForm";
import CustomChannelForm from "@/components/channels/CustomChannelForm";
import CustomChannelList from "@/components/channels/CustomChannelList";

export const metadata: Metadata = {
  title: "Configurações — Doce Margem",
};

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Configurações
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Cadastre seus custos fixos, estime o faturamento mensal e adicione canais de venda
          próprios — a tela de Precificação usa tudo isso automaticamente.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900 dark:text-stone-50">
            Custos fixos
          </h2>
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <FixedCostForm />
            <FixedCostList />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900 dark:text-stone-50">
            Faturamento e percentual de custo fixo
          </h2>
          <BusinessSettingsForm />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-stone-900 dark:text-stone-50">
            Canais de venda customizados
          </h2>
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <CustomChannelForm />
            <CustomChannelList />
          </div>
        </section>
      </div>
    </div>
  );
}
