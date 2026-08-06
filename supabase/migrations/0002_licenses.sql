-- =============================================================================
-- 0002_licenses.sql — Fase 4-2A: licenças e auditoria de licenças
-- =============================================================================
--
-- Depende de 0001_profiles.sql (profiles, user_access_flags, set_updated_at).
--
--   public.licenses        licenças da usuária (compra única e/ou Pro anual)
--   public.license_events  histórico append-only de tudo que mudou
--
--   Funções de acesso, em duas camadas:
--     INTERNAS (recebem uid)  has_essential_access / has_pro_access / is_user_blocked
--                             → sem EXECUTE para o cliente; uso em service_role e
--                               dentro das funções expostas
--     EXPOSTAS (sem parâmetro) current_user_has_essential_access
--                              current_user_has_pro_access
--                             → só respondem sobre auth.uid(); é o que o DAL e as
--                               policies de RLS devem usar
--
-- Ainda NÃO cria: gating de rota, webhooks (Fase 6), admin (Fase 7), nem
-- qualquer tabela de dados na nuvem.
--
-- Princípios (ver DECISIONS.md, 2026-08-05):
--   1. O cliente LÊ as próprias licenças e NUNCA escreve nelas. Se pudesse dar
--      INSERT aqui, se concederia Pro vitalício com uma linha de SQL — esta é a
--      política que sustenta o modelo comercial inteiro.
--   2. Compra única e Pro anual COEXISTEM. Acesso é agregado sobre todas as
--      licenças, nunca derivado de "a licença".
--   3. Pro anual implica Essencial. Compra única NÃO implica Pro.
--   4. Acesso é sempre CALCULADO na hora, nunca persistido — assim reembolso
--      tem efeito imediato, sem cache para expirar.
--   5. Bloqueio manual (user_access_flags) derruba acesso mesmo com licença ativa.
--   6. NÃO existe plano mensal.
--
-- Como aplicar (execução manual, deliberadamente NÃO automatizada):
--   supabase db push                         # via CLI, ou
--   cole no SQL Editor do painel             # depois de 0001
--
-- Idempotência: `if not exists` / `create or replace` / `drop ... if exists`.
-- =============================================================================


-- =============================================================================
-- 1. TABELAS
-- =============================================================================

-- 1.1 licenses — o que a usuária comprou.
--
-- Uma usuária pode ter VÁRIAS linhas: uma `one_time` (Essencial vitalício) e uma
-- `annual_pro` ao mesmo tempo, além do histórico de assinaturas vencidas. Por
-- isso não há unicidade por (user_id, product_type).
create table if not exists public.licenses (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles (id) on delete cascade,

  -- Sem plano mensal, por decisão comercial (DECISIONS.md, 2026-06-27).
  --   one_time   = Doce Margem Essencial (compra única, vitalícia)
  --   annual_pro = Doce Margem Pro Anual (assinatura)
  product_type      text        not null
                    check (product_type in ('one_time', 'annual_pro')),

  -- Qualquer valor diferente de 'active' revoga aquela licença.
  status            text        not null
                    check (status in ('active', 'refunded', 'chargeback', 'cancelled', 'expired')),

  -- NULL = vitalício (compra única). Obrigatório no Pro anual.
  expires_at        timestamptz,

  -- 'kiwify' | 'hotmart' | 'manual'. Sem CHECK de propósito: um provedor novo
  -- não deve exigir migration, e este valor é sempre escrito por código
  -- (webhook/admin), nunca digitado à mão em produção.
  provider          text        not null,
  provider_order_id text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Coerência entre tipo de produto e validade.
  constraint licenses_annual_needs_expiry
    check (product_type <> 'annual_pro' or expires_at is not null),
  constraint licenses_one_time_is_lifetime
    check (product_type <> 'one_time' or expires_at is null),

  -- Idempotência de webhook: o mesmo pedido nunca vira duas licenças.
  -- Atenção: em Postgres, NULLs não conflitam entre si numa UNIQUE — então
  -- várias licenças manuais (provider_order_id NULL) convivem sem problema,
  -- que é exatamente o comportamento desejado.
  constraint licenses_provider_order_unique unique (provider, provider_order_id)
);

comment on table public.licenses is
  'Licenças da usuária. READ-ONLY para o cliente: sem policy de escrita, só '
  'service_role grava (webhooks na Fase 6, admin na Fase 7). Compra única e Pro '
  'anual coexistem — o acesso é agregado sobre todas as linhas.';

comment on column public.licenses.expires_at is
  'NULL para one_time (vitalício). Obrigatório para annual_pro. As funções de '
  'acesso comparam com now(): o vencimento é CALCULADO, não depende de alguém '
  'ter rodado um job para marcar status = expired.';

comment on column public.licenses.status is
  'active | refunded | chargeback | cancelled | expired. Qualquer valor '
  'diferente de active revoga aquela licença imediatamente. O valor "expired" é '
  'conveniência de registro: as funções de acesso já tratam vencimento por '
  'expires_at, então uma licença vencida com status active NÃO concede Pro.';


-- 1.2 license_events — auditoria append-only.
--
-- Existe para responder "por que esta pessoa perdeu (ou ganhou) acesso, quando,
-- e por ordem de quem" — pergunta que aparece em disputa de chargeback e em
-- reclamação de cliente.
--
-- As FKs usam `on delete set null`, não cascade, de propósito: apagar a conta ou
-- a licença NÃO deve destruir a evidência de que houve um reembolso. O evento
-- sobrevive órfão (e anonimizado, já que o vínculo com a pessoa some).
create table if not exists public.license_events (
  id         uuid        primary key default gen_random_uuid(),

  -- Nullable por dois motivos: eventos de conta (bloqueio manual) não se
  -- referem a uma licença específica; e o `set null` acima precisa de coluna
  -- nullable.
  license_id uuid        references public.licenses (id) on delete set null,
  user_id    uuid        references public.profiles (id) on delete set null,

  event_type text        not null
             check (event_type in (
               'granted',        -- licença concedida (compra aprovada)
               'renewed',        -- Pro anual renovado
               'refunded',       -- reembolso
               'chargeback',     -- contestação de cobrança
               'cancelled',      -- cancelamento
               'expired',        -- venceu
               'manual_block',   -- bloqueio manual pelo admin
               'manual_unblock'  -- desbloqueio manual pelo admin
             )),

  -- Quem causou: 'webhook:kiwify' | 'webhook:hotmart' | 'admin:<email>' | 'system'.
  source     text        not null,

  -- Corpo bruto do webhook ou contexto da ação do admin, para auditoria.
  payload    jsonb,

  created_at timestamptz not null default now()
);

comment on table public.license_events is
  'Histórico APPEND-ONLY de licenças. UPDATE é bloqueado por trigger para TODOS '
  '(inclusive service_role): para corrigir um registro errado, insere-se um '
  'evento corretivo. FKs com ON DELETE SET NULL para que a evidência sobreviva '
  'à exclusão da conta ou da licença.';

comment on column public.license_events.event_type is
  'Vocabulário fechado por CHECK. Um evento novo é uma extensão deliberada do '
  'vocabulário de auditoria e deve passar por migration — o CHECK existe para '
  'impedir que um typo crie um evento que nenhuma consulta encontra.';


-- =============================================================================
-- 2. FUNÇÕES E TRIGGERS
-- =============================================================================

-- 2.1 updated_at em licenses. Reusa public.set_updated_at() de 0001.
drop trigger if exists licenses_set_updated_at on public.licenses;
create trigger licenses_set_updated_at
  before update on public.licenses
  for each row execute function public.set_updated_at();


-- 2.2 Imutabilidade de license_events.
--
-- UPDATE é bloqueado para TODOS, inclusive service_role: um histórico de
-- auditoria que o próprio sistema pode reescrever não prova nada em disputa de
-- chargeback. Corrigir um erro se faz inserindo um evento corretivo, não
-- apagando o anterior — mesma regra que o projeto já segue em DECISIONS.md
-- ("nunca remova decisões antigas").
--
-- DELETE fica liberado só para os papéis administrativos. Não é para cascata
-- (as FKs usam SET NULL, então exclusão de conta não chega aqui como DELETE),
-- e sim para atender a um pedido legítimo de apagamento de dados (LGPD), já que
-- `payload` pode conter dados pessoais vindos do provedor de pagamento.
create or replace function public.license_events_block_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_user in ('service_role', 'postgres', 'supabase_admin') then
    return old;
  end if;

  raise exception
    'license_events é append-only: % não é permitido. Para corrigir, insira um evento novo.', tg_op
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists license_events_immutable on public.license_events;
create trigger license_events_immutable
  before update or delete on public.license_events
  for each row execute function public.license_events_block_mutation();


-- =============================================================================
-- 3. FUNÇÕES DE ACESSO — a regra de negócio, dentro do banco
-- =============================================================================
--
-- Estas funções são a razão de a RLS conseguir proteger dados do Pro sem
-- confiar na aplicação: o bloqueio por reembolso vale no banco, não só no
-- TypeScript.
--
-- ORGANIZADAS EM DUAS CAMADAS, de propósito:
--
--   3.1–3.3  INTERNAS, recebem `uid`. Sem EXECUTE para anon/authenticated.
--            Usadas por service_role (admin, Fase 7) e pelas funções expostas.
--
--   3.4–3.5  EXPOSTAS, sem parâmetro. Resolvem `auth.uid()` internamente, então
--            só conseguem responder sobre quem chamou. São as únicas com
--            EXECUTE para `authenticated`.
--
-- Por que a separação: uma função SECURITY DEFINER que aceita uid arbitrário e
-- é executável por `authenticated` deixa qualquer usuária perguntar "o UUID
-- fulano tem Pro?". O risco prático é baixo (é preciso conhecer o UUID alheio, e
-- a RLS de `profiles` impede descobri-lo pelo app), mas é superfície de
-- vazamento que não precisa existir.
--
-- A chamada em cadeia funciona porque, DENTRO de uma função SECURITY DEFINER, o
-- papel efetivo é o da dona da função (não `authenticated`) — então revogar
-- EXECUTE das internas não impede as expostas de chamá-las.
--
-- >>> Policies de RLS de tabelas futuras devem usar as SEM PARÂMETRO: <<<
--
--   using ( user_id = (select auth.uid()) and public.current_user_has_pro_access() )
--
-- NOTA sobre `is_blocked`: vem de `user_access_flags`, NÃO de `profiles`. O
-- PLAN-FASE-4.md foi escrito antes da Fase 4-1A mover essa coluna; copiado
-- literalmente de lá, este SQL não compilaria.
--
-- SECURITY DEFINER: evita avaliação aninhada de RLS quando a função é usada
-- dentro de uma policy. STABLE: o planner reaproveita o resultado dentro do
-- mesmo statement. `search_path = ''`: fecha o sequestro de resolução de nome,
-- risco clássico de SECURITY DEFINER.

-- 3.1 [INTERNA] Bloqueio manual — condição comum às duas funções.
create or replace function public.is_user_blocked(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_access_flags f
    where f.user_id = uid
      and f.is_blocked = true
  );
$$;

comment on function public.is_user_blocked(uuid) is
  'true se a conta está bloqueada manualmente pelo admin. Bloqueio derruba todo '
  'acesso, mesmo com licença ativa.';


-- 3.2 [INTERNA] Pro anual ativo, dentro da validade, conta não bloqueada.
-- Compra única NÃO concede Pro.
create or replace function public.has_pro_access(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not public.is_user_blocked(uid)
     and exists (
       select 1
       from public.licenses l
       where l.user_id = uid
         and l.product_type = 'annual_pro'
         and l.status = 'active'
         and l.expires_at > now()
     );
$$;

comment on function public.has_pro_access(uuid) is
  'true se a usuária tem Pro anual ativo e não vencido, e não está bloqueada. '
  'Compra única (one_time) NÃO concede Pro. Sempre calculado — reembolso tem '
  'efeito imediato.';


-- 3.3 [INTERNA] Essencial: compra única ativa OU Pro ativo (Pro implica Essencial).
--
-- O OR existe para que quem assina o Pro sem ter comprado o Essencial antes não
-- fique sem as telas básicas. E quando um Pro vence, o Essencial permanece se
-- houver uma one_time ativa.
create or replace function public.has_essential_access(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not public.is_user_blocked(uid)
     and exists (
       select 1
       from public.licenses l
       where l.user_id = uid
         and l.status = 'active'
         and (
           l.product_type = 'one_time'                                  -- vitalícia
           or (l.product_type = 'annual_pro' and l.expires_at > now())  -- Pro vigente
         )
     );
$$;

comment on function public.has_essential_access(uuid) is
  'true se a usuária tem compra única ativa OU Pro ativo e não vencido, e não '
  'está bloqueada. Pro anual implica Essencial.';


-- 3.4 [EXPOSTA] Pro anual da usuária logada.
--
-- `auth.uid()` é NULL numa sessão sem login: nesse caso devolve false em vez de
-- delegar, deixando o comportamento explícito em vez de depender de a função
-- interna tratar NULL por acaso.
create or replace function public.current_user_has_pro_access()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    else public.has_pro_access((select auth.uid()))
  end;
$$;

comment on function public.current_user_has_pro_access() is
  'Versão segura de has_pro_access: responde APENAS sobre auth.uid(). É a que o '
  'cliente e as policies de RLS devem usar. false para sessão anônima.';


-- 3.5 [EXPOSTA] Essencial da usuária logada.
create or replace function public.current_user_has_essential_access()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    else public.has_essential_access((select auth.uid()))
  end;
$$;

comment on function public.current_user_has_essential_access() is
  'Versão segura de has_essential_access: responde APENAS sobre auth.uid(). É a '
  'que o cliente e as policies de RLS devem usar. false para sessão anônima.';


-- 3.6 PRIVILÉGIOS DAS FUNÇÕES
--
-- Internas (recebem uid): NENHUM acesso para o cliente. Só service_role — que,
-- sendo superusuário efetivo no Supabase, não depende de grant explícito.
-- Revogar de `public` também tira o default do Postgres, que concede EXECUTE a
-- PUBLIC em toda função nova.
revoke execute on function public.is_user_blocked(uuid)      from public, anon, authenticated;
revoke execute on function public.has_pro_access(uuid)       from public, anon, authenticated;
revoke execute on function public.has_essential_access(uuid) from public, anon, authenticated;

-- Expostas (sem parâmetro): só `authenticated`.
-- `anon` fica de fora de propósito — uma sessão sem login nunca tem acesso, e
-- deixar a função aberta só daria a visitantes uma sonda contra o banco.
revoke execute on function public.current_user_has_pro_access()       from public, anon;
revoke execute on function public.current_user_has_essential_access() from public, anon;

grant execute on function public.current_user_has_pro_access()       to authenticated;
grant execute on function public.current_user_has_essential_access() to authenticated;


-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

alter table public.licenses       enable row level security;
alter table public.license_events enable row level security;

-- 4.1 licenses: a usuária LÊ as próprias licenças. E SÓ ISSO.
--
-- A transparência importa (ela precisa ver o que comprou e até quando vale),
-- mas escrita é exclusiva do backend.
drop policy if exists licenses_select_own on public.licenses;
create policy licenses_select_own on public.licenses
  for select to authenticated
  using ( (select auth.uid()) = user_id );

-- >>> Sem policy de INSERT/UPDATE/DELETE — nenhuma, para ninguém. <<<
-- Sem policy de escrita, a RLS nega por padrão. service_role ignora RLS e é o
-- único caminho de gravação (webhooks Fase 6, admin Fase 7).
--
-- Adicionar uma policy de escrita aqui equivale a deixar qualquer usuária se
-- conceder Pro vitalício, ou mudar o próprio `status` de refunded para active.
-- NÃO ADICIONAR.


-- 4.2 license_events: leitura do próprio histórico.
-- Eventos órfãos (user_id NULL, após exclusão de conta) não são visíveis a
-- ninguém pelo cliente — só via service_role.
drop policy if exists license_events_select_own on public.license_events;
create policy license_events_select_own on public.license_events
  for select to authenticated
  using ( (select auth.uid()) = user_id );

-- Sem policy de escrita, pelo mesmo motivo. Além disso, o trigger da seção 2.2
-- impede UPDATE até por service_role.


-- =============================================================================
-- 5. PRIVILÉGIOS
-- =============================================================================
--
-- Mesmo padrão de 0001: RLS decide QUAIS LINHAS, GRANT decide QUAIS COLUNAS.
-- Aqui o cliente não escreve nada, então nenhum grant de insert/update/delete —
-- nem por coluna. Duas barreiras independentes: sem policy E sem privilégio.

revoke all on public.licenses       from anon, authenticated;
revoke all on public.license_events from anon, authenticated;

grant select on public.licenses       to authenticated;
grant select on public.license_events to authenticated;

-- `anon` não recebe nada.


-- =============================================================================
-- 6. ÍNDICES
-- =============================================================================

-- Caminho quente: "quais licenças ativas esta usuária tem?" — usado pelas
-- funções da seção 3 a cada verificação de acesso.
create index if not exists licenses_user_active_idx
  on public.licenses (user_id, product_type, status);

-- Varredura de vencimento (job/relatório futuro).
create index if not exists licenses_expires_at_idx
  on public.licenses (expires_at)
  where expires_at is not null;

-- Histórico da usuária, mais recente primeiro.
create index if not exists license_events_user_created_idx
  on public.license_events (user_id, created_at desc);

-- Todos os eventos de uma licença.
create index if not exists license_events_license_idx
  on public.license_events (license_id)
  where license_id is not null;
