"use client";

import { useState, type FormEvent } from "react";
import type { Client } from "@/types/quotes";
import { addClient, updateClient, type ClientInput } from "./clients-store";

/**
 * Cadastro e edição de cliente — Fase P0-11.
 *
 * Edição reaproveita o mesmo formulário pelo truque de `key`-remount usado
 * desde a Fase 2-7: o componente pai renderiza
 * `<ClientForm key={editingClient?.id ?? "new"} .../>`.
 *
 * Só duas informações são obrigatórias — nome e WhatsApp. Cobrar mais do que
 * isso para guardar uma cliente é atrito num cadastro que a confeiteira vai
 * fazer no meio do atendimento.
 */

interface ClientFormProps {
  editingClient?: Client | null;
  onDoneEditing?: () => void;
}

export default function ClientForm({
  editingClient = null,
  onDoneEditing = () => {},
}: ClientFormProps) {
  const [name, setName] = useState(editingClient?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(editingClient?.whatsapp ?? "");
  const [email, setEmail] = useState(editingClient?.email ?? "");
  const [address, setAddress] = useState(editingClient?.address ?? "");
  const [notes, setNotes] = useState(editingClient?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  function resetForm(): void {
    setName("");
    setWhatsapp("");
    setEmail("");
    setAddress("");
    setNotes("");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName === "") {
      setError("Informe o nome da cliente.");
      return;
    }
    if (whatsapp.trim() === "") {
      setError("Informe o WhatsApp — é por ele que você vai enviar o orçamento.");
      return;
    }

    const input: ClientInput = {
      name: trimmedName,
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
    };

    if (editingClient) {
      updateClient(editingClient.id, input);
      onDoneEditing();
      return;
    }

    addClient(input);
    resetForm();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
        {editingClient ? "Editar cliente" : "Cadastrar cliente"}
      </h2>

      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {error}
        </p>
      )}

      <Field label="Nome">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Maria da Silva"
          className={inputClass}
        />
      </Field>

      <Field label="WhatsApp" hint="Com DDD. Ex.: 21999999999">
        <input
          type="tel"
          inputMode="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="21999999999"
          className={inputClass}
        />
      </Field>

      <Field label="E-mail (opcional)">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maria@email.com"
          className={inputClass}
        />
      </Field>

      <Field label="Endereço ou bairro (opcional)" hint="Ajuda a organizar entregas.">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex.: Campo Grande"
          className={inputClass}
        />
      </Field>

      <Field
        label="Observações internas (opcional)"
        hint="Só você vê. Nunca aparece no orçamento enviado à cliente."
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Ex.: prefere retirada pela manhã."
          className={`${inputClass} min-h-20 resize-y`}
        />
      </Field>

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
        >
          {editingClient ? "Salvar alterações" : "Cadastrar cliente"}
        </button>
        {editingClient && (
          <button
            type="button"
            onClick={onDoneEditing}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancelar edição
          </button>
        )}
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
      {hint && <span className="text-xs text-stone-400 dark:text-stone-500">{hint}</span>}
    </label>
  );
}
