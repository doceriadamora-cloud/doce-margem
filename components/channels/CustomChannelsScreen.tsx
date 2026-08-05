"use client";

import { useState, useSyncExternalStore } from "react";
import {
  getCustomChannelsServerSnapshot,
  getCustomChannelsSnapshot,
  subscribeCustomChannels,
} from "./channels-store";
import CustomChannelForm from "./CustomChannelForm";
import CustomChannelList from "./CustomChannelList";

/**
 * Combina formulário + listagem de canais customizados com o estado de "qual
 * item está em edição agora" — Fase 2-7. Mesmo padrão de `IngredientsScreen.tsx`.
 */
export default function CustomChannelsScreen() {
  const customChannels = useSyncExternalStore(
    subscribeCustomChannels,
    getCustomChannelsSnapshot,
    getCustomChannelsServerSnapshot,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingChannel = editingId
    ? (customChannels.find((c) => c.id === editingId) ?? null)
    : null;

  return (
    <>
      <CustomChannelForm
        key={editingId ?? "new"}
        editingChannel={editingChannel}
        onDoneEditing={() => setEditingId(null)}
      />
      <CustomChannelList editingId={editingId} onEdit={setEditingId} />
    </>
  );
}
