"use client";

import { useSyncExternalStore } from "react";
import {
  getCustomChannelsServerSnapshot,
  getCustomChannelsSnapshot,
  removeCustomChannel,
  subscribeCustomChannels,
} from "./channels-store";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface CustomChannelListProps {
  /** Id do canal sendo editado agora (destaca a linha), ou `null`. */
  editingId?: string | null;
  /** Chamado quando a usuária clica "Editar" numa linha. */
  onEdit: (id: string) => void;
}

/** Lista os canais de venda customizados (a biblioteca padrão da Fase 1C-1 não aparece aqui). */
export default function CustomChannelList({ editingId = null, onEdit }: CustomChannelListProps) {
  const customChannels = useSyncExternalStore(
    subscribeCustomChannels,
    getCustomChannelsSnapshot,
    getCustomChannelsServerSnapshot,
  );

  if (customChannels.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="font-medium text-stone-900 dark:text-stone-50">
          Nenhum canal customizado cadastrado ainda
        </p>
        <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">
          Os canais padrão (Balcão/Pix, iFood, Rappi...) já aparecem na tela de Precificação. Use
          este formulário só para canais próprios, fora da biblioteca padrão.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {customChannels.map((channel) => (
        <li
          key={channel.id}
          className={`flex items-start justify-between gap-3 rounded-2xl border bg-white p-4 dark:bg-stone-900 ${
            channel.id === editingId
              ? "border-rose-300 ring-2 ring-rose-100 dark:border-rose-700 dark:ring-rose-950"
              : "border-stone-200 dark:border-stone-800"
          }`}
        >
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-50">{channel.name}</p>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              Comissão {channel.commissionPercent}% · Pagamento {channel.paymentPercent}% · Taxa
              fixa {formatCurrency(channel.fixedFee)}
              {channel.adPercent > 0 && ` · Anúncio ${channel.adPercent}%`}
              {channel.monthlyFee > 0 && ` · Mensalidade ${formatCurrency(channel.monthlyFee)}`}
            </p>
            {channel.notes && (
              <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">{channel.notes}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onEdit(channel.id)}
              className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-rose-800 dark:hover:bg-rose-950 dark:hover:text-rose-300"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Tem certeza que deseja excluir este canal?")) return;
                removeCustomChannel(channel.id);
              }}
              className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
            >
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
