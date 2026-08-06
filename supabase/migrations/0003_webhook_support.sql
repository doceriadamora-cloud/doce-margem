-- =============================================================================
-- 0003_webhook_support.sql — Fase 4-7B: suporte de banco para webhooks Kiwify
-- =============================================================================
--
-- Depende de 0001_profiles.sql e 0002_licenses.sql. NÃO altera nenhuma das duas.
--
--   public.webhook_events   log de processamento dos webhooks recebidos
--   índice único em profiles (lower(email))  — busca por e-mail da compra
--
-- Ainda NÃO cria: route handler, cliente admin, nem qualquer código. Esta
-- migration só prepara o banco (plano em PLAN-FASE-4.md, capítulo 13).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- webhook_events NÃO é license_events. A diferença importa:
--
--   license_events   auditoria APPEND-ONLY do que aconteceu com a licença.
--                    UPDATE bloqueado por trigger para todos, inclusive
--                    service_role. Responde "por que esta pessoa perdeu acesso".
--
--   webhook_events   log de PROCESSAMENTO. Muda de estado ao longo da vida:
--                    received → processed | ignored | failed, com processed_at.
--                    Responde "esta requisição já foi tratada?".
--
-- Por isso esta tabela NÃO recebe o trigger de imutabilidade da 0002 — ela
-- precisa de UPDATE (por service_role). Copiar aquele trigger para cá
-- quebraria o processamento no primeiro webhook.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Princípios herdados (DECISIONS.md, 2026-08-05 e 2026-08-06):
--   1. O cliente não escreve nada aqui. Só service_role grava (Fase 4-7C).
--   2. Requisição com token inválido NÃO vira linha nesta tabela — auditoria
--      que o atacante alimenta não serve para disputa de chargeback.
--   3. Idempotência é responsabilidade do banco, não da boa vontade do handler.
--
-- Como aplicar (execução manual, deliberadamente NÃO automatizada):
--   supabase db push                         # via CLI, ou
--   cole no SQL Editor do painel             # depois de 0001 e 0002
--
-- ⚠️ ANTES DE APLICAR, rodar a checagem da seção 4. O índice único de e-mail
--    falha se já houver duplicatas — ver REVIEW.md (Fase 4-7B).
--
-- Idempotência: `if not exists` em tudo.
-- =============================================================================


-- =============================================================================
-- 1. TABELA
-- =============================================================================

-- 1.1 webhook_events — uma linha por webhook VÁLIDO recebido.
--
-- "Válido" = token conferido. Requisição sem token correto é recusada com 401
-- antes de qualquer escrita (princípio 2 do cabeçalho).
create table if not exists public.webhook_events (
  id                uuid        primary key default gen_random_uuid(),

  -- Só Kiwify por enquanto. Ver a nota de escopo no CHECK da seção 2.
  provider          text        not null,

  -- Vocabulário da Kiwify, normalizado. Evento não reconhecido entra como
  -- 'unknown' — o nome original permanece em `payload`, então nada se perde.
  event_type        text        not null,

  -- Identificador do EVENTO no provedor. É a chave de idempotência (seção 3).
  -- Nullable porque não se pode garantir que a Kiwify sempre envie — mas ver o
  -- aviso da seção 3: NULL aqui significa SEM proteção contra reprocessamento.
  provider_event_id text,

  -- Identificador do PEDIDO. Um pedido gera vários eventos ao longo do tempo
  -- (aprovada → reembolsada), por isso não é único aqui. É o elo com
  -- licenses.provider_order_id.
  provider_order_id text,

  -- Preenchidos quando o handler consegue resolver. `on delete set null`
  -- (mesmo critério da 0002): apagar a conta não destrói a evidência de que a
  -- requisição chegou e foi processada.
  user_id           uuid        references public.profiles (id) on delete set null,
  license_id        uuid        references public.licenses (id) on delete set null,

  -- Corpo bruto recebido. `not null`: um log de webhook sem o webhook não serve
  -- para reprocessar nem para auditar.
  payload           jsonb       not null,

  -- Estado do processamento. Ver CHECK na seção 2.
  status            text        not null default 'received',

  -- Só preenchido quando status = 'failed'. Mensagem interna, nunca devolvida
  -- na resposta HTTP.
  error_message     text,

  created_at        timestamptz not null default now(),

  -- Momento em que saiu de 'received'. NULL enquanto não foi concluído.
  processed_at      timestamptz
);

comment on table public.webhook_events is
  'Log de processamento de webhooks de pagamento. READ-ONLY e INVISÍVEL para o '
  'cliente: sem policy nenhuma, sem grant nenhum. Diferente de license_events, '
  'esta tabela MUDA de estado (received → processed/ignored/failed) e por isso '
  'NÃO tem trigger de imutabilidade.';

comment on column public.webhook_events.provider_event_id is
  'Chave de idempotência. Quando NULL, o índice único parcial da seção 3 não '
  'protege — o mesmo webhook reprocessado vira duas linhas. O handler deve '
  'tratar ausência deste campo como erro, não como caso normal.';

comment on column public.webhook_events.provider_order_id is
  'Elo com licenses.provider_order_id. NÃO é único aqui de propósito: um mesmo '
  'pedido produz compra_aprovada e, mais tarde, compra_reembolsada ou chargeback.';

comment on column public.webhook_events.payload is
  'Corpo bruto do provedor. Contém DADOS PESSOAIS da compradora (nome, e-mail, '
  'possivelmente documento). Pedido de apagamento (LGPD) se atende com DELETE '
  'por service_role — não há trigger impedindo, ao contrário de license_events.';

comment on column public.webhook_events.status is
  'received = chegou, ainda não concluído | processed = licença criada/atualizada '
  '| ignored = evento válido que não exige ação | failed = erro no processamento, '
  'ver error_message. Um "failed" é candidato a reprocessamento manual.';


-- =============================================================================
-- 2. CONSTRAINTS
-- =============================================================================
--
-- `add constraint if not exists` não existe em Postgres; o bloco condicional
-- abaixo é o equivalente idempotente.

-- 2.1 provider — só 'kiwify' nesta fase.
--
-- ⚠️ ESCOPO DELIBERADO, com custo conhecido: adicionar Hotmart (já citada no
-- README e no .env.example) exigirá migration. Isso é coerente, e não descuido:
-- o CHECK de event_type abaixo usa o vocabulário PORTUGUÊS da Kiwify
-- ('compra_aprovada'), que a Hotmart não usa. Um provider novo precisaria
-- estender os dois CHECKs de qualquer forma — então travar aqui não cria
-- trabalho que já não existiria.
--
-- Note a assimetria com licenses.provider, que NÃO tem CHECK: lá o valor é só
-- procedência (inclui 'manual'), aqui ele determina como o payload é lido.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webhook_events_provider_check'
  ) then
    alter table public.webhook_events
      add constraint webhook_events_provider_check
      check (provider in ('kiwify'));
  end if;
end
$$;

-- 2.2 event_type — vocabulário fechado.
--
-- 'ignored' e 'unknown' são estados de reconhecimento, não eventos da Kiwify:
--   unknown  = veio um evento que o handler não sabe classificar
--   ignored  = evento reconhecido, mas sem ação prevista
-- Em ambos, o nome original fica em `payload`. O CHECK existe para impedir que
-- um typo crie uma categoria que nenhuma consulta encontra — mesmo motivo do
-- CHECK de license_events.event_type na 0002.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webhook_events_event_type_check'
  ) then
    alter table public.webhook_events
      add constraint webhook_events_event_type_check
      check (event_type in (
        'compra_aprovada',
        'compra_reembolsada',
        'chargeback',
        'ignored',
        'unknown'
      ));
  end if;
end
$$;

-- 2.3 status — máquina de estados do processamento.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webhook_events_status_check'
  ) then
    alter table public.webhook_events
      add constraint webhook_events_status_check
      check (status in ('received', 'processed', 'ignored', 'failed'));
  end if;
end
$$;

-- 2.4 Coerência entre status e processed_at.
--
-- Sem isto, nada impede uma linha 'processed' sem carimbo de quando, ou uma
-- 'received' já carimbada — e aí a coluna deixa de responder à única pergunta
-- que ela existe para responder.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webhook_events_processed_at_coherent'
  ) then
    alter table public.webhook_events
      add constraint webhook_events_processed_at_coherent
      check (
        (status = 'received' and processed_at is null)
        or (status <> 'received' and processed_at is not null)
      );
  end if;
end
$$;

-- 2.5 error_message só faz sentido em 'failed'.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webhook_events_error_only_when_failed'
  ) then
    alter table public.webhook_events
      add constraint webhook_events_error_only_when_failed
      check (status = 'failed' or error_message is null);
  end if;
end
$$;


-- =============================================================================
-- 3. IDEMPOTÊNCIA E ÍNDICES
-- =============================================================================

-- 3.1 Idempotência: o mesmo evento do provedor nunca vira duas linhas.
--
-- Índice ÚNICO PARCIAL, não constraint UNIQUE. Em Postgres, NULLs não conflitam
-- entre si numa UNIQUE, então uma constraint comum já toleraria vários NULLs —
-- mas o índice parcial deixa a intenção explícita e não indexa linhas inúteis.
--
-- ⚠️ ATENÇÃO: se `provider_event_id` vier NULL, ESTA PROTEÇÃO NÃO EXISTE. É o
-- mesmo buraco de NULL registrado no PLAN-FASE-4.md 13.1(C) para
-- licenses.provider_order_id. O handler da Fase 4-7C deve tratar ausência do
-- identificador de evento como erro explícito, nunca gravar NULL e seguir.
create unique index if not exists webhook_events_provider_event_unique
  on public.webhook_events (provider, provider_event_id)
  where provider_event_id is not null;

-- 3.2 Busca por pedido: "o que já aconteceu com este pedido?".
-- NÃO é único — aprovada e reembolso compartilham o mesmo provider_order_id.
create index if not exists webhook_events_provider_order_idx
  on public.webhook_events (provider, provider_order_id)
  where provider_order_id is not null;

-- 3.3 Fila de retrabalho: encontrar o que falhou ou ficou preso em 'received'.
-- Parcial de propósito — em operação normal a maioria das linhas é 'processed',
-- e indexá-las só engordaria o índice sem servir a nenhuma consulta.
create index if not exists webhook_events_pending_idx
  on public.webhook_events (status, created_at desc)
  where status in ('received', 'failed');

-- 3.4 Listagem do admin (Fase 7): eventos mais recentes primeiro.
create index if not exists webhook_events_created_idx
  on public.webhook_events (created_at desc);

-- 3.5 Histórico por usuária, quando resolvida.
create index if not exists webhook_events_user_idx
  on public.webhook_events (user_id, created_at desc)
  where user_id is not null;


-- =============================================================================
-- 4. ÍNDICE DE E-MAIL EM profiles
-- =============================================================================
--
-- O webhook recebe o e-mail da compra e precisa achar a usuária. Hoje
-- profiles.email não tem índice NEM unicidade (a unicidade real mora em
-- auth.users), então a busca é varredura sequencial E sensível a maiúsculas —
-- 'Maria@x.com' não acharia o cadastro feito como 'maria@x.com'.
--
-- ⚠️ DUAS RAZÕES PARA ESTE ÍNDICE SER PARCIAL (`where email <> ''`):
--
--   1. handle_new_user (0001) grava `coalesce(new.email, '')`. Cadastro sem
--      e-mail (telefone, OAuth sem e-mail) produz string vazia. DUAS linhas
--      assim colidiriam num índice único total, e a criação do índice FALHARIA.
--      O app é só e-mail/senha hoje, mas a própria 0001 comenta que isso pode
--      mudar — e um índice que quebra o cadastro futuro é pior que nenhum.
--
--   2. Excluir '' não enfraquece nada: string vazia não é e-mail de compra
--      nenhuma, e o handler nunca vai procurar por ela.
--
-- ⚠️ ANTES DE APLICAR, conferir duplicatas reais (ver REVIEW.md, Fase 4-7B):
--
--   select lower(email) as email_normalizado, count(*)
--   from public.profiles
--   where email <> ''
--   group by 1 having count(*) > 1;
--
--   Se retornar linhas, o CREATE INDEX abaixo FALHA e a migration para.
--   Resolver as duplicatas primeiro — nunca remover o `unique` para "fazer
--   passar": duas contas com o mesmo e-mail tornam a identificação por e-mail
--   ambígua, que é justamente o que o webhook não pode ter.
create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email))
  where email <> '';


-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

alter table public.webhook_events enable row level security;

-- >>> NENHUMA POLICY. Nem de leitura. <<<
--
-- Sem policy, a RLS nega tudo por padrão — e é isso que se quer aqui. Duas
-- razões para o cliente não ler nem os próprios eventos:
--
--   1. `payload` é o corpo bruto do provedor. Pode conter campos que não
--      controlamos (documento, endereço, dados de cobrança) e que não passaram
--      por nenhuma decisão de "isto pode aparecer na tela".
--   2. A usuária já tem transparência pelo caminho certo: license_events
--      (0002) mostra o que aconteceu com a licença dela, com vocabulário nosso
--      e sem payload de terceiro.
--
-- webhook_events é log de infraestrutura. Se a Fase 7 quiser expor algo, que
-- seja pela área admin (service_role), não por policy de `authenticated`.
--
-- service_role ignora RLS e é o único caminho de escrita (Fase 4-7C).


-- =============================================================================
-- 6. PRIVILÉGIOS
-- =============================================================================
--
-- Mesmo padrão das migrations anteriores: RLS decide QUAIS LINHAS, GRANT decide
-- QUAIS COLUNAS. Aqui o cliente não recebe nem select — duas barreiras
-- independentes (sem policy E sem privilégio), para que um `create policy`
-- distraído no futuro não abra a tabela sozinho.
--
-- Revogar de `public` também tira o default do Postgres em instalações onde
-- PUBLIC herdou privilégios do schema.

revoke all on public.webhook_events from public, anon, authenticated;

-- Nenhum grant. Nem select, nem insert, nem update, nem delete.
-- service_role é superusuário efetivo no Supabase e não depende de grant.
