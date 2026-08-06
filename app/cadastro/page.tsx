import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignupForm from "@/components/auth/SignupForm";
import { getAuthUser } from "@/services/supabase/server";

export const metadata: Metadata = {
  title: "Criar conta — Doce Margem",
};

export default async function CadastroPage() {
  const user = await getAuthUser();
  if (user !== null) redirect("/conta");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12 sm:px-6">
      <SignupForm />
    </div>
  );
}
