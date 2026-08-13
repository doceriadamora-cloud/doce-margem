import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/layout/Footer";
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
  title: "Minha Fatia",
  // Descrição padrão do site (busca e prévia de link). Mantida alinhada à
  // promessa aprovada na P0-7 e ao README: apoio à decisão, sem prometer lucro.
  description:
    "Organize seus custos e forme preços com mais clareza. Ferramenta de apoio à gestão e precificação para pequenos negócios de produção artesanal.",
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
        <Footer />
      </body>
    </html>
  );
}
