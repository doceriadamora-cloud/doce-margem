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

> ✅ **Implementado na Fase 4-1A:** `profiles` + `user_access_flags` em
> `supabase/migrations/0001_profiles.sql`. `is_blocked` **saiu** de `profiles` e
> virou tabela própria — ver decisão em `DECISIONS.md` (2026-08-05).

```sql
profiles          -- 1:1 com auth.users. Criada por trigger no signup.
  id            uuid PK REFERENCES auth.users(id) ON DELETE CASCADE
  email         text NOT NULL      -- espelho de auth.users.email; imutável p/ cliente
  full_name     text               -- ÚNICA coluna que o cliente pode atualizar
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()

user_access_flags -- flags SENSÍVEIS, isoladas. Zero policy de escrita p/ cliente.
  user_id       uuid PK REFERENCES profiles(id) ON DELETE CASCADE
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

✅ **`is_blocked` — resolvido na Fase 4-1A pela opção (b), com reforço.** Três
mecanismos independentes, porque RLS sozinha não resolve:

1. **Tabela separada** `user_access_flags`, sem nenhuma policy de escrita — RLS
   nega por padrão, só `service_role` grava.
2. **Privilégio por coluna** em `profiles`: `grant update (full_name)` apenas.
   RLS decide *quais linhas*; GRANT decide *quais colunas* — sem isso, a policy
   `profiles_update_own` deixaria a usuária alterar `email` e `created_at` da
   própria linha.
3. **Trigger de imutabilidade** rejeitando mudança em `profiles.id`/`email` para
   quem não é `service_role` — rede contra uma migration futura que faça um
   `grant update on profiles` amplo por engano (falha silenciosa, difícil de notar).

```sql
-- license_events: transparência de leitura, zero escrita pelo cliente.
CREATE POLICY license_events_select_own ON license_events
  FOR SELECT USING (user_id = auth.uid());
```

### A peça-chave: regra de acesso dentro do Postgres

Uma função `SECURITY DEFINER` que centraliza a regra, para as tabelas de dados do
Pro (fase futura de nuvem) referenciarem direto na policy:

> ✅ **Implementado na Fase 4-2A**, com **três correções** em relação ao rascunho
> abaixo (mantido como registro histórico):
> 1. `is_blocked` vem de **`user_access_flags`**, não de `profiles` — a Fase 4-1A
>    moveu essa coluna, e o rascunho, copiado literalmente, não compilaria.
> 2. `search_path = ''` (estrito, tudo qualificado) em vez de `= public`, para
>    ficar igual a `0001_profiles.sql`.
> 3. **As funções que recebem `uid` são INTERNAS** — sem `EXECUTE` para
>    `anon`/`authenticated`. O cliente e as policies usam as versões **sem
>    parâmetro** (`current_user_has_pro_access()` /
>    `current_user_has_essential_access()`), que resolvem `auth.uid()` por dentro
>    e por isso só respondem sobre quem chamou.
>
> ⚠️ **A policy de exemplo mais abaixo está desatualizada por causa de (3):**
> com o `EXECUTE` revogado, `has_pro_access(auth.uid())` numa policy falharia
> para `authenticated`. A forma correta é:
>
> ```sql
> using ( user_id = (select auth.uid()) and public.current_user_has_pro_access() )
> ```
>
> Versão real: `supabase/migrations/0002_licenses.sql` — 5 funções de acesso
> (3 internas, 2 expostas).

```sql
-- ⚠️ RASCUNHO HISTÓRICO — desatualizado. Ver 0002_licenses.sql.
CREATE FUNCTION public.has_pro_access(uid uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public          -- obrigatório em SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM licenses l
    JOIN profiles p ON p.id = l.user_id
    WHERE l.user_id = uid
      AND p.is_blocked = false     -- ⚠️ hoje mora em user_access_flags
      AND l.product_type = 'annual_pro'
      AND l.status = 'active'
      AND l.expires_at > now()
  );
$$;

-- Análoga: has_essential_access(uid) — one_time ativa OU pro ativa.

-- Uso futuro, em qualquer tabela de dados na nuvem:
-- ⚠️ Forma correta desde a 4-2A (a de baixo não funcionaria — EXECUTE revogado):
-- USING (user_id = (select auth.uid()) AND public.current_user_has_pro_access())
--
-- USING (user_id = auth.uid() AND has_pro_access(auth.uid()))   -- ❌ histórico
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
  0001_profiles.sql            -- ✅ FEITO (4-1A): profiles + user_access_flags,
                               --    triggers, RLS, grants por coluna
  0002_licenses.sql            -- ✅ APLICADA E VALIDADA (4-2A): licenses +
                               --    license_events, constraints, RLS, funções
                               --    de acesso e índices.
                               --    Absorveu o que seriam 0003 e 0004: separar
                               --    tabela, policy e função em migrations
                               --    distintas deixaria o schema num estado
                               --    inseguro entre uma e outra.

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
| **4-1A** ✅ | Migration `profiles` + `user_access_flags` + triggers + RLS + grants | SQL revisado; zero policy de escrita em `user_access_flags`; só `full_name` atualizável |
| **4-1B** | Supabase clients + telas de login/cadastro/logout | Cadastrar / entrar / sair funcionando; `profiles` criado no signup |
| **4-2A** ✅ | Migration `licenses` + `license_events` + RLS + funções SQL de acesso | SQL aplicado no Supabase real; tabelas, RLS, policies, grants, privilégios das funções e matriz de acesso validados |
| **4-2B** | Validações complementares no banco | Provar falhas reais de escrita, imutabilidade de `license_events` e constraint de idempotência |
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

---

# 13. Fase 4-7 — Webhook Kiwify (plano técnico)

> Escrito na **Fase 4-7A**. Nenhum código, nenhuma rota, nenhuma migration foi
> criada. Este capítulo é o que a 4-7B vai implementar.

Checkout do Essencial já existente: `https://pay.kiwify.com.br/i5YqT17`, apontado
pela `/precos` através de `NEXT_PUBLIC_BUY_ESSENTIAL_URL`.

Objetivo: **compra aprovada libera `one_time` sozinha; reembolso e chargeback
revogam sozinhos.**

## 13.1 Três achados do schema que mudam o plano

Levantados lendo `0001_profiles.sql` e `0002_licenses.sql`. Os três contrariam
suposições naturais sobre a fase, e por isso vêm primeiro.

### (A) "Compra antes do cadastro" é bloqueio físico, não caso de borda

```
licenses.user_id -> profiles.id -> auth.users.id
```

`profiles.id` é **PK e FK** para `auth.users`. Não existe `INSERT` em `licenses`
para um e-mail sem conta — nem com `service_role`, porque FK não é RLS. E
`profiles` só nasce pelo trigger `on_auth_user_created`, que dispara em
`auth.users`.

Consequência: o webhook **não tem como "criar ou localizar o profile"** a partir
de um e-mail solto. Ou existe `auth.users`, ou não existe licença.

### (B) `license_events` também não serve de fila de pendências

A ideia de "registrar pendência no histórico" esbarra em duas paredes:

- `event_type` tem `CHECK` de vocabulário fechado — `granted`, `renewed`,
  `refunded`, `chargeback`, `cancelled`, `expired`, `manual_block`,
  `manual_unblock`. Não há valor para "compra recebida, sem dono".
- `license_events.user_id` é nullable, então a linha órfã cabe fisicamente — mas
  seria usar a tabela de auditoria como fila de trabalho, e ela é **append-only
  por trigger** (nem `service_role` faz `UPDATE`). Uma pendência que não pode ser
  marcada como resolvida não é uma fila.

**Portanto: guardar pendência exige migration de qualquer forma.** A fase não tem
opção "sem tocar no banco" — só a escolha de *qual* mudança fazer (13.4).

### (C) A UNIQUE de idempotência tem um buraco em NULL

```sql
constraint licenses_provider_order_unique unique (provider, provider_order_id)
```

`provider_order_id` é nullable, e em Postgres **NULLs não conflitam entre si**.
O próprio comentário da migration registra isso como desejado — para licenças
manuais conviverem. O efeito colateral: se o payload da Kiwify vier sem o
identificador do pedido, ou se o parse falhar, **cada reenvio cria uma licença
nova** e a idempotência simplesmente não existe.

Regra que sai daí: **payload sem `provider_order_id` legível é rejeitado**, nunca
gravado com `NULL`. Ver 13.6.

## 13.2 Rota e forma

`POST /api/webhooks/kiwify` — Route Handler (`app/api/webhooks/kiwify/route.ts`).

- **Só `POST`.** Sem `GET`: uma rota de webhook que responde a `GET` vira alvo de
  varredura e, se algum dia logar, vira canal de ruído.
- **`export const runtime = "nodejs"`** — a verificação de assinatura usa `crypto`.
- **Nunca gateada.** Não passa por `requireEssentialAccess()` (é Route Handler,
  não página) e precisa ficar de fora do `matcher` do `proxy.ts` quando a Fase
  4-5C o criar. Um proxy que redirecione esta rota para `/login` quebra o
  faturamento em silêncio — a Kiwify recebe 307 e desiste.
- **Corpo lido como texto cru primeiro:** `const raw = await request.text()`, e só
  depois `JSON.parse(raw)`. Se a validação for HMAC, ela é sobre os bytes
  originais; `await request.json()` destrói o corpo e torna a verificação
  impossível. Esta ordem não é estilo, é requisito.

## 13.3 Variáveis de ambiente

| Variável | Situação | Uso |
|---|---|---|
| `KIWIFY_WEBHOOK_SECRET` | **já existe** no `.env.example` | validar a requisição |
| `SUPABASE_SERVICE_ROLE_KEY` | já existe, **ainda sem nenhum leitor** | única forma de gravar em `licenses` |
| `NEXT_PUBLIC_SUPABASE_URL` | já existe | endpoint do cliente admin |

**Sobre o nome:** o projeto já documenta `KIWIFY_WEBHOOK_SECRET`, com
`HOTMART_WEBHOOK_SECRET` no mesmo padrão. A Kiwify chama isso de "token" no
painel dela. **Recomendação: manter `KIWIFY_WEBHOOK_SECRET`** e registrar no
`.env.example` que é o token do painel — renomear para `_TOKEN` quebraria a
simetria com Hotmart e não compra nada. Aceitar os dois nomes está descartado:
duas fontes de verdade para um segredo é como um deles fica desatualizado sem
ninguém notar.

**Cliente admin isolado:** `services/supabase/admin.ts`, novo, com
`import "server-only"` e sem `persistSession`. A service role **não entra** em
`services/supabase/server.ts` — o arquivo que o app inteiro importa não pode ter
uma chave que ignora RLS ao alcance de um import errado.

## 13.4 Identificar a usuária — três caminhos, uma recomendação

O e-mail da compra é o único elo. Por (A), o caminho feliz é: e-mail existe em
`auth.users` -> pega `profiles.id` -> grava a licença. O problema é o outro caso.

| Caminho | O que faz | Custo | Risco |
|---|---|---|---|
| **1. Convidar** | webhook cria o usuário via Admin API (`inviteUserByEmail`), FK passa a existir, licença é gravada na hora | nenhuma migration | webhook passa a criar contas; e-mail de convite depende de SMTP configurado |
| **2. Fila** | migration `0003_pending_purchases` com `(provider, order_id, email, payload, resolved_at)`; `handle_new_user` reconcilia no cadastro | migration + alterar trigger | compra fica invisível para a compradora até ela se cadastrar |
| **3. Manual** | webhook só audita; admin concede (Fase 7) | nenhuma | não é automação — é o que a fase existe para eliminar |

**Recomendado: 1, com 2 como rede.** O convite resolve o caso comum com a melhor
experiência possível — paga, recebe e-mail, define senha, **já entra com a
licença ativa**. A fila cobre o que o convite não cobre: SMTP fora do ar, e-mail
recusado, ou a compradora que se cadastra depois com **outro** e-mail (13.8).

Decisão a tomar antes da 4-7B, porque muda o que a migration precisa ter.

**Normalização obrigatória em qualquer caminho:** e-mail sempre `trim` +
`lower`. `profiles.email` **não tem índice nem UNIQUE** (a unicidade real mora em
`auth.users`), então a busca por e-mail hoje é varredura e é sensível a
maiúsculas. A migration da 4-7B deve criar
`create unique index on public.profiles (lower(email))`.

## 13.5 Eventos tratados

| Evento Kiwify | Ação em `licenses` | `license_events.event_type` |
|---|---|---|
| `compra_aprovada` | `INSERT` `product_type='one_time'`, `status='active'`, `provider='kiwify'`, **`expires_at = NULL`** | `granted` |
| `compra_reembolsada` | `UPDATE status='refunded'` na licença do pedido | `refunded` |
| `chargeback` | `UPDATE status='chargeback'` na licença do pedido | `chargeback` |
| qualquer outro | nada | nada — responder **200** |

`expires_at = NULL` não é opcional: o `CHECK licenses_one_time_is_lifetime`
rejeita `one_time` com validade.

Revogação não precisa de nada além do `UPDATE`. As funções de acesso filtram
`status = 'active'` a cada chamada, e o DAL não persiste acesso — **o reembolso
vale na requisição seguinte, sem cache para invalidar.** Foi para isso que a
decisão de 2026-08-05 existiu.

## 13.6 Idempotência

Provedor de pagamento reenvia. Sempre. O plano tem duas camadas:

1. **Concessão:** `INSERT ... ON CONFLICT ON CONSTRAINT licenses_provider_order_unique DO NOTHING`.
   Reenvio de `compra_aprovada` não duplica licença.
2. **Pré-requisito, por causa de (C):** se `provider_order_id` não for extraído
   como string não-vazia, **rejeitar com 400 e não gravar nada**. Gravar `NULL`
   ali desliga a camada 1 sem nenhum sinal.

Revogação é `UPDATE` — **a UNIQUE não protege**. Reprocessar um `refunded` é
inofensivo (idempotente por natureza: mesmo status, mesmo resultado), mas gera um
`license_events` duplicado a cada reenvio. Aceitável para auditoria; se incomodar,
é argumento para `webhook_events` (13.9).

## 13.7 Auditoria

Um `INSERT` em `license_events` por webhook **válido e processado**:

- `source = 'webhook:kiwify'` — vocabulário já previsto na migration
- `payload` = corpo bruto recebido
- `license_id` / `user_id` quando conhecidos

**Requisição com token inválido não gera evento.** Se gerasse, qualquer um na
internet encheria a tabela de auditoria — e uma auditoria que o atacante escreve
não serve para o que ela existe (disputa de chargeback).

⚠️ `payload` guarda dados pessoais da compradora. A migration 0002 já previu isso:
`DELETE` em `license_events` é permitido a papéis administrativos justamente para
atender pedido de apagamento (LGPD).

## 13.8 Segurança

1. **Validar antes de qualquer parse de negócio.** Token/assinatura primeiro;
   payload não autenticado não chega a tocar no banco.
2. **Falhar fechado.** `KIWIFY_WEBHOOK_SECRET` ausente ou vazio -> **500 e nada
   processado**. Nunca "sem segredo configurado, aceita" — seria a versão webhook
   do bypass por env ausente que a decisão de 2026-08-06 já recusou.
3. **Comparação em tempo constante** (`crypto.timingSafeEqual`), com checagem de
   comprimento antes. `===` em segredo vaza informação por tempo de resposta.
4. **Service role só aqui.** Arquivo próprio, `server-only`, nunca importado por
   Client Component, nunca com prefixo `NEXT_PUBLIC_`.
5. **Resposta muda; não conta.** Nunca revelar se o e-mail existe — um webhook é
   um endpoint público, e responder "usuária não encontrada" o transforma em
   oráculo de enumeração de clientes.
6. **Sem log do payload cru** em produção (dado pessoal + possivelmente o
   segredo, se ele viajar na query string).

⚠️ **O mecanismo exato precisa ser confirmado contra uma requisição real antes de
implementar.** As duas formas conhecidas da Kiwify são token simples e HMAC do
corpo cru enviado em query string (`?signature=`). O código deve ser escrito para
a que for observada — não para a que for suposta. Por isso 13.10 vem antes da
implementação.

### Códigos de resposta (mais importante do que parece)

O código define se o provedor reenvia. Errar aqui produz reenvio infinito ou
perda silenciosa de venda:

| Situação | Código | Por quê |
|---|:--:|---|
| processado | 200 | fim |
| já processado (replay) | **200** | 4xx faria a Kiwify reenviar para sempre |
| evento não tratado | **200** | idem — não é erro |
| token inválido/ausente | 401 | recusa explícita, sem reenvio útil |
| corpo ilegível / sem `order_id` | 400 | reenviar não conserta |
| falha transitória (banco fora) | **500** | aqui o reenvio **é** a recuperação |

## 13.9 `webhook_events`: ainda faz sentido?

> ✅ **Decidido e implementado na Fase 4-7B:** sim. `supabase/migrations/0003_webhook_support.sql`
> cria a tabela, com uma diferença importante em relação ao rascunho abaixo — ela
> **não é append-only**. `license_events` é auditoria imutável; `webhook_events` é
> log de processamento e muda de estado (`received → processed | ignored | failed`).
> O índice de pedido **não** é único, porque o mesmo pedido gera aprovada e depois
> reembolso. O cliente não lê a tabela: RLS sem policy nenhuma e zero grants.
> `pending_purchases` **não** foi criada — a decisão de 13.4 (convite via Admin
> API) segue pendente e só ela dirá se a fila é necessária.

O `README.md` (linha 87) e o `TASKS.md` (Fase 6) prometem uma tabela
`webhook_events` que **não existe** — a 0002 resolveu idempotência com a UNIQUE
de `licenses`. Divergência a resolver.

A UNIQUE cobre replay de concessão. **Não cobre** replay de revogação (13.6), nem
falha no meio do processamento, nem "recebi mas ainda não processei". Se a 4-7B
adotar o caminho 2 de 13.4, `pending_purchases` e `webhook_events` são quase a
mesma tabela — vale desenhar as duas juntas em vez de criar duas migrations.

## 13.10 Ordem sugerida da 4-7B

1. **Capturar um payload real** (webhook.site apontado no painel da Kiwify) —
   antes de qualquer código. Sem isso, os nomes de campo são chute.
2. Confirmar o mecanismo de validação observando o cabeçalho/query da requisição.
3. Decidir 13.4 (convite × fila) e escrever a migration correspondente.
4. `services/supabase/admin.ts`.
5. O Route Handler.
6. Testar com o payload capturado, incluindo replay e token errado.

⚠️ **A URL pública só existe depois do deploy.** Localhost não recebe webhook. O
teste de ponta a ponta com compra real só é possível pós-deploy — e é o único
que prova a integração. Até lá, o payload capturado é o substituto.
