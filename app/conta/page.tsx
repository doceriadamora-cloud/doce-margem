import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { createSupabaseServerClient, getAuthUser } from "@/services/supabase/server";

export const metadata: Metadata = {
  title: "Minha conta — Doce Margem",
};

/**
 * Forma esperada das linhas lidas. Sem tipos gerados do banco ainda
 * (`supabase gen types`), então declaramos o mínimo que a tela usa e tratamos
 * qualquer coisa fora disso como ausente.
 */
interface ProfileRow {
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

interface AccessFlagsRow {
  is_blocked: boolean | null;
}

export default async function ContaPage() {
  const user = await getAuthUser();
  if (user === null) redirect("/login");

  const supabase = await createSupabaseServerClient();

  // As duas consultas passam pela RLS da migration 0001: cada usuária só
  // enxerga a própria linha. Erro de rede/permissão vira `null` — a tela
  // degrada em vez de quebrar.
  let profile: ProfileRow | null = null;
  let flags: AccessFlagsRow | null = null;

  if (supabase !== null) {
    const [profileResult, flagsResult] = await Promise.all([
      supabase.from("profiles").select("email, full_name, created_at").eq("id", user.id).maybeSingle(),
      supabase.from("user_access_flags").select("is_blocked").eq("user_id", user.id).maybeSingle(),
    ]);
    profile = (profileResult.data as ProfileRow | null) ?? null;
    flags = (flagsResult.data as AccessFlagsRow | null) ?? null;
  }

  const displayEmail = profile?.email ?? user.email ?? "—";
  const displayName = profile?.full_name ?? null;
  const isBlocked = flags?.is_blocked === true;
  const profileMissing = profile === null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Minha conta
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Seus dados de acesso ao Doce Margem.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {isBlocked && (
          <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            Sua conta está bloqueada. Fale com o suporte para entender o motivo.
          </p>
        )}

        {profileMissing && (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Não conseguimos carregar seu perfil agora. Seus dados de login estão certos — tente
            recarregar a página.
          </p>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-stone-400 dark:text-stone-500">E-mail</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">{displayEmail}</dd>
            </div>
            {displayName !== null && (
              <div>
                <dt className="text-xs text-stone-400 dark:text-stone-500">Nome</dt>
                <dd className="font-medium text-stone-800 dark:text-stone-200">{displayName}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-stone-400 dark:text-stone-500">Status da conta</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">
                {isBlocked ? "Bloqueada" : "Ativa"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
            Plano e licença
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Ainda não implementado. Por enquanto o Doce Margem funciona localmente no seu navegador,
            sem depender de plano — todos os seus ingredientes, receitas e cálculos continuam onde
            sempre estiveram.
          </p>
        </section>

        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
