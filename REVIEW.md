# REVIEW — Doce Margem

> Registro de revisão técnica, riscos e pendências. Atualizar ao final de cada fase.

## Revisões por fase

### Fase 0 — Setup e documentação
- **Status:** ✅ Concluída
- **O que foi feito:**
  - Projeto Next.js criado em `C:\dev\doce-margem` (fora de OneDrive/Desktop/Downloads).
  - Next.js 16.2.9, React 19.2.4, TypeScript 5 (strict), Tailwind CSS v4, ESLint 9, App Router, alias `@/*`.
  - Estrutura base de pastas: `app/`, `components/`, `lib/`, `modules/`, `services/`, `types/`, `hooks/`, `supabase/`, `public/` (`.gitkeep` nas pastas vazias).
  - `README.md`, `TASKS.md`, `REVIEW.md` criados como artefatos-guia.
  - `.env.example` criado com todas as variáveis previstas.
  - Script `typecheck` (`tsc --noEmit`) adicionado ao `package.json`.
  - `.gitignore` ajustado para versionar `.env.example` (mantendo `.env.local` ignorado).
  - Git já inicializado pelo create-next-app (repositório local).
  - **Etapa complementar (organização da documentação):**
    - Criado `DECISIONS.md` — histórico oficial de decisões (6 decisões iniciais registradas: local fora de pasta sincronizada; duas modalidades sem mensal; compra única = vitalícia da versão atual; acesso por login/licença revogável; modo simples padrão; cálculo separado da UI).
    - Motivo do `DECISIONS.md`: manter rastreabilidade cronológica das decisões arquiteturais/comerciais/de produto, sem perder histórico quando algo mudar.
    - Atualizado `CLAUDE.md` como memória permanente de execução (regras de fases, aprovação, docs vivas, comercial sem mensal, cálculo separado da UI, TS estrito, typecheck).
    - Revisado/atualizado `AGENTS.md` com papéis conceituais (Produto, Arquitetura, Domínio, Front-end, QA), preservando o bloco de regras do Next.js gerado pelo create-next-app.
    - Confirmação: **a Fase 1 (núcleo de cálculo) ainda NÃO foi iniciada** — nenhum código de cálculo foi escrito.
- **Problemas encontrados:**
  - `.gitignore` padrão ignorava `.env*` (incluindo `.env.example`) — corrigido com exceção `!.env.example`.
  - create-next-app instalou Next 16 (não 14). Atende ao requisito "14 ou superior"; sem impacto.
- **Riscos:** nenhum bloqueante nesta fase.
- **Pendências:**
  - Configurar e-mail noreply do GitHub antes do 1º commit (Fase 8).
  - Validar cálculos só será possível a partir da Fase 1.

### Fase 1 — Núcleo de cálculo

#### Fase 1A — Tipos base, unidades e ingredientes
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `types/pricing.ts`: tipos base (`BaseUnit`, `PurchaseUnit`, `UnitDimension`, `Ingredient`, `CalculatedIngredient`, `ValidationError`/`ValidationErrorCode`, `CalculationResult<T>`). Medidas caseiras (`HouseholdMeasure`) **declaradas mas não implementadas** (preparadas para receitas).
  - `modules/pricing/units.ts`: `getUnitDimension`, `areUnitsCompatible`, `convert` (kg↔g, l↔ml, un→un; bloqueia conversão entre dimensões).
  - `modules/pricing/validators.ts`: `validateIngredient` (nome, preço, quantidade, fator de correção, compatibilidade de unidade).
  - `modules/pricing/ingredients.ts`: `calculateIngredient` (custo por unidade-base), `applyCorrectionFactor`, `costForQuantity` (helper preparado para receitas, sem perdas).
  - `modules/pricing/examples.ts`: 4 ingredientes de exemplo + `runExampleValidations`/`allExamplesPass`.
  - `modules/pricing/index.ts`: barrel de exportação.
- **Validações executadas (todas PASS):**
  - Custo por unidade-base: Chocolate 0,038/g; Leite 0,006/ml; Ovo 0,80/un; Creme de leite 0,0225/g.
  - Conversões: kg→g=1000, l→ml=1000, g→kg=1; kg↔ml incompatível; `convert(kg→ml)` lança erro.
  - Entrada inválida rejeitada com 5 erros (nome vazio, preço negativo, quantidade zero, fator ≤ 0, unidade incompatível).
  - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- **Problemas encontrados:**
  - Node 24 não resolve import de TS sem extensão; mantive imports idiomáticos no código (extensionless + alias `@/`) e validei compilando os módulos para CJS num diretório temporário (scratchpad), fora do projeto. Decisão registrada em DECISIONS.md.
- **Riscos:**
  - Precisão de ponto flutuante em divisões (mitigado com tolerância `EPSILON` nas comparações).
  - Ainda sem framework de testes formal — validação é por script puro; reavaliar na Fase 1C.
- **Pendências:**
  - Receitas, rendimento, perdas, sub-receitas, medidas caseiras (Fase 1B).
  - Canais, custos fixos, pricing engine (Fase 1C).

#### Fase 1B-1 — Receitas simples e rendimento
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `types/pricing.ts`: tipos `RecipeItem`, `Recipe`, `CalculatedRecipeItem`, `CalculatedRecipe` + novos códigos de erro (`EMPTY`, `OUT_OF_RANGE`, `NOT_FOUND`, `INVALID_INGREDIENT`).
  - `modules/pricing/recipe-validators.ts`: `validateRecipe` (nome, itens, rendimento, perda, quantidade do item, unidade, ingrediente inexistente, ingrediente inválido da Fase 1A).
  - `modules/pricing/recipes.ts`: `calculateRecipe` — converte a unidade do item para a base do ingrediente, aplica fator de correção, soma custos, aplica perda e calcula custo unitário.
  - `modules/pricing/examples.ts`: ingredientes e receita do brigadeiro + `runRecipeValidations`/`allRecipeExamplesPass`.
  - `modules/pricing/index.ts`: reexporta receitas, validadores e tipos de receita.
- **Validações executadas (todas PASS):**
  - Brigadeiro: custo total bruto R$ 9,30; custo com perda (0%) R$ 9,30; custo unitário R$ 0,465 (20 un).
  - Receita inválida rejeitada com 4 erros (sem nome, sem itens, rendimento 0, perda ≥ 100%).
  - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- **Decisões de implementação (não estruturais):**
  - **Perda como porcentagem:** `productionLossPercent` é guardado em % (0 a <100). A fórmula do briefing (`1 - perdaPercentual`) foi implementada como `1 - perda/100`, coerente com o intervalo 0–100.
  - **Nome do campo de rendimento:** usei `yieldQuantity` + `yieldUnit` (em vez de `yield`) para evitar a palavra reservada `yield` do JS em destructuring.
  - **Unidade do item convertida:** a quantidade usada é convertida da unidade do item para a unidade-base do ingrediente antes do custo (suporta, ex., usar "kg" num ingrediente com base "g").
- **Problemas encontrados:** nenhum bloqueante. Diagnostics transitórios do editor (import "não usado") desapareceram após adicionar os usos; typecheck final limpo.
- **Riscos:**
  - Precisão de ponto flutuante (ex.: 9,2999…); mitigado com tolerância `RECIPE_EPSILON` (1e-6) nas comparações.
  - Guard defensivo (`throw`) em `calculateRecipe` para invariante já garantida por `validateRecipe` — não deve ser atingido.
- **Pendências:** sub-receitas, medidas caseiras, exemplos adicionais de receitas (Fase 1B-2).

#### Fase 1B-2 — Sub-receitas
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `types/pricing.ts`: item de receita virou **união discriminada** por `kind` — `IngredientRecipeItem` | `SubRecipeItem` (= `RecipeItem`). Itens calculados também: `CalculatedIngredientItem` | `CalculatedSubRecipeItem` (= `CalculatedRecipeItem`). Novo código de erro `CIRCULAR_REFERENCE`.
  - `modules/pricing/units.ts`: helper `isPurchaseUnit` (type guard).
  - `modules/pricing/recipe-validators.ts`: validação recursiva de sub-receitas + detecção de ciclo via conjunto de ancestrais; `isUnitCompatibleWithYield`.
  - `modules/pricing/recipes.ts`: `calculateRecipe` agora aceita `recipesById` e calcula sub-receitas recursivamente; guard de invariante contra ciclo.
  - `modules/pricing/examples.ts`: Recheio de brigadeiro (rendimento 500 g) + Brownie com recheio + `runSubRecipeValidations`/`allSubRecipeExamplesPass`.
  - `modules/pricing/index.ts`: reexporta os novos tipos.
- **Como a sub-receita é calculada:** custo por unidade de rendimento = custo total com perda ÷ rendimento. Uso parcial: custo do item = quantidade (convertida p/ a unidade de rendimento) × custo por unidade de rendimento.
- **Bloqueio de ciclo:** durante a validação, cada chamada recursiva carrega um `Set` com os ids do caminho atual; se a receita já estiver no conjunto, emite `CIRCULAR_REFERENCE` e para. Pega ciclos diretos (A↔B) e indiretos (A→B→C→A).
- **Validações executadas (todas PASS):**
  - Recheio custo por g R$ 0,0186; Brownie: recheio R$ 2,79, total R$ 8,59, unitário R$ 0,859.
  - Ciclo direto e indireto bloqueados; sub-receita inexistente e sub-receita com rendimento 0 rejeitadas.
  - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- **Decisão de implementação:** mantive a lógica de sub-receita dentro de `recipes.ts`/`recipe-validators.ts` (não criei `sub-recipes.ts`), pois a recursão é intrínseca ao cálculo/validação de receita — separar fragmentaria a lógica e exigiria expor o estado de ancestrais. Registrado em DECISIONS.md.
- **Problemas encontrados:** os diagnostics do editor apareceram defasados durante a refatoração da união (apontando linhas da versão anterior); o `npm run typecheck` final ficou limpo.
- **Riscos:**
  - Float (ex.: 2,7899…); mitigado por tolerância `RECIPE_EPSILON`.
  - Guard `throw` em `calculateRecipeUnchecked` para invariante já garantida pela validação.
- **Pendências:** medidas caseiras + densidades, exemplos adicionais (Fase 1B-3).

#### Fase 1B-3 — Medidas caseiras e mais exemplos
- **Status:** ⏳ Não iniciada (aguardando aprovação)

### Fase 2 — Interface Essencial
- **Status:** ⏳ Não iniciada
- O que foi feito:
- Problemas encontrados:
- Riscos:
- Pendências:

## Checklist técnico
- [x] O projeto está em C:\dev\doce-margem
- [x] Não há dependência de OneDrive
- [x] A lógica de cálculo está separada da UI _(módulos puros em `modules/pricing/`, sem UI)_
- [~] Os cálculos principais foram validados _(ingredientes/unidades validados na Fase 1A; receitas/canais/engine pendentes)_
- [ ] A interface simples não assusta iniciantes
- [ ] O modo avançado preserva recursos profissionais
- [x] Não existe plano mensal _(nada de mensal documentado)_
- [ ] Compra única tem acesso controlado
- [ ] Reembolso revoga acesso
- [x] Plano Pro é anual _(modelo definido no README)_
- [ ] Permissões não dependem apenas do frontend
- [ ] Webhooks estão protegidos
- [ ] Admin está protegido
- [ ] Build passa _(validar na Fase 8; ambiente já roda)_

## Checklist de produto
- [x] Promessa principal está clara _(documentada no README)_
- [ ] Essencial resolve a dor principal
- [ ] Pro Anual tem valor recorrente real
- [ ] Usuária iniciante entende o primeiro passo
- [ ] Recursos avançados não aparecem cedo demais
- [ ] Backup está claro
- [ ] Bloqueio de acesso tem copy clara

## Riscos conhecidos
- Complexidade excessiva para confeiteiras iniciantes.
- Quebrar a matemática ao refatorar.
- Depender apenas do frontend para bloquear acesso.
- Criar SaaS robusto antes do Essencial vendável.
- Misturar compra única com assinatura sem regra clara.
