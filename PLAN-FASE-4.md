# PLAN — Fase 4: Acesso e licenças (Supabase Auth)

> **Status:** planejamento aprovado, **nenhuma linha de código escrita**.
> Documento de trabalho da Fase 4. As decisões estruturais estão registradas em
> `DECISIONS.md` (2026-08-05); este arquivo é o detalhamento técnico.
>
> **Pré-requisito:** a **Fase 2-8 (backup export/import)** vem antes desta fase —
> é a rede de segurança dos dados locais da usuária antes de mexer em acesso.

---

## 1. Resumo da arquitetura

Supabase Auth com e-mail/senha, sessão em cookie httpOnly, e **três camadas de
defesa** — cada uma cobrindo a falha da anterior:

| Camada | Onde | O que faz | Confiável? |
|---|---|---|---|
| 1. Otimista | `proxy.ts` | Lê o cookie e redireciona quem não tem sessão. Rápido, roda em toda rota. | ❌ Só UX |
| 2. Autorização | DAL (`lib/auth/dal.ts`) | `getUser()` valida o JWT com o servidor Auth + consulta licenças. | ✅ Real |
| 3. Dados | RLS no Postgres | Mesmo com 1 e 2 furados, o banco recusa. | ✅ Última linha |

### Dois achados que moldam este plano

**a) Em Next.js 16, `middleware.ts` foi renomeado para `proxy.ts`.** Confirmado
em `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`:
_"Starting with Next.js 16, Middleware is now called Proxy"_. Mais importante, o
próprio doc diz que ele **não** serve para autorização:

> Proxy is _not_ intended for slow data fetching. While Proxy can be helpful for
> optimistic checks such as permission-based redirects, it should not be used as
> a full session management or authorization solution.

E ainda: _"it should not be your only line of defense in protecting your data.
The majority of security checks should be performed as close as possible to your
data source"_. Isso confirma, pela documentação oficial, a regra que o
`CLAUDE.md` já exigia: **permissões validadas no backend, não só no frontend**.

**b) O padrão recomendado é um Data Access Layer** com `cache()` do React,
chamado de dentro de Server Components / Server Actions / Route Handlers.

### Ponto crítico de segurança

No servidor, usar **sempre** `supabase.auth.getUser()` — que revalida o JWT com o
servidor Auth — e **nunca** `getSession()`, que apenas lê o cookie e é forjável.
Essa distinção é a diferença entre ter e não ter autenticação de verdade.

Pacote: `@supabase/ssr` (o `auth-helpers` está descontinuado). Três clients
distintos, com responsabilidades separadas:

- **browser** — client components, chave anônima;
- **server** — RSC / Server Actions, chave anônima + cookies;
- **admin** — service role, **exclusivo** de Route Handlers (webhooks e admin).

---

## 2. Tabelas propostas

```sql
profiles          -- 1:1 com auth.users. Criada por trigger no signup.
  id            uuid PK REFERENCES auth.users(id) ON DELETE CASCADE
  email         text NOT NULL
  full_name     text
  is_blocked    boolean NOT NULL DEFAULT false   -- bloqueio manual: mata tudo
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()

licenses          -- N por usuária. Essencial e Pro podem coexistir.
  id                uuid PK DEFAULT gen_random_uuid()
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  product_type      text NOT NULL CHECK (product_type IN ('one_time','annual_pro'))
  status            text NOT NULL CHECK (status IN
                      ('active','refunded','chargeback','cancelled','expired'))
  expires_at        timestamptz        -- NULL p/ one_time (vitalício); obrigatório p/ annual_pro
  provider          text NOT NULL      -- 'kiwify' | 'hotmart' | 'manual'
  provider_order_id text
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()

  CONSTRAINT annual_needs_expiry
    CHECK (product_type <> 'annual_pro' OR expires_at IS NOT NULL)
  CONSTRAINT one_time_is_lifetime
    CHECK (product_type <> 'one_time' OR expires_at IS NULL)
  UNIQUE (provider, provider_order_id)   -- idempotência de webhook

license_events    -- append-only, auditoria. Nunca editar nem apagar.
  id          uuid PK DEFAULT gen_random_uuid()
  license_id  uuid REFERENCES licenses(id) ON DELETE CASCADE
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  event_type  text NOT NULL   -- 'granted','refunded','chargeback','cancelled',
                              -- 'expired','manual_block','manual_unblock'
  source      text NOT NULL   -- 'webhook:kiwify' | 'admin:email@x' | 'system'
  payload     jsonb
  created_at  timestamptz NOT NULL DEFAULT now()
```

Índices: `licenses(user_id)`, `licenses(user_id, product_type, status)`,
`license_events(user_id, created_at DESC)`.

**`webhook_events`** fica para a Fase 6 (idempotência completa de webhook), mas o
`UNIQUE (provider, provider_order_id)` acima já garante a idempotência básica
desde a Fase 4 — um mesmo pedido nunca vira duas licenças.

### 🚫 Por que NÃO existe tabela `feature_flags`

Foi avaliada e **descartada**. As flags são **definição de produto** (o que o
Essencial inclui vs. o Pro), não dado por usuária. Em tabela, elas:

- custariam uma query extra em cada checagem;
- ficariam fora do controle de versão (mudança sem review, sem histórico);
- perderiam type-safety (`FeatureKey` como `string` solta);
- criariam o risco real de alguém marcar um recurso Pro como aberto direto no
  banco — violando "não criar recursos Pro abertos por padrão".

Em código (`lib/features.ts`), o TypeScript garante exaustividade e toda mudança
passa por review e deploy. É o que o `README.md` já definia.

---

## 3. Políticas RLS propostas

RLS **ligado em todas** as tabelas. A política mais importante do sistema:

```sql
-- licenses: a cliente LÊ as próprias licenças, e SÓ ISSO.
-- Nenhuma policy de INSERT/UPDATE/DELETE para o cliente — nem para a própria dona.
-- Sem policy de escrita, ninguém escreve; service_role ignora RLS e é quem grava
-- (webhooks da Fase 6 e admin da Fase 7).
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY licenses_select_own ON licenses
  FOR SELECT USING (user_id = auth.uid());
```

> Se a usuária pudesse dar `INSERT` em `licenses`, ela se concederia Pro vitalício
> com uma linha de SQL. **Esta política sustenta o modelo comercial inteiro.**

```sql
-- profiles: lê e edita o próprio perfil.
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

⚠️ **`is_blocked` não pode ser alterado pela cliente.** A policy de `UPDATE` acima
permitiria — a usuária se desbloquearia sozinha. Duas saídas, decidir na 4-1:

- **(a)** trigger `BEFORE UPDATE` que rejeita mudança em `is_blocked` quando o
  papel não é `service_role`; ou
- **(b)** mover `is_blocked` para uma tabela separada, sem nenhuma policy de
  escrita para o cliente (mesmo padrão de `licenses`).

A opção (b) é mais simples de auditar (a regra vira "esta tabela é read-only") e
mais difícil de furar sem querer; a (a) evita mais uma tabela. Preferência: **(b)**.

```sql
-- license_events: transparência de leitura, zero escrita pelo cliente.
CREATE POLICY license_events_select_own ON license_events
  FOR SELECT USING (user_id = auth.uid());
```

### A peça-chave: regra de acesso dentro do Postgres

Uma função `SECURITY DEFINER` que centraliza a regra, para as tabelas de dados do
Pro (fase futura de nuvem) referenciarem direto na policy:

```sql
CREATE FUNCTION public.has_pro_access(uid uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public          -- obrigatório em SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM licenses l
    JOIN profiles p ON p.id = l.user_id
    WHERE l.user_id = uid
      AND p.is_blocked = false
      AND l.product_type = 'annual_pro'
      AND l.status = 'active'
      AND l.expires_at > now()
  );
$$;

-- Análoga: has_essential_access(uid) — one_time ativa OU pro ativa.

-- Uso futuro, em qualquer tabela de dados na nuvem:
-- USING (user_id = auth.uid() AND has_pro_access(auth.uid()))
```

Assim o bloqueio por reembolso é enforçado **no banco**, não na aplicação.

---

## 4. Funções de acesso propostas (DAL)

`lib/auth/dal.ts`, com `import 'server-only'` no topo — o bundler recusa a
compilação se alguém importar isso num client component:

```ts
getCurrentUserAccess(): Promise<UserAccess>    // cache() — 1 query por render
hasEssentialAccess(): Promise<boolean>
hasProAccess(): Promise<boolean>

requireEssentialAccess(): Promise<UserAccess>  // redirect() se não tiver
requireProAccess(): Promise<UserAccess>
requireAdmin(): Promise<UserAccess>            // via ADMIN_EMAILS
```

`cache()` do React memoiza dentro de um mesmo render — várias chamadas na mesma
árvore viram **uma** query só.

### Tipos (`types/access.ts`, novo — separado de `pricing.ts`)

```ts
type ProductType   = 'one_time' | 'annual_pro';
type LicenseStatus = 'active' | 'refunded' | 'chargeback' | 'cancelled' | 'expired';
type Plan          = 'none' | 'essential' | 'pro_annual';

interface License {
  id: string; userId: string;
  productType: ProductType; status: LicenseStatus;
  expiresAt: string | null;
  provider: string; providerOrderId: string | null;
}

/** Resultado CALCULADO — o que a UI e o backend consultam. Nunca persistido. */
interface UserAccess {
  userId: string | null;
  isAuthenticated: boolean;
  isBlocked: boolean;
  hasEssential: boolean;        // one_time ativa OU pro ativa
  hasPro: boolean;              // annual_pro ativa e não vencida
  plan: Plan;                   // maior plano ativo
  proExpiresAt: string | null;
}
```

**Decisão de modelagem:** uma usuária pode ter as **duas** licenças ao mesmo
tempo. Acesso é **agregado sobre todas as licenças**, nunca "a licença". E Pro é
superset de Essencial (`hasPro ⟹ hasEssential`), como a tabela de recursos do
`README.md` já indica.

Coerente com o resto do projeto: `UserAccess` é **derivado**, nunca persistido —
mesmo princípio de `fixedCostRate` e do custo de receita (ver `DECISIONS.md`,
2026-08-04). Persistir acesso calculado permitiria que ele ficasse obsoleto após
um reembolso.

---

## 5. Feature flags em código

`lib/features.ts` — sem I/O, testável isolado, mesmo espírito de `modules/pricing/`:

```ts
type FeatureKey =
  // Essencial
  | 'ingredients' | 'recipes' | 'pricing' | 'fixed_costs' | 'channels' | 'backup'
  // Pro
  | 'price_history' | 'cost_alerts' | 'cloud_sync' | 'ai_scanner'
  | 'reports' | 'pdf_export' | 'menu_engineering_advanced';

const FEATURES: Record<FeatureKey, { minPlan: 'essential' | 'pro_annual' }> = { /* ... */ };

canAccessFeature(access: UserAccess, key: FeatureKey): boolean
```

Um único ponto de decisão. **Nenhum `if (plan === 'pro')` espalhado pelo app** —
regra do `CLAUDE.md`. **Default é fechado:** chave sem entrada no mapa retorna
`false`, nunca `true`.

---

## 6. Separação Essencial × Pro

Por **rota** (Route Groups do App Router), não por condicional espalhada:

```
app/(app)/...     → requireEssentialAccess()  no layout do grupo
app/(pro)/...     → requireProAccess()        no layout do grupo
app/(admin)/...   → requireAdmin()            no layout do grupo
```

A checagem fica no `layout.tsx` do grupo e vale para tudo abaixo, sem repetir em
cada página. Dentro das telas, `canAccessFeature` só decide **o que mostrar**;
quem **autoriza** é o layout + RLS.

⚠️ Rotas protegidas precisam ser **dinâmicas**. Hoje as 6 rotas do app são
estáticas (`○ Static` no build) — conteúdo estático é gerado no build e
compartilhado entre todas as usuárias. Ao proteger uma rota, confirmar no output
do `npm run build` que ela deixou de ser `○`.

---

## 7. Bloqueio por reembolso / chargeback / cancelamento

Fluxo: webhook (Fase 6) → `licenses.status = 'refunded'` (ou `chargeback` /
`cancelled`) + linha em `license_events` para auditoria.

O efeito é **imediato e automático**, porque `getCurrentUserAccess()` e
`has_pro_access()` leem `status` a cada verificação — **não existe cache de
licença com TTL**. Nenhuma sessão precisa ser invalidada manualmente.

Três gatilhos independentes de revogação:

1. `licenses.status` ≠ `'active'` → aquela licença não conta;
2. `expires_at` no passado (só `annual_pro`) → Pro cai, Essencial permanece se
   houver `one_time` ativa;
3. `profiles.is_blocked = true` → **mata tudo**, independente de licença
   (bloqueio manual do admin, Fase 7).

---

## 8. Estratégia de dados: local agora, nuvem só no Pro

### ⚠️ O maior risco técnico desta fase — e por que ele não se materializa

A API de storage atual é **síncrona** (`loadIngredients(): Ingredient[]`), porque
`useSyncExternalStore` exige um `getSnapshot()` síncrono. Supabase é
**assíncrono**. Não é possível "trocar a implementação por baixo": a assinatura
muda de `T` para `Promise<T>` e **os 5 stores e todas as telas quebram**.

A decisão da Fase 2-1 ("storage desacoplado, trocável por Supabase depois")
resolveu **acoplamento**, mas não resolve **sincronia**. Registrado como correção
em `DECISIONS.md` (2026-08-05).

**O que de-risca isso quase inteiramente:** pelo `README.md`, "Sincronização em
nuvem / multi-dispositivo" é recurso **exclusivo do Pro**. Portanto:

- **Essencial continua 100% em `localStorage`.** Não migra nada. Zero risco de
  quebrar o que já funciona.
- **Só o Pro ganha nuvem**, em fase própria e posterior. O padrão previsto:
  `localStorage` vira **cache** síncrono (o `getSnapshot` continua funcionando),
  com hidratação e write-through assíncronos por cima.

**Consequência prática: a Fase 4 não migra dado nenhum.** Login e licença entram
*por cima* do app local intacto. A migração de dados é problema da fase de nuvem
do Pro, com o `backup export/import` (Fase 2-8) como rede de segurança.

---

## 9. Arquivos previstos para a implementação

```
supabase/migrations/
  0001_profiles.sql            -- tabela + trigger de signup + RLS
  0002_licenses.sql            -- licenses + license_events + constraints + índices
  0003_access_functions.sql    -- has_essential_access() / has_pro_access()
  0004_rls_policies.sql        -- policies (licenses read-only p/ cliente)

services/supabase/
  client.ts                    -- browser (anon)
  server.ts                    -- RSC / Server Actions (anon + cookies)
  admin.ts                     -- service role — server-only, Route Handlers

types/access.ts                -- ProductType, LicenseStatus, License, UserAccess
lib/auth/dal.ts                -- server-only: getCurrentUserAccess, require*
lib/features.ts                -- FeatureKey, FEATURES, canAccessFeature
proxy.ts                       -- raiz. NÃO middleware.ts (Next 16)

app/(auth)/login/page.tsx
app/(auth)/cadastro/page.tsx
app/acesso-bloqueado/page.tsx
```

---

## 10. Riscos de segurança

| # | Risco | Mitigação |
|---|---|---|
| 1 | `getSession()` no servidor (cookie forjável) | Só `getUser()`. Grep obrigatório no review da fase. |
| 2 | `SUPABASE_SERVICE_ROLE_KEY` vazar no bundle | Nunca prefixo `NEXT_PUBLIC_`; só em Route Handlers; `server-only` no client admin. |
| 3 | Cliente inserir a própria licença | Zero policy de escrita em `licenses`. **A mais crítica.** |
| 4 | Cliente alterar o próprio `is_blocked` | Tabela separada só-service_role (preferido) ou trigger de rejeição. |
| 5 | Confiar no `proxy.ts` como autorização | O doc do Next é explícito: otimista só. Autorização no DAL + RLS. |
| 6 | Regra de acesso divergir entre TS e SQL | Teste comparando as duas contra a mesma matriz de casos. |
| 7 | Rota estática vazar conteúdo Pro | Rotas protegidas devem ser dinâmicas — conferir o `○` no build. |
| 8 | `SECURITY DEFINER` sem `search_path` fixo | `SET search_path = public` em toda função. |
| 9 | Admin por `ADMIN_EMAILS` sem 2º fator | Aceitável no MVP; documentar como limite conhecido. |
| 10 | Enumeração de e-mail no login | Mensagem genérica: "e-mail ou senha inválidos". |

**Risco #6 em detalhe:** a mesma regra de acesso vai existir em dois lugares —
TypeScript (DAL) e SQL (`has_pro_access`). Se divergirem, a UI mostra uma coisa e
o banco permite outra. Mitigação: uma matriz de casos (sem licença, one_time
ativa, one_time reembolsada, pro ativa, pro vencida, pro + one_time, bloqueada)
verificada contra as duas implementações.

---

## 11. Subfases sugeridas

| Subfase | Escopo | Entregável verificável |
|---|---|---|
| **4-1** | Supabase clients + Auth + `profiles` + trigger + RLS | Cadastrar / entrar / sair funcionando; `profiles` criado no signup |
| **4-2** | `licenses` + `license_events` + RLS + funções SQL de acesso | Licença inserida via SQL vira acesso; cliente **não** consegue inserir |
| **4-3** | `types/access.ts` + DAL | `getCurrentUserAccess` correto nas 7 combinações da matriz |
| **4-4** | `lib/features.ts` + `canAccessFeature` | Matriz features × planos testada isolada; default fechado |
| **4-5** | `proxy.ts` + Route Groups + telas de bloqueio | Rota Pro nega sem Pro, nos 3 níveis |
| **4-6** | `/precos` + gating do Pro na UI (= Fase 5 do `TASKS.md`) | Zero referência a plano mensal |

Cada subfase fecha em commit próprio, com `typecheck` / `lint` / `build` — a
cadência que vem funcionando desde a Fase 1.

---

## 12. Próximo passo recomendado

**Fase 2-8 — backup export/import** (rede de segurança dos dados locais), e só
então **Fase 4-1 — Supabase Auth + `profiles`**.

A 4-1 é a menor fatia que produz algo verificável de ponta a ponta (cadastrar,
entrar, sair, ver o `profiles` criado) e **não toca em nada do app local que já
funciona** — sem licença nenhuma ainda, sem gating de rota.

### Pendências herdadas da Fase 2 que valem resolver antes

Registradas no `REVIEW.md`, item por item:

- **Teste manual em navegador real** — pendente desde a Fase 2-2. Todas as fases
  validaram por SSR + lógica isolada, nunca por clique real. Vai ficar mais caro
  de corrigir depois que houver Auth na frente das telas.
- Padronizar entrada decimal (vírgula × ponto) entre formulários.
- Aviso de itens em uso antes de excluir.
