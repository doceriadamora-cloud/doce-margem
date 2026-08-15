"use client";

import { useState, useSyncExternalStore } from "react";
import ClientForm from "./ClientForm";
import ClientList from "./ClientList";
import {
  getClientsServerSnapshot,
  getClientsSnapshot,
  subscribeClients,
} from "./clients-store";

/**
 * Combina formulário e listagem de clientes com o estado de "qual cliente está
 * em edição agora" — mesmo padrão de `IngredientsScreen` (Fase 2-7).
 */
export default function ClientsScreen() {
  const clients = useSyncExternalStore(
    subscribeClients,
    getClientsSnapshot,
    getClientsServerSnapshot,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingClient = editingId
    ? (clients.find((client) => client.id === editingId) ?? null)
    : null;

  return (
    <>
      <ClientForm
        key={editingId ?? "new"}
        editingClient={editingClient}
        onDoneEditing={() => setEditingId(null)}
      />
      <ClientList editingId={editingId} onEdit={setEditingId} />
    </>
  );
}
