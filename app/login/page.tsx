import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { getAuthUser } from "@/services/supabase/server";

export const metadata: Metadata = {
  title: "Entrar — Doce Margem",
};

interface LoginPageProps {
  searchParams: Promise<{ erro?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Já logada não precisa ver a tela de login.
  const user = await getAuthUser();
  if (user !== null) redirect("/conta");

  const { erro } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12 sm:px-6">
      {erro === "confirmacao" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Não conseguimos confirmar seu e-mail. O link pode ter expirado — tente entrar ou criar a
          conta de novo.
        </p>
      )}
      <LoginForm />
    </div>
  );
}
