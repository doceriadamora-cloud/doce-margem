/**
 * Caminhos das telas de autenticação — Fase P0-8A.
 *
 * Módulo neutro (sem `"use client"` nem `"use server"`), pelo mesmo motivo de
 * `form-state.ts`: é importado tanto pelas Server Actions quanto por componentes
 * de cliente, e um arquivo `"use server"` só pode exportar funções async.
 *
 * Existe para o `redirectTo` mandado ao Supabase e o destino do resgate de hash
 * não poderem divergir — se essas duas strings discordarem, o link do e-mail
 * cai numa tela que não sabe consumi-lo.
 */

/** Onde a usuária pede um link de nova senha. */
export const FORGOT_PASSWORD_PATH = "/auth/esqueci-senha";

/** Onde ela define a nova senha, depois de clicar no link do e-mail. */
export const NEW_PASSWORD_PATH = "/auth/nova-senha";

/** Onde quem comprou define a primeira senha (Fase 4-7G-convite). */
export const ACCEPT_INVITE_PATH = "/auth/accept-invite";
