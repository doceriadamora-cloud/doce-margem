import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/services/supabase/server";

/**
 * Callback de confirmação de e-mail — Fase 4-1B.
 *
 * O Supabase manda a usuária para cá com um `code` depois que ela clica no link
 * do e-mail. Trocamos o code por uma sessão (Route Handler pode gravar cookies)
 * e seguimos para `/conta`.
 *
 * Roda com a chave anônima, como todo o resto desta fase.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // `next` só é aceito como caminho relativo — um `next=https://site-malicioso`
  // viraria um open redirect.
  const rawNext = searchParams.get("next") ?? "/conta";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/conta";

  if (code !== null) {
    const supabase = await createSupabaseServerClient();
    if (supabase !== null) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error === null) {
        return NextResponse.redirect(new URL(next, origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/login?erro=confirmacao", origin));
}
