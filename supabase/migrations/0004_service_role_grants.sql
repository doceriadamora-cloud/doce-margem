-- =============================================================================
-- 0004_service_role_grants.sql — Fase 4-7C-fix: privilégios do service_role
-- =============================================================================
--
-- Depende de 0001, 0002 e 0003. **Não altera nenhuma delas.**
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUE ESTA MIGRATION EXISTE
--
-- `service_role` tem o atributo BYPASSRLS: ele ignora *policies* de Row Level
-- Security. Isso NÃO o torna superusuário — **privilégio de tabela (GRANT)
-- continua valendo para ele exatamente como para qualquer outro papel.**
--
-- São dois mecanismos ortogonais. O projeto já tinha essa distinção correta
-- para `authenticated` desde a Fase 4-1A ("RLS decide QUAIS LINHAS, GRANT decide
-- QUAIS COLUNAS") e a esqueceu para `service_role`.
--
-- Resultado: as migrations 0001, 0002 e 0003 não concedem **nenhum** privilégio
-- a `service_role`. Ninguém notou por quatro subfases porque, até a 4-7C, todo
-- acesso ao banco usava a chave anônima. O primeiro código a usar a service role
-- — o webhook da Kiwify — falhou com:
--
--     42501  permission denied for table webhook_events
--     hint:  GRANT INSERT ON public.webhook_events TO service_role;
--
-- O mesmo erro aparece em `licenses` e `user_access_flags`.
--
-- ⚠️ Dois comentários nas migrations antigas afirmam o contrário e estão
--    ERRADOS — não podem ser corrigidos aqui (regra: não alterar migrations
--    antigas), então ficam registrados como falsos neste cabeçalho:
--      • 0002_licenses.sql, linha 366 — "sendo superusuário efetivo no
--        Supabase, não depende de grant explícito"
--      • 0003_webhook_support.sql, linha 342 — mesma afirmação
-- ─────────────────────────────────────────────────────────────────────────────
--
-- PRINCÍPIO: privilégio mínimo, tabela por tabela, verbo por verbo. Nada de
-- `grant all`. Nada para `anon`. Nada para `authenticated` — o acesso do cliente
-- foi decidido nas migrations 0001/0002/0003 e **não muda aqui**.
--
-- Esta migration NÃO cria policy, NÃO remove RLS e NÃO mexe em tabela nenhuma:
-- só concede privilégios.
--
-- Como aplicar (execução manual, deliberadamente NÃO automatizada):
--   supabase db push                         # via CLI, ou
--   cole no SQL Editor do painel             # depois de 0003
--
-- Idempotência: `GRANT` é idempotente por natureza — reconceder é no-op.
-- =============================================================================


-- =============================================================================
-- 1. ACESSO AO SCHEMA
-- =============================================================================
--
-- Pré-requisito de tudo: sem USAGE no schema, nenhum privilégio de tabela
-- funciona, e o erro é o mesmo 42501 — o que torna o diagnóstico confuso.
-- Conceder explicitamente custa nada e elimina a dúvida.
--
-- USAGE não dá acesso a dado nenhum: só permite *enxergar* os objetos do schema.
-- O que pode ser lido ou escrito continua sendo decidido tabela a tabela abaixo.
grant usage on schema public to service_role;


-- =============================================================================
-- 2. PRIVILÉGIOS POR TABELA
-- =============================================================================
--
-- Nenhum `grant all`: cada verbo abaixo existe porque um fluxo concreto precisa
-- dele. O que não está listado é negação deliberada, não esquecimento.

-- 2.1 profiles — SOMENTE LEITURA.
--
-- O webhook recebe o e-mail da compra e precisa achar a usuária. Só isso.
--
-- Sem `insert`: perfil nasce pelo trigger `handle_new_user` (0001), que é
-- SECURITY DEFINER e roda com o papel do dono — não depende deste grant.
-- Sem `update`/`delete`: nenhum fluxo de webhook ou admin previsto altera dado
-- de perfil, e conceder abriria a porta para editar e-mail alheio, que é
-- justamente a chave de identificação da compra.
grant select on public.profiles to service_role;


-- 2.2 webhook_events — leitura, escrita e atualização de estado.
--
-- `insert` grava o webhook recebido. `update` é obrigatório porque a linha
-- MUDA DE ESTADO ao longo do processamento:
--     received → processed | ignored | failed   (+ processed_at, error_message)
-- Esta é a diferença registrada na 0003 entre esta tabela e license_events.
--
-- Sem `delete`: apagar log de webhook é operação de exceção (LGPD) e deve
-- passar por acesso administrativo direto ao banco, com intenção explícita —
-- não por código de aplicação.
grant select, insert, update on public.webhook_events to service_role;


-- 2.3 licenses — o coração comercial.
--
-- `insert` para compra aprovada. `update` para reembolso, chargeback,
-- cancelamento, expiração e renovação do Pro.
--
-- Sem `delete`, e isso é regra de negócio, não descuido: licença revogada vira
-- `status = 'refunded'`, nunca some. Uma licença apagada destrói a resposta para
-- "esta pessoa já teve acesso?" — pergunta que aparece em disputa de chargeback.
grant select, insert, update on public.licenses to service_role;


-- 2.4 license_events — auditoria: escreve, nunca reescreve.
--
-- `insert` para registrar cada mudança de licença. **Sem `update`, de
-- propósito.** O trigger `license_events_immutable` (0002) já bloqueia UPDATE
-- para todos, inclusive service_role — conceder o privilégio não daria poder
-- nenhum, mas passaria a impressão de que a auditoria é editável. O privilégio
-- ausente e o trigger dizem a mesma coisa, e é isso que se quer.
--
-- Sem `delete`: o trigger permite DELETE a papéis administrativos para atender
-- pedido de apagamento (LGPD), e é assim que deve ser feito — via acesso
-- administrativo, não pela aplicação.
grant select, insert on public.license_events to service_role;


-- 2.5 user_access_flags — bloqueio manual (Fase 7).
--
-- `update` para bloquear/desbloquear. `select` para o admin ver o estado atual.
--
-- Sem `insert`: a linha nasce junto com a conta, pelo trigger `handle_new_user`
-- (0001), com `on conflict do nothing`.
-- ⚠️ Consequência conhecida: se algum perfil existir SEM linha em
--    user_access_flags (conta criada antes do trigger, ou importada), o UPDATE
--    de bloqueio não afeta linha nenhuma e **falha em silêncio** — o admin veria
--    "sucesso" e a conta seguiria liberada. Ver a checagem da seção 3.
grant select, update on public.user_access_flags to service_role;


-- =============================================================================
-- 3. FUNÇÕES DE ACESSO — mesma falha, em outro lugar
-- =============================================================================
--
-- A 0002 revogou EXECUTE das funções internas de `public, anon, authenticated`.
-- Revogar de PUBLIC remove o default do Postgres (que concede EXECUTE a PUBLIC
-- em toda função nova), e `service_role` **não é dono destas funções** — logo,
-- hoje ele também não consegue executá-las.
--
-- É exatamente o mesmo engano da seção 2, aplicado a funções. E contraria o que
-- a própria 0002 declara como projeto: "Usadas por service_role (admin, Fase 7)".
--
-- Sem estes grants, a área admin da Fase 7 não conseguiria responder "esta
-- usuária tem acesso?" sem reimplementar a regra em TypeScript — que é
-- precisamente a duplicação que as funções existem para evitar.
grant execute on function public.is_user_blocked(uuid)      to service_role;
grant execute on function public.has_pro_access(uuid)       to service_role;
grant execute on function public.has_essential_access(uuid) to service_role;

-- As versões SEM parâmetro (`current_user_has_*`) não são concedidas: elas
-- resolvem `auth.uid()`, que é NULL fora de uma sessão autenticada. Para
-- service_role responderiam sempre `false` — dar acesso a elas só criaria uma
-- armadilha silenciosa para quem chamasse a função errada no admin.


-- =============================================================================
-- 4. O QUE ESTA MIGRATION DELIBERADAMENTE NÃO FAZ
-- =============================================================================
--
-- 4.1 Nada para `anon` nem `authenticated`.
--     O acesso do cliente foi decidido em 0001/0002/0003 e continua igual.
--     Nenhum REVOKE aqui também: mexer no que já está validado sem necessidade
--     é como se quebra o que funciona.
--
-- 4.2 Nenhuma policy criada, nenhuma RLS removida.
--     RLS segue habilitada em todas as tabelas, com as mesmas policies.
--     service_role passa por cima delas por BYPASSRLS — o que esta migration
--     conserta é a outra metade, o privilégio.
--
-- 4.3 Nenhum `alter default privileges`.
--     Seria a correção "automática" para tabelas futuras, e foi descartada:
--     concede ALL em tudo que nascer, exatamente o "privilégio amplo demais"
--     que este projeto recusa. O preço de não usar é ter que conceder
--     explicitamente a cada tabela nova — e esse preço é o ponto: obriga a
--     decidir, tabela por tabela, quais verbos o backend realmente precisa.
--
--     >>> LEMBRETE PARA A PRÓXIMA MIGRATION QUE CRIAR TABELA: <<<
--     >>> se o backend for escrever nela, o grant a service_role vem junto. <<<
--
-- 4.4 Nenhum grant de sequência.
--     Todas as PKs usam `gen_random_uuid()`, não `serial`/`identity` — não há
--     sequência para conceder. Confirmado em 0001, 0002 e 0003.


-- =============================================================================
-- 5. COMO CONFERIR DEPOIS DE APLICAR
-- =============================================================================
--
-- 5.1 Privilégios efetivos de service_role (esperado: exatamente o da seção 2):
--
--   select table_name, string_agg(privilege_type, ', ' order by privilege_type)
--   from information_schema.role_table_grants
--   where grantee = 'service_role' and table_schema = 'public'
--   group by table_name
--   order by table_name;
--
-- 5.2 Garantir que anon/authenticated NÃO ganharam nada novo:
--
--   select grantee, table_name, privilege_type
--   from information_schema.role_table_grants
--   where grantee in ('anon', 'authenticated') and table_schema = 'public'
--   order by grantee, table_name, privilege_type;
--
--   Esperado: `authenticated` com SELECT em licenses, license_events e
--   profiles, mais UPDATE(full_name) em profiles. `anon` sem nada.
--   ⚠️ Qualquer INSERT/UPDATE/DELETE em `licenses` para `authenticated` é falha
--      grave — significaria que a usuária pode se conceder licença.
--
-- 5.3 RLS continua habilitada em tudo:
--
--   select relname, relrowsecurity
--   from pg_class
--   where relname in ('profiles','user_access_flags','licenses',
--                     'license_events','webhook_events');
--
--   Esperado: relrowsecurity = true em todas.
--
-- 5.4 Perfis sem linha em user_access_flags (ver o aviso da seção 2.5):
--
--   select p.id, p.email
--   from public.profiles p
--   left join public.user_access_flags f on f.user_id = p.id
--   where f.user_id is null;
--
--   Esperado: nenhuma linha. Se retornar alguma, o bloqueio administrativo
--   dessas contas falharia em silêncio.
-- =============================================================================
