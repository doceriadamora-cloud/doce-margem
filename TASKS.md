# TASKS — Doce Margem

> Desenvolvimento por fases e em tarefas pequenas. **Não executar tudo de uma vez.**
> Marcar `[x]` ao concluir. Adicionar novas tarefas quando surgirem.
> Antes de iniciar uma nova fase: parar, resumir o que foi feito e aguardar aprovação.

**Fase atual:** Fase 1C-1 (canais e taxas) concluída → aguardando aprovação para a Fase 1C-2 (custos fixos e rateio).

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

### Fase 1C-2 — Custos fixos e rateio (pendente)
- [ ] Criar módulo de custos fixos (rateio por unidade)
- [ ] Mensalidade de canal entra no rateio de custos fixos
- [ ] Dados de exemplo + validação

### Fase 1C-3 — Pricing engine (pendente)
- [ ] Criar pricing engine (CMV, preço sugerido, margem, markup)
- [ ] Integrar custo de receita + custos fixos + taxas de canal
- [ ] Engenharia de cardápio (pode ir para fase própria se crescer)

## Fase 2 — Interface Essencial
- [ ] Criar layout base
- [ ] Criar dashboard inicial
- [ ] Criar tela de ingredientes
- [ ] Criar tela de receitas
- [ ] Criar tela de precificação simples (modo simples)
- [ ] Criar camada `storageService` (localStorage desacoplado)
- [ ] Criar backup export/import

## Fase 3 — Modo avançado
- [ ] Criar fator de correção
- [ ] Criar perda de produção
- [ ] Criar medidas caseiras
- [ ] Criar sub-receitas
- [ ] Criar multicanal
- [ ] Criar custos fixos
- [ ] Criar engenharia de cardápio

## Fase 4 — Acesso e licenças
- [ ] Preparar Supabase Auth
- [ ] Criar tabela/profiles
- [ ] Criar tabela/licenses
- [ ] Criar feature flags (`lib/features.ts`) + `canAccessFeature`
- [ ] Criar funções de acesso (getCurrentUserAccess, hasEssentialAccess, hasProAccess, require*)
- [ ] Criar proteção de acesso (middleware/server checks)
- [ ] Criar telas de bloqueio
- [ ] Aplicar RLS no Supabase

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
