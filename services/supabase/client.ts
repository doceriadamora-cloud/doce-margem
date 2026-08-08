import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase de **navegador** — Fase 4-7G-convite.
 *
 * Primeiro client-side do projeto. Até aqui tudo passava pelo servidor
 * (`server.ts` com cookies, `admin.ts` com service role) porque login e cadastro
 * são Server Actions. O fluxo de convite mudou isso por um motivo técnico
 * inescapável: o Supabase entrega os tokens no **fragment** da URL
 * (`#access_token=…`), e **fragment não é enviado ao servidor** — nenhum Server
 * Component consegue lê-lo. Só JavaScript de navegador enxerga aquilo.
 *
 * Usa a chave **anônima**, sujeita à RLS como qualquer visitante.
 * `SUPABASE_SERVICE_ROLE_KEY` não é lida aqui — nem poderia: sem prefixo
 * `NEXT_PUBLIC_`, ela não existe no bundle, e com o prefixo vazaria para
 * qualquer pessoa que abrisse o DevTools.
 *
 * `createBrowserClient` do `@supabase/ssr` grava a sessão em **cookies**, não em
 * `localStorage`. É isso que faz o DAL do servidor enxergar a sessão criada aqui
 * — com o storage padrão do `supabase-js`, a sessão ficaria presa no navegador e
 * as rotas protegidas continuariam recusando a usuária.
 */

/**
 * `null` quando o Supabase não está configurado — mesmo contrato de
 * `server.ts`. Quem chama decide o que exibir; nada aqui lança.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createBrowserClient(url, anonKey, {
    auth: {
      // Desligado de propósito. A detecção automática competiria com a leitura
      // manual do hash na tela de convite, e duas rotinas disputando o mesmo
      // fragment produzem uma corrida cujo vencedor muda a cada carregamento.
      // Ler o hash explicitamente é determinístico e testável.
      detectSessionInUrl: false,
    },
  });
}
