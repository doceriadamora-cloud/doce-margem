# TASKS — Doce Margem

> Desenvolvimento por fases e em tarefas pequenas. **Não executar tudo de uma vez.**
> Marcar `[x]` ao concluir. Adicionar novas tarefas quando surgirem.
> Antes de iniciar uma nova fase: parar, resumir o que foi feito e aguardar aprovação.

**Fase atual:** Fase 4-1B concluída (Supabase client de servidor + cadastro/login/logout/conta). Fase 2-8 com backup concluído; polimentos restantes pendentes.
**Próximo passo recomendado:** confirmar um e-mail de teste ponta a ponta no navegador → depois Fase 4-2 (licenças no banco).

## Fase 0 — Setup e documentação ✅
- [x] Criar projeto em C:\dev\doce-margem
- [x] Criar README.md
- [x] Criar TASKS.md
- [x] Criar REVIEW.md
- [x] Configurar Next.js, TypeScript e Tailwind
- [x] Criar estrutura base de pastas
- [x] Adicionar script `typecheck`
- [x] Criar `.env.example`
- [x] Ajustar `.gitignore` para versionar `.env.example`

### Fase 0 — Etapa complementar (organização da documentação) ✅
- [x] Criar `DECISIONS.md` (histórico oficial de decisões) com as 6 decisões iniciais
- [x] Atualizar `CLAUDE.md` como memória permanente de execução
- [x] Revisar/criar `AGENTS.md` com os papéis conceituais (preservando regras do Next.js)

## Fase 1 — Núcleo de cálculo (dividida em subfases)

### Fase 1A — Tipos base, unidades e ingredientes ✅
- [x] Criar tipos base (`types/pricing.ts`)
- [x] Criar módulo de unidades + conversões (`modules/pricing/units.ts`)
- [x] Criar módulo de ingredientes (custo por unidade-base) (`modules/pricing/ingredients.ts`)
- [x] Criar validações de domínio (`modules/pricing/validators.ts`)
- [x] Criar dados de exemplo de ingredientes + validação dos cálculos (`modules/pricing/examples.ts`)
- [x] Criar barrel de exportação (`modules/pricing/index.ts`)
- [x] Validar cálculos (custos, conversões, bloqueios e entrada inválida) e rodar `typecheck` + `lint`

### Fase 1B-1 — Receitas simples e rendimento ✅
- [x] Criar tipos de receita (`RecipeItem`, `Recipe`, `CalculatedRecipeItem`, `CalculatedRecipe`)
- [x] Criar módulo de receitas (ficha técnica) (`modules/pricing/recipes.ts`)
- [x] Implementar rendimento, custo total bruto, custo com perda e custo unitário
- [x] Aplicar fator de correção (vindo do ingrediente) nos itens
- [x] Implementar perda de produção simples (0 a <100%)
- [x] Criar validações de receita (`modules/pricing/recipe-validators.ts`)
- [x] Criar exemplo do brigadeiro + validação (`modules/pricing/examples.ts`)
- [x] Rodar `typecheck` + `lint` e validar o exemplo

### Fase 1B-2 — Sub-receitas ✅
- [x] Item de receita como união discriminada (ingrediente × sub-receita)
- [x] Tipos de sub-receita (`SubRecipeItem`, `CalculatedSubRecipeItem`, etc.)
- [x] Cálculo recursivo de sub-receita (custo por unidade de rendimento)
- [x] Uso parcial de sub-receita dentro de outra receita
- [x] Proteção contra referência circular (direta e indireta) — código `CIRCULAR_REFERENCE`
- [x] Validações de sub-receita (inexistente, inválida, unidade, rendimento)
- [x] Exemplo Recheio de brigadeiro + Brownie com recheio + validação
- [x] Rodar `typecheck` + `lint`

### Fase 1B-3 — Medidas caseiras e mais exemplos ✅
- [x] Medidas caseiras (xícara, colher de sopa/chá/café) + densidades
- [x] Dados de exemplo de receitas adicionais (Brownie Ferrero, Cookie Kinder)

### Fase 1C-1 — Canais e taxas ✅
- [x] Tipos de canal e taxas (`SalesChannel`, `ChannelPriceBreakdown`)
- [x] Cálculo de preço necessário por canal (cobre taxas % + taxa fixa)
- [x] Detalhamento das taxas (comissão, pagamento, anúncio, taxa fixa, total, líquido)
- [x] Biblioteca inicial de canais (`defaultSalesChannels`) — Balcão/Pix, Cartão, WhatsApp, iFood Básico/Entrega, 99Food, Rappi, Uber Eats
- [x] Validações de canal (`channel-validators.ts`)
- [x] Exemplos manuais + validação (`runChannelValidations`)
- [x] Rodar `typecheck` + `lint`

### Fase 1C-2 — Custos fixos e rateio ✅
- [x] Tipos de custos fixos (`FixedCost`, `FixedCostCategory`, `FixedCostSummary`, `FixedCostCalculationInput`)
- [x] Total mensal de custos fixos ativos (inativos excluídos)
- [x] Inclusão opcional das mensalidades dos canais (`monthlyFee` da Fase 1C-1)
- [x] Percentual de custo fixo sobre faturamento estimado (`fixedCostRate`)
- [x] Custo fixo médio por unidade quando há volume estimado (`fixedCostPerUnit`)
- [x] Validações (`fixed-cost-validators.ts`)
- [x] Exemplos manuais + validação (`runFixedCostValidations`)
- [x] Rodar `typecheck` + `lint`

### Fase 1C-3 — Pricing engine ✅
- [x] Tipos do pricing engine (`PricingEngineInput`, `PricingEngineResult`, `ChannelSuggestedPriceBreakdown`, `PracticedPriceComparison`, `PriceComparisonStatus`)
- [x] Preço sugerido sem canal (`custo direto / (1 − fixedCostRate − desiredProfitRate)`)
- [x] Custo fixo rateado, custo total unitário e lucro esperado em R$
- [x] Preço sugerido com canal (percentuais do canal no denominador + taxa fixa)
- [x] Detalhamento das taxas do canal (comissão, pagamento, anúncio, taxa fixa, líquido final)
- [x] Margem esperada e markup esperado (+ markup %)
- [x] Comparação preço praticado × sugerido (diferença R$/%, margem/markup reais, status)
- [x] Validações (`pricing-validators.ts`)
- [x] Integração receita + custos fixos + canal validada (brigadeiro + fixedCostRate + iFood)
- [x] Exemplos manuais + validação (`runPricingEngineValidations`)
- [x] Rodar `typecheck` + `lint`

### Engenharia de cardápio (pendente — fase própria)
- [ ] Classificação de itens (estrela, vaca leiteira, quebra-cabeça, abacaxi)
- [ ] Popularidade × margem; recomendações

## Fase 2 — Interface Essencial (dividida em subfases)

### Fase 2-1 — storageService local ✅
- [x] Tipos do estado local (`types/app-state.ts`)
- [x] storageService desacoplado, só client-side (`services/storage-service.ts`)
- [x] Funções salvar/carregar ingredientes, receitas, custos fixos e canais customizados
- [x] Função para limpar dados locais (`clearAppState`)
- [x] Versionamento simples do schema local (`schemaVersion`)
- [x] Validações contra JSON inválido, schema ausente/desconhecido e campos ausentes/corrompidos (fallback seguro, nunca lança)
- [x] Exemplos/validações manuais (`services/storage-examples.ts`)
- [x] Barrel de exportação (`services/index.ts`)
- [x] Rodar `typecheck` + `lint`

### Fase 2-2 — Layout base e dashboard inicial ✅
- [x] Layout base (`app/layout.tsx`) — metadata, `lang="pt-BR"`, cabeçalho fixo
- [x] Navegação principal (`components/layout/Header.tsx`) — marca + seções (Ingredientes/Receitas/Precificação marcadas "em breve", sem linkar rota inexistente)
- [x] Dashboard inicial (`components/dashboard/Dashboard.tsx`) — cards de resumo, próximos passos, estado vazio, aviso de storage local
- [x] Card reutilizável de estatística (`components/dashboard/StatCard.tsx`)
- [x] Leitura do storageService da Fase 2-1 via `useSyncExternalStore` (sem hydration mismatch, sem `useEffect`+`setState`)
- [x] Estado vazio amigável quando não há nenhum dado cadastrado
- [x] Aviso quando `localStorage` está indisponível (`isStorageAvailable`)
- [x] Responsividade básica (grid 1→2→4 colunas)
- [x] Testado com o servidor de dev real (SSR sem erros, conteúdo esperado no HTML)
- [x] Rodar `typecheck` + `lint`

### Fase 2-3 — Tela simples de ingredientes ✅
- [x] Rota `/ingredientes` (`app/ingredientes/page.tsx`)
- [x] Link real para Ingredientes no Header (`components/layout/Header.tsx`) — e correção do estado ativo (`usePathname`, antes fixo em "Painel")
- [x] Formulário de cadastro (`components/ingredients/IngredientForm.tsx`) — nome, quantidade comprada, unidade de compra, preço pago, unidade-base, fator de correção (padrão 1)
- [x] Listagem dos ingredientes cadastrados (`components/ingredients/IngredientList.tsx`) — mostra custo por unidade-base
- [x] Botão para excluir ingrediente
- [x] Estado vazio amigável
- [x] Persistência via `storageService` (`saveIngredients`/`loadIngredients`, através de `@/services`)
- [x] Store reativo (`components/ingredients/ingredients-store.ts`) — resolve a pendência registrada em `DECISIONS.md` sobre invalidar o cache do `useSyncExternalStore` ao escrever
- [x] Validação com `validateIngredient` (Fase 1A) — nenhuma regra de validação reimplementada na UI
- [x] Custo calculado com `calculateIngredient` (Fase 1A) — prévia no formulário e valor na listagem
- [x] Testado com o servidor de dev real + validação isolada do store (16 checagens)
- [x] Rodar `typecheck` + `lint`

### Fase 2-4 — Tela simples de receitas ✅
- [x] Rota `/receitas` (`app/receitas/page.tsx`)
- [x] Link real para Receitas no Header (`components/layout/Header.tsx`)
- [x] Formulário de cadastro (`components/recipes/RecipeForm.tsx`) — nome, seleção de ingredientes já cadastrados, quantidade usada, unidade, rendimento, unidade do rendimento, perda de produção (padrão 0)
- [x] Seleção de ingrediente lê o mesmo store da Fase 2-3 (`components/ingredients/ingredients-store.ts`) — reativo, sem duplicar leitura de storage
- [x] Listagem das receitas cadastradas (`components/recipes/RecipeList.tsx`) — mostra custo total e custo unitário
- [x] Botão para excluir receita
- [x] Estado vazio amigável (+ aviso quando não há nenhum ingrediente cadastrado ainda)
- [x] Persistência via `storageService` (`saveRecipes`/`loadRecipes`, através de `@/services`)
- [x] Store reativo (`components/recipes/recipes-store.ts`) — mesmo padrão do store de ingredientes (`DECISIONS.md`)
- [x] Validação com `validateRecipe` e cálculo com `calculateRecipe` (Fase 1B) — nenhuma regra reimplementada na UI
- [x] Não criou sub-receitas nem medidas caseiras na interface (só itens de ingrediente)
- [x] Testado com o servidor de dev real + validação isolada do store (18 checagens, incluindo o exemplo exato da tarefa: Brownie simples → custo total R$ 3,80, custo unitário R$ 0,38/un)
- [x] Rodar `typecheck` + `lint`

### Fase 2-5 — Tela simples de precificação ✅
- [x] Rota `/precificacao` (`app/precificacao/page.tsx`)
- [x] Link real para Precificação no Header (`components/layout/Header.tsx`) — todas as 4 seções principais agora têm tela própria; removido o bloco de rótulos "em breve" (ficaria sempre vazio)
- [x] Seleção de receita cadastrada + custo calculado com `calculateRecipe` (custo total, rendimento, custo unitário)
- [x] Campo de custo fixo sobre faturamento (%) — convertido para decimal antes de ir ao pricing engine, não persistido
- [x] Campo de lucro desejado (%) — convertido para decimal
- [x] Seleção de canal (biblioteca padrão da Fase 1C-1 + canais customizados do storage, sem CRUD de canais)
- [x] Campo opcional de preço praticado + comparação com o sugerido (status abaixo/no ideal/acima)
- [x] Resultado completo com `calculatePricing` — custo direto, custo fixo, lucro esperado, preço sem canal, preço com canal, taxas do canal, margem, markup, praticado, diferença, status
- [x] Store de leitura para canais customizados (`components/channels/channels-store.ts`) — só leitura, sem CRUD ainda
- [x] Reaproveita os stores de ingredientes (Fase 2-3) e receitas (Fase 2-4) já existentes, sem duplicar leitura de storage
- [x] Calculadora ao vivo (sem botão "calcular"): resultado aparece assim que os campos fazem sentido
- [x] Validado com o cenário exato da tarefa (Brownie simples, custo fixo 23,1%, lucro 20%): preço sugerido sem canal ≈ R$ 0,6678; com iFood Básico, preço maior
- [x] Testado com o servidor de dev real + validação isolada do cálculo (11 checagens)
- [x] Rodar `typecheck` + `lint`

### Fase 2-6 — Configurações financeiras básicas ✅
- [x] Rota `/configuracoes` (`app/configuracoes/page.tsx`)
- [x] Link real para Configurações no Header (`components/layout/Header.tsx`)
- [x] `BusinessSettings` novo em `types/app-state.ts` (`estimatedMonthlyRevenue`, `estimatedMonthlyUnits`, `updatedAt`) — guarda só insumos, nunca o percentual calculado
- [x] `storageService` (`services/storage-service.ts`): `createEmptyBusinessSettings`, `normalizeBusinessSettings`, `saveBusinessSettings`/`loadBusinessSettings` — `APP_STATE_SCHEMA_VERSION` **não** foi incrementada (compatibilidade via reconstrução campo a campo, já estabelecida na Fase 2-1)
- [x] `services/storage-examples.ts` ampliado: 16 checagens agora (era 13), incluindo o teste explícito de dado antigo pré-Fase 2-6 sem `businessSettings`
- [x] **Parte 1 — Custos fixos:** `components/fixed-costs/fixed-costs-store.ts` (novo store reativo), `FixedCostForm.tsx` (nome, categoria, valor mensal, ativo/inativo, observação), `FixedCostList.tsx` (lista + excluir) — usa `validateFixedCost` (Fase 1C-2), nenhuma regra reimplementada
- [x] **Parte 2 — Configurações:** `components/settings/business-settings-store.ts` (novo, objeto único — `updateBusinessSettings`, não uma lista), `BusinessSettingsForm.tsx` (faturamento + volume estimado, resumo ao vivo com `calculateFixedCostSummary`)
- [x] **Parte 3 — Canais customizados:** `components/channels/channels-store.ts` **estendido** (ganhou `addCustomChannel`/`removeCustomChannel`, exatamente como o `DECISIONS.md` da Fase 2-5 já previa), `CustomChannelForm.tsx`, `CustomChannelList.tsx` — usa `validateChannel` (Fase 1C-1), sem edição (só criar/listar/excluir)
- [x] **Parte 4 — Integração com precificação:** `PricingForm.tsx` calcula o percentual via `calculateFixedCostSummary` (custos fixos + faturamento salvos) e pré-preenche o campo "Custo fixo sobre faturamento (%)" — edição manual continua livre; sem configuração salva, comportamento idêntico ao da Fase 2-5
- [x] Validado com o cenário clássico (custos fixos R$ 2.310, faturamento R$ 10.000) → 23,1%, batendo com o texto exato que o campo de precificação recebe ("23,1")
- [x] Testado com o servidor de dev real (5 rotas) + validação isolada (12 checagens de integração + 16 do storageService, incluindo compatibilidade retroativa)
- [x] Rodar `typecheck` + `lint`

### Revisão da Fase 2 — fluxo completo ✅
- [x] Revisar navegação principal, 5 rotas, 5 stores, storage-service, app-state e documentação
- [x] **Bug real corrigido:** Painel mostrava contagens desatualizadas após cadastro em outra tela (`Dashboard.tsx` tinha cache próprio com `subscribe` no-op) — agora lê os stores reativos das telas de CRUD
- [x] Validar app com localStorage vazio, com dados antigos sem `businessSettings`, e com ingrediente excluído em uso por receita
- [x] Confirmar ausência de hydration bug (todas as rotas estáticas + `useSyncExternalStore` com snapshots estáveis)
- [x] Corrigir documentação desatualizada em `PricingForm.tsx` e `ingredients-store.ts`
- [x] Rodar `typecheck` + `lint` + `build`
- [x] Registrar 8 pendências de UX/futuro no `REVIEW.md` (não implementadas)

### Fase 2-7 — Ajustes finais de UX da Interface Essencial ✅
- [x] Confirmação (`window.confirm`) antes de excluir ingrediente, receita, custo fixo e canal customizado
- [x] Edição básica de ingredientes, receitas, custos fixos e canais — reaproveita o próprio formulário (botão "Editar" na lista → formulário pré-preenchido → "Salvar alterações"/"Cancelar edição") — sem duplicar o item editado
- [x] 4 novos componentes `*Screen.tsx` (`IngredientsScreen`, `RecipesScreen`, `FixedCostsScreen`, `CustomChannelsScreen`) — donos do estado "qual item está em edição agora"
- [x] 4 stores ganharam `updateX(id, dado)` — preserva o id original, não duplica, persiste e notifica (mesmo padrão de `addX`/`removeX`)
- [x] Precificação: mensagens de erro específicas quando custo fixo, lucro ou preço praticado têm texto inválido (não vazio) — campo vazio continua calculando normalmente quando aplicável (preço praticado)
- [x] Nenhuma alteração em `modules/pricing/` — só consumo das funções já existentes
- [x] Validado com 17 checagens isoladas das 4 funções `updateX` (não duplica, preserva id, persiste, notifica, não afeta outros itens da lista)
- [x] Rodar `typecheck` + `lint` + `build`
- [x] Testado com o servidor de dev real (5 rotas, sem erro)
- [x] `REVIEW.md` atualizado — pendências 1/2/3 da revisão anterior resolvidas; pendências 4-8 mantidas para fases futuras

### Fase 2-8 — Backup + polimento (em andamento)
- [x] Criar backup export/import (usando o storageService da Fase 2-1) — **pré-requisito da Fase 4** (rede de segurança dos dados locais antes de mexer em acesso)
  - [x] Criar `services/backup-service.ts` com exportação, parse/validação e importação segura
  - [x] Criar seção "Backup dos dados" em `/configuracoes`
  - [x] Exportar JSON com `appName`, `backupVersion`, `schemaVersion`, `updatedAt`, `exportedAt` e `data`
  - [x] Validar JSON inválido, app incorreto, data de exportação, formato e `schemaVersion`
  - [x] Normalizar dados antigos/parciais com `normalizeAppState`
  - [x] Pedir confirmação antes de sobrescrever os dados locais
  - [x] Recarregar stores reativos após importação
  - [x] Rodar `typecheck`, `lint` e `build`
- [ ] Padronizar entrada decimal entre todos os formulários (vírgula vs. ponto)
- [ ] Aviso de itens em uso antes de excluir (ex.: "este ingrediente é usado por 2 receitas")
- [ ] Teste manual em navegador real antes de seguir para Supabase/Auth — pendente no ambiente atual

## Fase 3 — Modo avançado
> Fica **depois** da Fase 4 na ordem de execução (decisão de 2026-08-05). O número
> foi mantido para preservar a rastreabilidade das referências já registradas.
- [ ] Criar fator de correção
- [ ] Criar perda de produção
- [ ] Criar medidas caseiras
- [ ] Criar sub-receitas
- [ ] Criar multicanal
- [ ] Criar custos fixos
- [ ] Criar engenharia de cardápio

## Fase 4 — Acesso e licenças
> 📋 **Planejada em `PLAN-FASE-4.md`** (2026-08-05) — arquitetura, tabelas, RLS,
> DAL, feature flags, riscos e as 6 subfases abaixo. Nenhum código escrito ainda.
> Pré-requisito: Fase 2-8 (backup export/import).

### Fase 4-1A — Base SQL de profiles ✅
- [x] Migration `supabase/migrations/0001_profiles.sql`
- [x] Tabela `public.profiles` (id, email, full_name, created_at, updated_at)
- [x] Tabela `public.user_access_flags` (user_id, is_blocked, created_at, updated_at) — flags sensíveis isoladas
- [x] Trigger `on_auth_user_created` → cria perfil **e** flags no signup (`security definer`, `search_path` fixado, `on conflict do nothing`)
- [x] Trigger `set_updated_at` nas duas tabelas
- [x] Trigger `profiles_guard_immutable` — rejeita alteração de `id`/`email` por quem não é `service_role`
- [x] RLS habilitado nas duas tabelas
- [x] Policies: `profiles` select/update do próprio; `user_access_flags` **só select** do próprio
- [x] **Zero** policy de escrita em `user_access_flags` (a ausência É a proteção)
- [x] `grant update (full_name)` — única coluna de `profiles` que o cliente escreve
- [x] Índice `profiles_email_idx` para a busca do admin (Fase 7)
- [x] Rodar `typecheck` + `lint` (sem impacto — nenhum TS alterado)
- [ ] **Pendente de ambiente:** aplicar a migration num projeto Supabase real e verificar as invariantes (ver `REVIEW.md`)

### Fase 4-1B — Supabase client + Auth básico ✅
- [x] `@supabase/supabase-js` + `@supabase/ssr` instalados (únicas dependências novas)
- [x] `services/supabase/server.ts` — client de servidor (chave anônima + cookies), `getAuthUser()` com `getUser()`, `isSupabaseConfigured()`; `import "server-only"`
- [x] `app/auth/actions.ts` — Server Actions `signUpAction` / `signInAction` / `signOutAction`
- [x] `components/auth/form-state.ts` — tipo + estado inicial do formulário (fora do `"use server"`)
- [x] `components/auth/{AuthFormShell,LoginForm,SignupForm}.tsx`
- [x] `app/login/page.tsx`, `app/cadastro/page.tsx`, `app/conta/page.tsx`
- [x] `app/auth/callback/route.ts` — troca o `code` de confirmação por sessão; protegido contra open redirect
- [x] Header com área de conta (Entrar/Criar conta × Conta), estado vindo do layout server-side
- [x] `/conta` lê `profiles` e `user_access_flags` pela RLS da sessão; mostra e-mail, nome, status e aviso de que licença ainda não existe
- [x] `/conta` redireciona para `/login` sem sessão (verificado: 307)
- [x] App local continua funcionando sem Supabase configurado (`authEnabled = false` esconde a área de conta)
- [x] **Nenhum uso de `SUPABASE_SERVICE_ROLE_KEY`** (auditado: 0 leituras)
- [x] **Nenhum `getSession()`** — só `getUser()` (auditado: 0 usos)
- [x] Rodar `typecheck` + `lint` + `build`
- [x] Cadastro real testado contra o Supabase do projeto (usuária criada)
- [ ] **Pendente de ambiente:** confirmar o e-mail de uma conta de teste e percorrer login → `/conta` no navegador (ver `REVIEW.md`)
- [ ] **Pendente (Fase 4-5):** `proxy.ts` para renovar o token de sessão expirado

### Fase 4-1C — Limpeza pós-Auth (pendente)
- [ ] Remover a conta de teste criada durante a validação da 4-1B
- [ ] Decidir se a confirmação de e-mail fica ligada (hoje está) e ajustar a copy do cadastro
- [ ] Trigger de `update` em `auth.users` para espelhar troca de e-mail em `profiles.email`, se a UI oferecer isso

### Fase 4-2 — Licenças no banco (pendente)
- [ ] Migrations `licenses` + `license_events` (constraints, índices, idempotência)
- [ ] Funções SQL `has_essential_access()` / `has_pro_access()` (`SECURITY DEFINER`)
- [ ] RLS: `licenses` **read-only** para o cliente (sem policy de escrita)

### Fase 4-3 — DAL e tipos de acesso (pendente)
- [ ] `types/access.ts` (`ProductType`, `LicenseStatus`, `License`, `UserAccess`)
- [ ] `lib/auth/dal.ts` (`server-only`): `getCurrentUserAccess`, `hasEssentialAccess`, `hasProAccess`, `require*`
- [ ] Matriz de casos verificando TS × SQL (risco de divergência)

### Fase 4-4 — Feature flags (pendente)
- [ ] `lib/features.ts` + `canAccessFeature` (default fechado, sem tabela no banco)

### Fase 4-5 — Proteção de rotas (pendente)
- [ ] `proxy.ts` na raiz (**não** `middleware.ts` — renomeado no Next 16), só checagem otimista
- [ ] Route Groups `(app)` / `(pro)` / `(admin)` com `require*` no layout
- [ ] Tela `/acesso-bloqueado`
- [ ] Confirmar no build que rotas protegidas deixaram de ser estáticas

### Fase 4-6 — Preços e gating do Pro (= Fase 5 abaixo) (pendente)
- [ ] Página `/precos` separando Essencial e Pro Anual
- [ ] Recursos Pro bloqueados por `canAccessFeature`
- [ ] Confirmar zero referência a plano mensal

## Fase 5 — Produto final + Pro Anual
- [ ] Criar página de preços (/precos)
- [ ] Separar Essencial e Pro Anual
- [ ] Garantir que não há nenhuma referência a plano mensal
- [ ] Preparar recursos Pro bloqueados (rotas Pro)

## Fase 6 — Webhooks
- [ ] Criar webhook Kiwify (POST /api/webhooks/kiwify)
- [ ] Criar webhook Hotmart (POST /api/webhooks/hotmart)
- [ ] Criar tabela webhook_events
- [ ] Criar idempotência
- [ ] Criar lógica de venda aprovada, reembolso, chargeback, cancelamento e expiração

## Fase 7 — Admin
- [ ] Criar área admin (protegida por ADMIN_EMAILS)
- [ ] Buscar usuário por email
- [ ] Ver perfil e licenças
- [ ] Criar licença manual / ativar compra única / conceder Pro Anual
- [ ] Bloquear acesso
- [ ] Marcar reembolso / chargeback
- [ ] Ver webhooks e status de processamento

## Fase 8 — Revisão e deploy
- [ ] Rodar lint
- [ ] Rodar typecheck
- [ ] Rodar build
- [ ] Revisar segurança
- [ ] Preparar GitHub (e-mail noreply, repo, push main)
- [ ] Preparar Vercel (preset Next.js, variáveis de ambiente)

---

### Mapeamento (ordem de execução do briefing → fases acima)
A "ordem obrigatória de execução" do briefing agrupa algumas fases:
- Execução Fase 4 (Licenciamento e acesso) = Fases 4 + 5 acima.
- Execução Fase 5 (Webhooks e admin) = Fases 6 + 7 acima.
- Execução Fase 6 (Revisão e deploy) = Fase 8 acima.
