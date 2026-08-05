-- =============================================================================
-- 0001_profiles.sql — Fase 4-1A: base de perfis e flags de acesso
-- =============================================================================
--
-- Cria a fundação de identidade do app, ANTES de qualquer tela de login:
--
--   public.profiles           dados do perfil (não sensíveis)
--   public.user_access_flags  flags sensíveis (bloqueio manual) — isoladas
--
-- Ainda NÃO cria licenças (Fase 4-2), nem Auth client, nem telas.
--
-- Princípio central desta migration (ver DECISIONS.md, 2026-08-05):
--   o cliente NUNCA escreve num campo que decide o próprio acesso.
--
-- Como aplicar (quando houver projeto Supabase — ainda não há):
--   supabase db push                        # via CLI, ou
--   cole o conteúdo no SQL Editor do painel  # em ordem de arquivo
--
-- Idempotência: usa `if not exists` / `create or replace` / `drop ... if exists`
-- para poder rodar duas vezes sem quebrar durante o desenvolvimento.
-- =============================================================================


-- =============================================================================
-- 1. TABELAS
-- =============================================================================

-- 1.1 profiles — dados NÃO sensíveis do perfil.
-- `id` referencia auth.users: apagar a conta apaga o perfil em cascata.
create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text        not null,
  full_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil da usuária (dados não sensíveis). Criado automaticamente no signup. '
  'Campos que decidem acesso NÃO moram aqui — ver public.user_access_flags.';

comment on column public.profiles.email is
  'Espelho de auth.users.email, mantido pelo trigger de signup. Imutável pelo '
  'cliente: trocar e-mail é fluxo do Supabase Auth (com confirmação), não UPDATE direto.';


-- 1.2 user_access_flags — flags SENSÍVEIS, deliberadamente numa tabela separada.
--
-- Por que uma tabela só para isso, em vez de uma coluna em `profiles`:
-- `profiles` precisa ser editável pela dona (ela muda o próprio nome). Qualquer
-- policy de UPDATE em `profiles` que a permita editar o próprio registro abriria,
-- por padrão, TODAS as colunas — inclusive um `is_blocked` que ali estivesse.
-- Isolando as flags numa tabela sem NENHUMA policy de escrita, a regra vira
-- simples de auditar e difícil de furar sem querer: "esta tabela é read-only
-- para o cliente, ponto".
create table if not exists public.user_access_flags (
  user_id    uuid        primary key references public.profiles (id) on delete cascade,
  is_blocked boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_access_flags is
  'Flags sensíveis de acesso. SOMENTE service_role escreve (admin/webhook). '
  'O cliente lê o próprio status e nada mais.';

comment on column public.user_access_flags.is_blocked is
  'Bloqueio manual do admin. Quando true, revoga TODO acesso, independentemente '
  'de licença — é um dos três gatilhos de revogação (ver DECISIONS.md 2026-08-05).';


-- =============================================================================
-- 2. FUNÇÕES E TRIGGERS
-- =============================================================================

-- 2.1 updated_at automático.
-- `security invoker` (padrão): roda com os privilégios de quem disparou.
-- `search_path = ''` obriga a qualificar todo identificador — evita que um schema
-- malicioso no search_path sequestre uma chamada.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_access_flags_set_updated_at on public.user_access_flags;
create trigger user_access_flags_set_updated_at
  before update on public.user_access_flags
  for each row execute function public.set_updated_at();


-- 2.2 Guarda de imutabilidade de `profiles.id` e `profiles.email`.
--
-- Redundante com o GRANT por coluna da seção 4 — de propósito. O GRANT é a
-- proteção principal; este trigger é a rede: se uma migration futura fizer um
-- `grant update on public.profiles to authenticated` (erro fácil de cometer e
-- silencioso), o furo reabriria sem ninguém perceber. O trigger falha alto.
create or replace function public.profiles_guard_immutable_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- service_role (webhooks/admin) e acesso administrativo direto passam.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'profiles.id é imutável (tentativa de alterar % para %)', old.id, new.id
      using errcode = 'check_violation';
  end if;

  if new.email is distinct from old.email then
    raise exception 'profiles.email não pode ser alterado diretamente; use o fluxo de troca de e-mail do Supabase Auth'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_immutable on public.profiles;
create trigger profiles_guard_immutable
  before update on public.profiles
  for each row execute function public.profiles_guard_immutable_columns();


-- 2.3 Criação automática de perfil + flags no signup.
--
-- `security definer` é necessário: o trigger dispara em auth.users (schema do
-- Auth) e precisa escrever em public.*. Com `search_path = ''` + qualificação
-- completa, o risco clássico de SECURITY DEFINER (sequestro de search_path)
-- fica fechado.
--
-- `on conflict do nothing`: se a linha já existir (reprocessamento, replay),
-- não derruba o signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    -- auth.users.email é nullable (ex.: signup por telefone). O app usa só
    -- e-mail/senha, mas o coalesce evita quebrar o cadastro se isso mudar.
    coalesce(new.email, ''),
    nullif(
      trim(coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        ''
      )),
      ''
    )
  )
  on conflict (id) do nothing;

  insert into public.user_access_flags (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Uma função SECURITY DEFINER não deve ser executável por qualquer um.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- 3. ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles          enable row level security;
alter table public.user_access_flags enable row level security;

-- Nota de leitura: `(select auth.uid())` em vez de `auth.uid()` puro é a forma
-- recomendada pelo Supabase — o planner avalia uma vez por statement em vez de
-- uma vez por linha.

-- 3.1 profiles: lê e atualiza o PRÓPRIO registro.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ( (select auth.uid()) = id );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using      ( (select auth.uid()) = id )   -- só enxerga a própria linha
  with check ( (select auth.uid()) = id );  -- e não pode "movê-la" para outra pessoa

-- Sem policy de INSERT: o perfil nasce do trigger de signup, nunca do cliente.
-- Sem policy de DELETE: apagar conta é fluxo do Auth (cascata), não UPDATE/DELETE.


-- 3.2 user_access_flags: SOMENTE leitura do próprio status.
--
-- A leitura é permitida porque o DAL (Fase 4-3) roda com a sessão da usuária e
-- precisa saber se ela está bloqueada para mostrar a tela de acesso bloqueado.
-- Não é informação sensível: quem está bloqueado percebe de qualquer forma.
drop policy if exists user_access_flags_select_own on public.user_access_flags;
create policy user_access_flags_select_own on public.user_access_flags
  for select to authenticated
  using ( (select auth.uid()) = user_id );

-- Sem policy de INSERT/UPDATE/DELETE — nenhuma, para ninguém.
-- Sem policy de escrita, RLS nega por padrão. `service_role` ignora RLS e é o
-- único caminho de escrita (admin na Fase 7, webhooks na Fase 6).
--
-- >>> Esta ausência de policies é a proteção. Não adicionar nenhuma aqui. <<<


-- =============================================================================
-- 4. PRIVILÉGIOS POR COLUNA
-- =============================================================================
--
-- RLS decide QUAIS LINHAS; GRANT decide QUAIS COLUNAS. Sem esta seção, a policy
-- `profiles_update_own` deixaria a usuária alterar qualquer coluna da própria
-- linha — incluindo `email` (que precisa espelhar auth.users) e `created_at`.
--
-- Resultado: `authenticated` só consegue escrever em `profiles.full_name`.

revoke all on public.profiles          from anon, authenticated;
revoke all on public.user_access_flags from anon, authenticated;

grant select          on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant select on public.user_access_flags to authenticated;

-- `anon` (visitante não autenticado) não recebe nada em nenhuma das duas.


-- =============================================================================
-- 5. ÍNDICES
-- =============================================================================
-- `profiles.id` e `user_access_flags.user_id` já são PK (indexadas).
-- Índice em `profiles.email` para a busca por e-mail do admin (Fase 7).
create index if not exists profiles_email_idx on public.profiles (lower(email));
