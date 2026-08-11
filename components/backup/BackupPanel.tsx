"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  createBackupFileName,
  isStorageAvailable,
  parseBackupJson,
  saveImportedBackup,
  serializeBackup,
} from "@/services";
import { reloadCustomChannelsFromStorage } from "@/components/channels/channels-store";
import { reloadFixedCostsFromStorage } from "@/components/fixed-costs/fixed-costs-store";
import { reloadIngredientsFromStorage } from "@/components/ingredients/ingredients-store";
import { reloadPackagingsFromStorage } from "@/components/packagings/packagings-store";
import { reloadRecipesFromStorage } from "@/components/recipes/recipes-store";
import { reloadBusinessSettingsFromStorage } from "@/components/settings/business-settings-store";
import { reloadQuoteDraftFromStorage } from "@/components/quotes/quote-draft-store";
import { reloadQuoteIdentityFromStorage } from "@/components/quotes/quote-identity-store";

type Message = { type: "success" | "error"; text: string };

const IMPORT_CONFIRMATION =
  "Importar este backup vai substituir os dados atuais deste navegador. Deseja continuar?";

function reloadAllStoresFromStorage(): void {
  reloadIngredientsFromStorage();
  reloadPackagingsFromStorage();
  reloadRecipesFromStorage();
  reloadFixedCostsFromStorage();
  reloadCustomChannelsFromStorage();
  reloadBusinessSettingsFromStorage();
  reloadQuoteIdentityFromStorage();
  reloadQuoteDraftFromStorage();
}

export default function BackupPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setSelectedFile(event.target.files?.[0] ?? null);
    setMessage(null);
  }

  function handleExport(): void {
    setMessage(null);

    if (!isStorageAvailable()) {
      setMessage({
        type: "error",
        text: "O navegador bloqueou o armazenamento local. Não foi possível exportar os dados.",
      });
      return;
    }

    const fileName = createBackupFileName();
    const blob = new Blob([serializeBackup()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage({ type: "success", text: `Backup exportado: ${fileName}` });
  }

  async function handleImport(): Promise<void> {
    setMessage(null);

    if (!selectedFile) {
      setMessage({ type: "error", text: "Escolha um arquivo .json de backup para importar." });
      return;
    }

    setIsImporting(true);

    let fileText: string;
    try {
      fileText = await selectedFile.text();
    } catch {
      setIsImporting(false);
      setMessage({
        type: "error",
        text: "Não foi possível ler o arquivo escolhido. Tente selecionar o backup novamente.",
      });
      return;
    }

    const parsed = parseBackupJson(fileText);
    if (!parsed.ok) {
      setIsImporting(false);
      setMessage({ type: "error", text: parsed.message });
      return;
    }

    if (!window.confirm(IMPORT_CONFIRMATION)) {
      setIsImporting(false);
      return;
    }

    const persisted = saveImportedBackup(parsed.state);
    if (!persisted) {
      setIsImporting(false);
      setMessage({
        type: "error",
        text: "Não foi possível salvar o backup neste navegador. Confira se o armazenamento local está liberado.",
      });
      return;
    }

    reloadAllStoresFromStorage();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsImporting(false);
    setMessage({
      type: "success",
      text: "Backup importado. Seus dados foram atualizados neste navegador.",
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
              Exportar backup
            </h3>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Baixe uma cópia dos seus ingredientes, receitas, embalagens, custos fixos,
              canais, configurações, identidade visual e rascunho de orçamento.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="w-fit rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Exportar backup
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
              Importar backup
            </h3>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Use a importação apenas com arquivos de backup gerados pelo próprio Minha Fatia.
            </p>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-stone-700 dark:text-stone-300">
              Arquivo de backup (.json)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:file:bg-stone-800 dark:file:text-stone-200 dark:focus:ring-rose-950"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={isImporting || !selectedFile}
            className="w-fit rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 dark:disabled:bg-stone-700 dark:disabled:text-stone-400"
          >
            {isImporting ? "Importando..." : "Importar backup"}
          </button>
        </div>
      </div>

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
