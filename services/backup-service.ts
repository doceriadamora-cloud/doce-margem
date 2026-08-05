import type { AppState } from "@/types/app-state";
import {
  APP_STATE_SCHEMA_VERSION,
  loadAppState,
  normalizeAppState,
  saveAppState,
} from "./storage-service";

export const BACKUP_APP_NAME = "Doce Margem";
export const BACKUP_FORMAT_VERSION = 1;

export interface DoceMargemBackup {
  appName: typeof BACKUP_APP_NAME;
  backupVersion: typeof BACKUP_FORMAT_VERSION;
  schemaVersion: number;
  updatedAt: string;
  exportedAt: string;
  data: AppState;
}

export type BackupParseResult =
  | { ok: true; state: AppState }
  | { ok: false; message: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatDateForFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createBackupPayload(exportedAt = new Date()): DoceMargemBackup {
  const state = loadAppState();
  return {
    appName: BACKUP_APP_NAME,
    backupVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: state.schemaVersion,
    updatedAt: state.updatedAt,
    exportedAt: exportedAt.toISOString(),
    data: state,
  };
}

export function serializeBackup(payload = createBackupPayload()): string {
  return JSON.stringify(payload, null, 2);
}

export function createBackupFileName(date = new Date()): string {
  return `doce-margem-backup-${formatDateForFileName(date)}.json`;
}

export function parseBackupJson(text: string): BackupParseResult {
  if (text.trim() === "") {
    return { ok: false, message: "O arquivo está vazio. Escolha um backup em JSON." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: "Não foi possível ler este arquivo. Confira se ele é um JSON válido.",
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      message: "Este arquivo não parece ser um backup do Doce Margem.",
    };
  }

  if (parsed.appName !== BACKUP_APP_NAME) {
    return {
      ok: false,
      message: "Use apenas arquivos de backup gerados pelo próprio Doce Margem.",
    };
  }

  if (typeof parsed.exportedAt !== "string" || Number.isNaN(new Date(parsed.exportedAt).getTime())) {
    return {
      ok: false,
      message: "Este backup não tem uma data de exportação válida.",
    };
  }

  if (
    parsed.backupVersion !== undefined &&
    parsed.backupVersion !== BACKUP_FORMAT_VERSION
  ) {
    return {
      ok: false,
      message: "Este backup foi gerado em um formato que esta versão ainda não consegue importar.",
    };
  }

  const rawState = isPlainObject(parsed.data) ? parsed.data : parsed;

  if (typeof rawState.schemaVersion !== "number") {
    return {
      ok: false,
      message: "Este backup não tem uma versão de dados compatível.",
    };
  }

  if (rawState.schemaVersion !== APP_STATE_SCHEMA_VERSION) {
    return {
      ok: false,
      message: "Este backup é de uma versão de dados diferente da versão atual do app.",
    };
  }

  return { ok: true, state: normalizeAppState(rawState) };
}

export function saveImportedBackup(state: AppState): boolean {
  return saveAppState(state);
}
