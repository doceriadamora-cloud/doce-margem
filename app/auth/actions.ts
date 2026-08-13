"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/services/supabase/server";
import type { AuthFormState } from "@/components/auth/form-state";
import { NEW_PASSWORD_PATH } from "@/components/auth/auth-routes";

/**
 * Server Actions de autenticação — Fase 4-1B.
 *
 * Tudo roda no servidor: a senha nunca passa por código de cliente nosso, e os
 * cookies de sessão são gravados server-side pelo `@supabase/ssr`. Por isso esta
 * fase não precisa de um client Supabase de browser.
 *
 * Nenhuma action usa `SUPABASE_SERVICE_ROLE_KEY` — login e cadastro rodam com a
 * chave anônima, sujeitos à RLS, como qualquer usuária.
 *
 * Este arquivo só exporta funções async: é o que um módulo `"use server"`
 * permite. O tipo e o estado inicial do formulário moram em
 * `components/auth/form-state.ts`.
 */

const SUPABASE_OFF_MESSAGE =
  "O acesso por conta ainda não está configurado neste ambiente. Seus dados locais continuam funcionando normalmente.";

/**
 * Mensagem propositalmente genérica em falha de login.
 *
 * Dizer "este e-mail não existe" permitiria descobrir quem tem conta no app
 * (enumeração de e-mail). O custo é uma mensagem menos específica; o ganho é não
 * vazar a base de usuárias.
 */
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos.";

function readText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

/** Forma mínima do erro do Supabase Auth que precisamos inspecionar. */
interface SupabaseAuthErrorish {
  code?: string;
  status?: number;
  message: string;
}

/**
 * Conta existe, mas o e-mail nunca foi confirmado.
 * Checa `code` e, como reserva, a mensagem — o campo `code` foi adicionado ao
 * `AuthError` depois, e não queremos depender só dele.
 */
function isEmailNotConfirmedError(error: SupabaseAuthErrorish): boolean {
  return (
    error.code === "email_not_confirmed" ||
    error.message.toLowerCase().includes("not confirmed")
  );
}

/** Supabase limita reenvios de e-mail por segurança; devolve 429. */
function isRateLimitError(error: SupabaseAuthErrorish): boolean {
  return error.status === 429 || (error.code ?? "").includes("rate_limit");
}

/** Cadastro com e-mail/senha. `full_name` é opcional e vai para o metadata. */
export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readText(formData, "email");
  const password = formData.get("password");
  const fullName = readText(formData, "fullName");

  if (email === "" || typeof password !== "string" || password === "") {
    return { status: "error", message: "Informe e-mail e senha." };
  }
  if (password.length < 6) {
    return { status: "error", message: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const supabase = await createSupabaseServerClient();
  if (supabase === null) {
    return { status: "error", message: SUPABASE_OFF_MESSAGE };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Vira `raw_user_meta_data` em auth.users — de onde o trigger
      // `handle_new_user` (migration 0001) lê o nome para `profiles.full_name`.
      data: fullName === "" ? {} : { full_name: fullName },
      ...(appUrl === "" ? {} : { emailRedirectTo: `${appUrl}/auth/callback` }),
    },
  });

  if (error !== null) {
    if (isRateLimitError(error)) {
      return {
        status: "error",
        message: "Muitas tentativas seguidas. Espere alguns segundos e tente de novo.",
      };
    }
    return {
      status: "error",
      message: "Não foi possível criar a conta. Confira os dados e tente de novo.",
    };
  }

  // Confirmação de e-mail DESLIGADA no projeto: já vem sessão, entra direto.
  if (data.session !== null) {
    redirect("/conta");
  }

  // Confirmação LIGADA (ou e-mail já cadastrado — o Supabase devolve
  // `identities: []` nesse caso, de propósito, para não revelar que a conta
  // existe). Nos dois casos a mensagem é a mesma, o que evita enumeração.
  return {
    status: "info",
    message: "Confira seu e-mail para confirmar a conta. Se já tiver conta, use a tela de entrar.",
  };
}

/** Login com e-mail/senha. */
export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readText(formData, "email");
  const password = formData.get("password");

  if (email === "" || typeof password !== "string" || password === "") {
    return { status: "error", message: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  if (supabase === null) {
    return { status: "error", message: SUPABASE_OFF_MESSAGE };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error !== null) {
    // Exceção deliberada à mensagem genérica: "e-mail não confirmado" é um
    // estado que a própria usuária criou e precisa resolver. Dizer "senha
    // inválida" aqui a manda caçar um problema que não existe. O vazamento é
    // pequeno (revela que há cadastro pendente para este e-mail) e o ganho de
    // clareza é grande — sem isso, vira chamado de suporte.
    if (isEmailNotConfirmedError(error)) {
      return {
        status: "info",
        message:
          "Falta confirmar seu e-mail. Procure a mensagem de confirmação que enviamos e clique no link.",
      };
    }
    return { status: "error", message: INVALID_CREDENTIALS_MESSAGE };
  }

  redirect("/conta");
}

/**
 * Define a senha de quem chegou por convite — Fase 4-7G-convite.
 *
 * Roda **depois** de `AcceptInviteClient` ter criado a sessão a partir do hash.
 * A senha vai por `FormData` direto para o servidor, como no login: nunca passa
 * por estado de cliente nosso, nunca aparece em log.
 *
 * A sessão é revalidada com `getUser()` antes da troca — e não `getSession()`,
 * que só lê o cookie e é forjável. Sem isso, um cookie fabricado permitiria
 * trocar a senha de outra pessoa, que é o pior defeito que esta função poderia
 * ter.
 */
export async function setInvitedPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = formData.get("password");
  const confirmation = formData.get("passwordConfirm");

  if (typeof password !== "string" || password === "") {
    return { status: "error", message: "Informe uma senha." };
  }
  if (password.length < 6) {
    return { status: "error", message: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (password !== confirmation) {
    return { status: "error", message: "As duas senhas não são iguais." };
  }

  const supabase = await createSupabaseServerClient();
  if (supabase === null) {
    return { status: "error", message: SUPABASE_OFF_MESSAGE };
  }

  const { data, error: sessionError } = await supabase.auth.getUser();
  if (sessionError !== null || data.user === null) {
    return {
      status: "error",
      message:
        "Seu convite expirou antes de você salvar a senha. Abra o link do e-mail de novo, ou peça um novo convite.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error !== null) {
    return {
      status: "error",
      message: "Não foi possível salvar a senha. Tente outra, com pelo menos 6 caracteres.",
    };
  }

  redirect("/conta");
}

/**
 * Pede o link de nova senha — Fase P0-8A.
 *
 * A auditoria P0-8 registrou isto como bloqueador: quem comprava, criava a
 * senha pelo convite e a esquecia ficava permanentemente fora de um produto
 * pago, sem caminho nenhum dentro do app.
 *
 * **A resposta é sempre a mesma, exista ou não a conta.** Dizer "não achamos
 * este e-mail" transformaria esta tela num verificador de base de usuárias, e
 * ela é pública. O Supabase segue a mesma regra do lado dele: `resetPasswordForEmail`
 * devolve sucesso para endereço desconhecido, sem enviar nada.
 *
 * A única exceção é o limite de tentativas, que não revela existência nenhuma —
 * vale para o endpoint, não para o endereço — e cuja mensagem específica evita
 * a usuária pedir o link cinco vezes achando que ele vem.
 */
export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readText(formData, "email");
  if (email === "") {
    return { status: "error", message: "Informe o e-mail que você usa para entrar." };
  }

  const supabase = await createSupabaseServerClient();
  if (supabase === null) {
    return { status: "error", message: SUPABASE_OFF_MESSAGE };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Sem `NEXT_PUBLIC_APP_URL` o Supabase usa o Site URL do painel. O hash cai
    // em `/login`, onde `InviteHashRescue` reconhece `type=recovery` e
    // reencaminha para cá — o fluxo se conserta sozinho em vez de travar.
    ...(appUrl === "" ? {} : { redirectTo: `${appUrl}${NEW_PASSWORD_PATH}` }),
  });

  if (error !== null && isRateLimitError(error)) {
    return {
      status: "error",
      message: "Muitas tentativas seguidas. Espere alguns minutos antes de pedir outro link.",
    };
  }

  return {
    status: "info",
    message:
      "Se existir uma conta com este e-mail, o link para criar uma nova senha já está a caminho. Confira também a caixa de spam ou lixo eletrônico.",
  };
}

/**
 * Salva a nova senha de quem chegou pelo link de recuperação — Fase P0-8A.
 *
 * Gêmea de `setInvitedPasswordAction`, e **de propósito não compartilha código
 * com ela**: são os dois momentos em que uma senha nasce, e cada um tem a sua
 * mensagem de expiração. Unificá-las economizaria dez linhas e criaria um ponto
 * onde um ajuste na recuperação quebra, sem aviso, a entrega de quem acabou de
 * comprar — o fluxo mais caro do produto.
 *
 * A sessão é revalidada com `getUser()` antes da troca, nunca `getSession()`:
 * cookie é forjável, e sem essa checagem um cookie fabricado trocaria a senha de
 * outra pessoa.
 */
export async function setRecoveryPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = formData.get("password");
  const confirmation = formData.get("passwordConfirm");

  if (typeof password !== "string" || password === "") {
    return { status: "error", message: "Informe uma senha." };
  }
  if (password.length < 6) {
    return { status: "error", message: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (password !== confirmation) {
    return { status: "error", message: "As duas senhas não são iguais." };
  }

  const supabase = await createSupabaseServerClient();
  if (supabase === null) {
    return { status: "error", message: SUPABASE_OFF_MESSAGE };
  }

  const { data, error: sessionError } = await supabase.auth.getUser();
  if (sessionError !== null || data.user === null) {
    return {
      status: "error",
      message:
        "Este link de recuperação expirou antes de você salvar a senha. Peça um novo link e tente de novo.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error !== null) {
    return {
      status: "error",
      message: "Não foi possível salvar a senha. Tente outra, com pelo menos 6 caracteres.",
    };
  }

  redirect("/conta");
}

/** Encerra a sessão e volta para a home. */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase !== null) {
    await supabase.auth.signOut();
  }
  redirect("/");
}
