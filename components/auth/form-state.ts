/**
 * Contrato compartilhado entre as Server Actions de auth e os formulários.
 *
 * Vive fora de `app/auth/actions.ts` por uma restrição do Next: um arquivo
 * marcado com `"use server"` só pode exportar **funções async**. Exportar o
 * objeto `initialAuthFormState` de lá quebra o build com
 * "A 'use server' file can only export async functions, found object".
 *
 * Sem `"use client"` nem `"use server"` de propósito: é um módulo neutro, que os
 * dois lados podem importar.
 */

export interface AuthFormState {
  status: "idle" | "error" | "info";
  message: string;
}

export const initialAuthFormState: AuthFormState = { status: "idle", message: "" };
