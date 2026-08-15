-- =============================================================================
-- 0005_user_app_state.sql — Fase P0-10: estado do app salvo na nuvem
-- =============================================================================
--
-- Cria a cópia em nuvem do estado da usuária:
--
--   public.user_app_state   uma linha por usuária, AppState inteiro em JSONB
--
-- Por que JSONB e não tabelas normalizadas (ver DECISIONS.md, 2026-08-14):
-- o `AppState` já é um documento único, versionado por `schema_version`, que o
-- app grava e lê inteiro. Normalizar ingredientes, receitas, embalagens, canais
-- e rascunho de orçamento em oito tabelas exigiria oito migrations, oito
-- conjuntos de policies e uma camada de mapeamento — para entregar, hoje, a
-- mesma coisa: não perder os dados ao trocar de navegador. Normalizar é o passo
-- certo quando houver consulta por entidade (relatórios, histórico de preços);
-- não é este passo.
--
-- ⚠️ NÃO APLICADA AUTOMATICAMENTE. Ver o cabeçalho "Como aplicar" abaixo — o
-- app tolera a ausência desta tabela e continua funcionando só com localStorage.
--
-- Como aplicar:
--   supabase db push                          # via CLI, ou
--   cole o conteúdo no SQL Editor do painel   # em ordem de arquivo
--
-- Idempotência: `if not exists` / `create or replace` / `drop ... if exists`,
-- como nas migrations anteriores.
-- =============================================================================


-- =============================================================================
-- 1. TABELA
-- =============================================================================

-- `user_id` referencia auth.users: apagar a conta apaga o estado em cascata.
-- É também a PRIMARY KEY — uma linha por usuária, por construção. Isso torna o
-- upsert do cliente trivial e impossibilita duplicar estado por acidente.
create table if not exists public.user_app_state (
  user_id        uuid        primary key references auth.users (id) on delete cascade,
  app_state      jsonb       not null,
  schema_version integer     not null default 1,
  updated_at     timestamptz not null default now()
);

comment on table public.user_app_state is
  'Cópia em nuvem do estado local da usuária (Fase P0-10). Uma linha por conta. '
  'O localStorage continua sendo o cache de leitura do app; esta tabela é a '
  'cópia que sobrevive a trocar de navegador ou de aparelho.';

comment on column public.user_app_state.app_state is
  'AppState serializado inteiro. A forma é validada no cliente por '
  'normalizeAppState (services/storage-service.ts) na leitura — dado corrompido '
  'nunca derruba o app, vira estado inicial seguro.';

comment on column public.user_app_state.schema_version is
  'Espelha APP_STATE_SCHEMA_VERSION. Versão desconhecida é ignorada na leitura, '
  'preservando o que estiver no navegador.';


-- =============================================================================
-- 2. TRIGGER
-- =============================================================================

-- Reusa `public.set_updated_at()` criada na 0001 — não redefine nada.
-- `updated_at` é auditoria de servidor: a decisão de qual lado é mais recente
-- usa o `updatedAt` de dentro do próprio AppState, gerado pelo mesmo relógio
-- (o do navegador) nos dois lados da comparação. Misturar relógio de servidor
-- com relógio de cliente numa comparação é como se perde dado sem perceber.
drop trigger if exists user_app_state_set_updated_at on public.user_app_state;
create trigger user_app_state_set_updated_at
  before update on public.user_app_state
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 3. ROW LEVEL SECURITY
-- =============================================================================

alter table public.user_app_state enable row level security;

-- Nota de leitura: `(select auth.uid())` em vez de `auth.uid()` puro é a forma
-- recomendada pelo Supabase — o planner avalia uma vez por statement em vez de
-- uma vez por linha. Mesmo padrão da 0001 e da 0002.

-- Ao contrário de `profiles` e `licenses`, aqui a usuária **é** a dona do dado:
-- ela cria, lê, atualiza e apaga o próprio estado. Nenhuma dessas operações
-- decide acesso pago — o que decide continua sendo `licenses`, intocada.
drop policy if exists user_app_state_select_own on public.user_app_state;
create policy user_app_state_select_own on public.user_app_state
  for select to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists user_app_state_insert_own on public.user_app_state;
create policy user_app_state_insert_own on public.user_app_state
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );  -- não pode criar linha alheia

drop policy if exists user_app_state_update_own on public.user_app_state;
create policy user_app_state_update_own on public.user_app_state
  for update to authenticated
  using      ( (select auth.uid()) = user_id )   -- só enxerga a própria linha
  with check ( (select auth.uid()) = user_id );  -- e não pode movê-la para outra pessoa

drop policy if exists user_app_state_delete_own on public.user_app_state;
create policy user_app_state_delete_own on public.user_app_state
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- Sem policy para `anon`: visitante não tem estado e não pode ler o de ninguém.


-- =============================================================================
-- 4. PRIVILÉGIOS
-- =============================================================================
--
-- Duas barreiras independentes, como no resto do projeto: a policy decide QUAL
-- linha, o grant decide QUAL operação. Uma policy escrita errado sem o grant
-- correspondente ainda falha, e vice-versa.

revoke all on public.user_app_state from anon, authenticated;

grant select, insert, update, delete on public.user_app_state to authenticated;

-- `service_role` não recebe grant aqui de propósito. Nada no servidor precisa
-- ler o estado da usuária: o webhook mexe em licença, não em receita. Conceder
-- agora seria abrir um caminho de leitura de dados pessoais que nenhuma linha
-- de código pede.


-- =============================================================================
-- 5. CONFERÊNCIA PÓS-APLICAÇÃO
-- =============================================================================
--
-- 5.1 A tabela existe e tem RLS ligada?
--   select relname, relrowsecurity
--     from pg_class
--    where relname = 'user_app_state';
--   -- esperado: user_app_state | t
--
-- 5.2 As quatro policies estão lá, todas restritas a authenticated?
--   select policyname, cmd, roles
--     from pg_policies
--    where schemaname = 'public' and tablename = 'user_app_state'
--    order by policyname;
--   -- esperado: 4 linhas (select/insert/update/delete), roles = {authenticated}
--
-- 5.3 Os privilégios de tabela são só os quatro esperados?
--   select grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'user_app_state'
--    order by grantee, privilege_type;
--   -- esperado: authenticated com DELETE, INSERT, SELECT, UPDATE — e nada para anon
--
-- 5.4 O trigger de updated_at está ativo?
--   select tgname from pg_trigger
--    where tgrelid = 'public.user_app_state'::regclass and not tgisinternal;
--   -- esperado: user_app_state_set_updated_at
--
-- 5.5 Isolamento entre usuárias (o teste que importa):
--   -- logada como A, tentar ler a linha de B deve devolver ZERO linhas,
--   -- não erro de permissão — é assim que RLS se comporta.
--   select count(*) from public.user_app_state where user_id <> auth.uid();
--   -- esperado: 0
-- =============================================================================
