import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import { getAuthUser, isSupabaseConfigured } from "@/services/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Doce Margem",
  description:
    "Pare de vender doce no achismo. Descubra quanto custa produzir, quanto cobrar e qual margem sobra em cada venda.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A verificação roda no servidor com `getUser()` (revalida o JWT). O Header
  // recebe só um booleano — nunca o token, nunca o objeto de usuária.
  //
  // Ler cookies aqui torna as rotas dinâmicas (antes eram estáticas). É o preço
  // esperado de ter estado de sessão no cabeçalho; `getAuthUser` nunca lança, e
  // `authEnabled` deixa o app local funcionar normalmente sem Supabase.
  const authEnabled = isSupabaseConfigured();
  const user = authEnabled ? await getAuthUser() : null;

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <Header isAuthenticated={user !== null} authEnabled={authEnabled} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
