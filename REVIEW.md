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
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `modules/pricing/household-measures.ts` (novo): tabela de conversões caseiras por chave (`farinha_trigo`, `acucar`, `cacau`, `liquido`), função `getHouseholdConversion(key, measure)`. Conversão nunca produz `un`.
  - `types/pricing.ts`: `HouseholdMeasureRecipeItem` (novo), `CalculatedHouseholdMeasureItem` (novo). `RecipeItemKind` e `RecipeItem` / `CalculatedRecipeItem` atualizados para incluir o novo kind `"householdMeasure"`.
  - `modules/pricing/recipe-validators.ts`: `validateHouseholdMeasureItem` — valida chave inexistente, ingrediente `un`, dimensão incompatível (g × ml em qualquer direção), quantidade ≤ 0.
  - `modules/pricing/recipes.ts`: `calculateHouseholdMeasureItem` — converte `quantityUsed × amountPerMeasure`, aplica fator de correção e custo por unidade-base.
  - `modules/pricing/examples.ts`: `householdExampleIngredients` (5 ingredientes), `cookieKinderRecipe`, `brownierFerreroRecipe`, `runHouseholdMeasureValidations`, `allHouseholdMeasureExamplesPass`.
  - `modules/pricing/index.ts`: exporta `household-measures` e os novos tipos.
- **Fórmula de medida caseira:**
  - `quantityInBaseUnit = quantityUsed × amountPerMeasure` (da tabela)
  - `correctedQuantity = quantityInBaseUnit × correctionFactor`
  - `itemCost = correctedQuantity × costPerBaseUnit`
- **Validações executadas (todas PASS):**
  - Farinha 1 xícara → 120 g × 0,008/g = R$ 0,96 ✓
  - Açúcar 2 col. sopa → 22,5 g × 0,005/g = R$ 0,1125 ✓
  - Leite 0,5 xícara → 120 ml × 0,006/ml = R$ 0,72 ✓
  - Cookie Kinder: bruto R$ 8,82; unitário R$ 0,3675 (24 un) ✓
  - Brownie Ferrero: bruto R$ 7,56; unitário R$ 0,63 (12 un) ✓
  - Erros: chave inexistente → NOT_FOUND; ingrediente `un` → INCOMPATIBLE_UNIT; líquido × massa → INCOMPATIBLE_UNIT; quantidade zero → ZERO ✓
  - Tabela: `farinha_trigo/xicara=120g`; `acucar/colher_sopa=11,25g`; `liquido/xicara=240ml`; chave ausente → null ✓
  - Todos os testes das fases anteriores (1A, 1B-1, 1B-2) continuam PASS.
  - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- **Decisões de implementação:**
  - `HouseholdMeasureRecipeItem` como terceiro kind da união discriminada — sem campo `unit` (a unidade-base vem da tabela de conversão, não do item).
  - Chave de conversão (`conversionKey`) é uma string livre referenciando a tabela em `household-measures.ts`; expansível sem alterar a API.
  - Conversão nunca produz `un`: validação bloqueia ingredientes de contagem antes de consultar a tabela.
  - Hoisting de `function` declarations utilizado (como nas fases anteriores) — IDE mostrou diagnósticos defasados, mas `tsc` confirmou exit 0.
- **Problemas encontrados:** diagnósticos defasados do IDE (mesma situação da Fase 1B-2); ignorados após confirmação do `typecheck`.
- **Riscos:** float (ex.: 7,56000…5) — mitigado por `RECIPE_EPSILON`; tabela de conversão é MVP estática (personalização por usuária fica para versão futura).
- **Pendências:** canais, custos fixos e pricing engine (Fase 1C).

#### Fase 1C-1 — Canais e taxas
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `types/pricing.ts`: `SalesChannel` (canal + taxas) e `ChannelPriceBreakdown` (detalhamento) — novos. Nenhum código de erro novo foi necessário (REQUIRED/NEGATIVE/OUT_OF_RANGE/NON_POSITIVE já existiam).
  - `modules/pricing/channel-validators.ts` (novo): `validateChannel` e `validateChannelPrice` (canal + líquido desejado).
  - `modules/pricing/channels.ts` (novo): `defaultSalesChannels` (biblioteca inicial de 8 canais) + `calculateChannelPrice`.
  - `modules/pricing/examples.ts`: `runChannelValidations`, `allChannelExamplesPass`.
  - `modules/pricing/index.ts`: exporta `channels`, `channel-validators` e os novos tipos.
- **Fórmula do preço necessário por canal:**
  - `total% = comissão% + pagamento% + anúncio%` (taxa fixa NÃO entra no percentual)
  - `preço necessário = (líquido desejado + taxa fixa) / (1 − total%/100)`
  - Detalhamento: cada taxa em R$ = preço × taxa%; `total de taxas = comissão + pagamento + anúncio + taxa fixa`; `líquido após taxas = preço − total de taxas` (volta ao desejado).
- **Validações executadas (todas PASS), líquido desejado R$ 20,00:**
  - Balcão/Pix → preço R$ 20,00; taxas R$ 0,00; líquido R$ 20,00 ✓
  - Cartão maquininha → R$ 20,7254 (20 / 0,965) ✓
  - iFood Básico → R$ 24,7642 (21 / 0,848) ✓
  - iFood Entrega → R$ 28,4553 (21 / 0,738) ✓
  - iFood Básico: líquido após taxas volta a R$ 20,00 ✓
  - Erros: sem nome → REQUIRED; comissão/pagamento/anúncio/taxa fixa/mensalidade negativas → NEGATIVE; comissão > 100 → OUT_OF_RANGE; soma ≥ 100 → OUT_OF_RANGE (e calc falha); líquido ≤ 0 → NON_POSITIVE ✓
  - Biblioteca inicial com 8 canais ✓
  - Todos os testes das fases anteriores (1A, 1B-1, 1B-2, 1B-3) continuam PASS.
  - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- **Decisões de implementação:**
  - Percentuais armazenados em 0–100 (não decimal); conversão para decimal só no cálculo.
  - Taxa fixa NÃO entra no percentual; soma % deve ser < 100 (senão o denominador `1 − total%` zera/inverte).
  - **Mensalidade (`monthlyFee`) NÃO entra no cálculo por pedido** — fica registrada no canal para uso em custos fixos/rateio (Fase 1C-2). Registrado em DECISIONS.md.
  - Biblioteca de canais vive em `channels.ts` (dado de domínio canônico), análogo à tabela de medidas caseiras em `household-measures.ts`.
- **Problemas encontrados:** diagnósticos defasados do IDE (mesma situação das fases anteriores); ignorados após confirmação do `typecheck`.
- **Riscos:** float nos preços — mitigado por `RECIPE_EPSILON`; valores da biblioteca são aproximados de MVP (editáveis depois).
- **Pendências:** custos fixos e rateio (Fase 1C-2); pricing engine (Fase 1C-3).

#### Fase 1C-2 — Custos fixos e rateio
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `types/pricing.ts`: `FixedCostCategory` (12 categorias), `FixedCost`, `FixedCostCalculationInput`, `FixedCostSummary` — novos. Nenhum código de erro novo (REQUIRED/NEGATIVE/NON_POSITIVE já existiam).
  - `modules/pricing/fixed-cost-validators.ts` (novo): `validateFixedCost` e `validateFixedCostCalculation`.
  - `modules/pricing/fixed-costs.ts` (novo): `sumActiveFixedCosts`, `sumChannelMonthlyFees`, `calculateFixedCostSummary`.
  - `modules/pricing/examples.ts`: `exampleFixedCosts` (8 ativos + 1 inativo), `runFixedCostValidations`, `allFixedCostExamplesPass`.
  - `modules/pricing/index.ts`: exporta `fixed-costs`, `fixed-cost-validators` e os novos tipos.
  - **`channels.ts` NÃO foi modificado** — a mensalidade é lida via `channel.monthlyFee` (campo já existente da Fase 1C-1).
- **Fórmulas:**
  - `totalFixedCosts = Σ custos fixos ATIVOS`
  - `channelMonthlyFeesTotal = Σ monthlyFee dos canais` (só se `includeChannelMonthlyFees`)
  - `totalConsidered = totalFixedCosts + channelMonthlyFeesTotal`
  - `fixedCostRate = totalConsidered / faturamento estimado` (decimal)
  - `fixedCostPerUnit = totalConsidered / volume estimado` (só se volume informado)
- **Como as mensalidades de canais entram:** a lista `channels` representa os canais ativos; quando `includeChannelMonthlyFees = true`, a soma das `monthlyFee` é adicionada ao total. A lista (não um flag `active` no canal) é a seleção.
- **Validações executadas (todas PASS):**
  - Total ativos R$ 2.310 (telefone inativo de R$ 90 ignorado) ✓
  - `fixedCostRate` 0,231 (23,1%); `fixedCostPerUnit` R$ 3,00 (770 un) ✓
  - Com iFood Básico (100) + Entrega (130): canais R$ 230; total R$ 2.540; rate 0,254 (25,4%) ✓
  - Lista vazia → total 0, rate 0 ✓
  - Erros: sem nome → REQUIRED; valor negativo → NEGATIVE; faturamento ≤ 0 → NON_POSITIVE; volume ≤ 0 → NON_POSITIVE; mensalidade de canal negativa → NEGATIVE ✓
  - Sem volume → `fixedCostPerUnit` undefined; `includeChannelMonthlyFees=false` ignora mensalidades ✓
  - Todos os testes das fases anteriores (1A → 1C-1) continuam PASS.
  - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- **Decisões de implementação:**
  - `fixedCostRate` e `fixedCostPerUnit` usam o **total efetivo** (`totalConsidered` = base + mensalidades incluídas), não só a base. Reconcilia os dois exemplos do briefing (23,1% sem canais; 25,4% com canais). Registrado em DECISIONS.md.
  - Canal não ganhou flag `active`: a lista de canais passada já é a seleção de ativos (evita alterar a Fase 1C-1).
  - `fixedCostRate` é só o percentual/rateio; nenhum preço sugerido, margem ou markup foi calculado.
- **Problemas encontrados:** diagnósticos defasados do IDE (mesma situação das fases anteriores); ignorados após `typecheck` limpo.
- **Riscos:** float nos percentuais — mitigado por `RECIPE_EPSILON`; valores de exemplo são ilustrativos.
- **Pendências:** pricing engine — CMV, preço sugerido, margem, markup (Fase 1C-3); engenharia de cardápio.

#### Fase 1C-3 — Pricing engine
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `types/pricing.ts`: `PriceComparisonStatus`, `PricingEngineInput`, `ChannelSuggestedPriceBreakdown`, `PracticedPriceComparison`, `PricingEngineResult` — novos. Nenhum código de erro novo (REQUIRED/NEGATIVE/NON_POSITIVE/OUT_OF_RANGE já existiam).
  - `modules/pricing/pricing-validators.ts` (novo): `validatePricingEngineInput`.
  - `modules/pricing/pricing-engine.ts` (novo): `calculatePricing` + `PRICE_COMPARISON_TOLERANCE` (1%).
  - `modules/pricing/examples.ts`: `runPricingEngineValidations`, `allPricingEngineExamplesPass`.
  - `modules/pricing/index.ts`: exporta `pricing-engine`, `pricing-validators` e os novos tipos.
  - **`recipes.ts`, `channels.ts` e `fixed-costs.ts` NÃO foram modificados** — o engine apenas consome seus resultados (`CalculatedRecipe.unitCost`, `SalesChannel`, `FixedCostSummary.fixedCostRate`).
- **Fórmulas:**
  - Sem canal: `preço = custo direto / (1 − fixedCostRate − desiredProfitRate)`; `custo fixo = preço × fixedCostRate`; `lucro = preço × desiredProfitRate`.
  - Com canal: `channelRates = (comissão + pagamento + anúncio)/100`; `preço = (custo direto + taxa fixa) / (1 − fixedCostRate − desiredProfitRate − channelRates)`. Taxa fixa fora do percentual.
  - Margem = lucro líquido / preço de venda. Markup = preço de venda / custo direto. Markup % = (preço − custo)/custo × 100.
  - Praticado: `diferença = praticado − sugerido`; margem/markup REAIS recalculados no preço praticado (custo fixo e taxas de canal escalam com o praticado). Referência = preço com canal se houver, senão sem canal.
- **Como comparou praticado × sugerido:** `differencePercent = (praticado − referência)/referência`; status com tolerância de 1% → `at_suggested` se `|diff%| ≤ 1%`, `below_suggested` se negativo, `above_suggested` se positivo.
- **Validações executadas (todas PASS):**
  - Ex.1 sem canal: preço R$ 17,5747; custo fixo R$ 4,05975; lucro R$ 3,5149; margem 0,20; markup 1,75747; identidade direto+fixo+lucro = preço ✓
  - Ex.2 iFood Básico: preço R$ 26,3789; identidade (soma das partes = preço); líquido final = direto+fixo+lucro ✓
  - Ex.3 praticado R$ 18 vs sugerido R$ 20: diferença −R$ 2,00; status below_suggested; margem real 0,14444; markup real 1,8 ✓
  - Integração: brigadeiro (unitCost 0,465) + fixedCostRate 0,231 (de `calculateFixedCostSummary`) + iFood Básico → preço R$ 3,51319 ✓
  - Erros: custo direto ≤ 0 → NON_POSITIVE; lucro < 0 → NEGATIVE; lucro ≥ 100% → OUT_OF_RANGE; fixedCostRate < 0 → NEGATIVE; fixedCostRate ≥ 100% → OUT_OF_RANGE; soma ≥ 100% (com/sem canal) → OUT_OF_RANGE (`rateTotal`); canal inválido → erro `channel.*`; preço praticado ≤ 0 → NON_POSITIVE; receita inválida (unitCost ≤ 0) → NON_POSITIVE; status at_suggested/above_suggested ✓
  - Todos os testes das fases anteriores (1A → 1C-2) continuam PASS.
  - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- **Decisões de implementação:**
  - `fixedCostRate` e `desiredProfitRate` são DECIMAIS (0 a <1), diferente dos percentuais de canal (0–100). O engine converte os % do canal internamente. Registrado em DECISIONS.md.
  - Margem esperada ≡ `desiredProfitRate` por construção (com ou sem canal), pois o lucro entra como fração do preço — usado como sanity check.
  - "Receita inválida" surge como `directUnitCost ≤ 0` (o engine recebe a receita já calculada; o custo unitário ≤ 0 é o sinal de receita degenerada).
  - O engine não modifica os módulos anteriores — apenas orquestra (consome `unitCost`, `fixedCostRate`, `SalesChannel`).
- **Problemas encontrados:** diagnóstico defasado do IDE (`calculatePricing` "não lido") durante a edição incremental de `examples.ts`; desapareceu e `typecheck` confirmou exit 0.
- **Riscos:** float nos preços/markups — mitigado por `RECIPE_EPSILON` (e tolerância 1e-4 nos headlines "≈" do briefing). O briefing trazia "custo fixo ≈ R$ 4,0608"; o valor matematicamente correto é R$ 4,05975 (= 17,5747 × 0,231) — usei o valor correto.
- **Pendências:** engenharia de cardápio (fase própria); Fase 2 (interface).

### Fase 2 — Interface Essencial

#### Fase 2-1 — storageService local
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `types/app-state.ts`: `AppState` (tipos puros, sem storage) — `schemaVersion`, `ingredients`, `recipes`, `fixedCosts`, `customChannels`, `updatedAt`. Importa apenas tipos de `types/pricing.ts`.
  - `services/storage-service.ts` (novo): única camada que fala com `window.localStorage`.
    - `APP_STATE_SCHEMA_VERSION` (1), `APP_STATE_STORAGE_KEY` (`"doce-margem:app-state"`).
    - `isStorageAvailable()` — testa `window` + escreve/remove uma chave-sonda; nunca lança.
    - `createEmptyAppState()` — estado inicial seguro.
    - `loadAppState()` / `saveAppState()` / `clearAppState()` — nunca lançam; falha vira `false` ou estado vazio.
    - `normalizeStoredState()` (interna) — valida e recompõe o JSON bruto (ver "Validações" abaixo).
    - Funções por fatia: `save/loadIngredients`, `save/loadRecipes`, `save/loadFixedCosts`, `save/loadCustomChannels` — leem o `AppState` inteiro, alteram só a fatia pedida e regravam.
  - `services/storage-examples.ts` (novo): `runStorageValidations()`/`allStorageExamplesPass()` — 13 checagens manuais (mesmo padrão de `modules/pricing/examples.ts`), usando a chave real do app e limpando o estado antes/depois.
  - `services/index.ts` (novo): barrel — `import { loadAppState, saveIngredients } from "@/services"`.
- **Como o storage evita quebrar no servidor:** `isStorageAvailable()` primeiro checa `typeof window === "undefined"` (SSR/Node) e só then tenta um `setItem`/`removeItem` de sonda dentro de `try/catch` (cobre private browsing com quota 0 e navegadores que bloqueiam storage). Todas as funções públicas passam por essa checagem antes de tocar em `localStorage`; nenhuma lança — leitura sem storage devolve `createEmptyAppState()`, escrita devolve `false`.
- **Como lida com JSON inválido/corrompido:** `loadAppState()` faz `JSON.parse` dentro de `try/catch` (parse inválido → estado vazio). O resultado passa por `normalizeStoredState()`: não é objeto → vazio; `schemaVersion` ausente/tipo errado → vazio; `schemaVersion` diferente da atual → vazio (sem migração definida ainda, só existe a v1); com a versão batendo, cada array (`ingredients`/`recipes`/`fixedCosts`/`customChannels`) que estiver ausente ou não for array vira `[]` **individualmente** — um campo corrompido não descarta o restante do estado (ex.: dado antigo sem `customChannels` mantém os ingredientes).
- **Validações executadas (todas PASS, com polyfill de `localStorage` em memória — mesma técnica de compilação temporária das fases anteriores):**
  - Primeiro load sem dados → estado vazio (schemaVersion 1, arrays `[]`).
  - Round-trip de ingredientes, receitas, custos fixos e canais customizados.
  - Salvar uma fatia não apaga as demais já salvas (read-modify-write sobre o mesmo objeto).
  - `saveAppState` devolve `true` e grava `updatedAt` em ISO válido.
  - `clearAppState` — load seguinte volta ao estado vazio.
  - JSON inválido → não lança, devolve estado vazio.
  - `schemaVersion` ausente → fallback para estado vazio.
  - `schemaVersion` desconhecida (999) → fallback para estado vazio.
  - Estado antigo com arrays ausentes (schema correta) → ingredientes preservados, resto vira `[]`.
  - Campo com tipo errado (`ingredients` como string) → vira `[]` em vez de quebrar.
  - **Prova separada de ambiente server** (sem `global.window` definido): `loadAppState`, `saveAppState`, `clearAppState`, `loadIngredients`, `saveIngredients` — nenhuma lançou; leituras devolveram estado vazio, escritas devolveram `false`.
  - Todos os 50 testes das fases 1A → 1C-3 continuam PASS (prova de que nenhuma fórmula de precificação foi tocada).
  - `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- **Decisões de implementação (não estruturais):**
  - Um único objeto `AppState` sob uma única chave de `localStorage`, em vez de uma chave por fatia — mantém o versionamento (`schemaVersion`) e o `updatedAt` centralizados num só lugar, e as funções por fatia (`saveIngredients` etc.) são só conveniência de leitura/escrita parcial sobre esse objeto único.
  - `services/storage-examples.ts` foi criado como arquivo próprio em vez de estender `modules/pricing/examples.ts` (sugestão original da tarefa): colocar validações de storage lá forçaria `modules/pricing` a importar de `services/`, invertendo a dependência e violando a regra do CLAUDE.md de que a matemática de precificação não pode depender de armazenamento. `services/storage-examples.ts` importa de `modules/pricing/examples.ts` (dado de exemplo, sentido permitido), nunca o contrário.
  - Nenhuma abstração/factory "trocável por Supabase" foi criada agora (ex.: interface `AppStateStorage`, seletor Essencial/Pro) — a decoupling pedida hoje é garantida pela UI só poder importar de `@/services` (nunca `localStorage` direto); a troca real por Supabase/cloud fica para a Fase 4, quando existir de fato o que decidir entre local/nuvem.
- **Problemas encontrados:** nenhum bloqueante.
- **Riscos:**
  - Sem migração entre versões de schema ainda — qualquer mudança de forma do `AppState` exige decidir se incrementa `APP_STATE_SCHEMA_VERSION` (o que hoje **apaga** dados antigos em vez de migrar). Aceitável agora (schema v1, sem usuárias reais); revisar antes de ter dados de produção.
  - Escrita síncrona em `localStorage` bloqueia a thread principal para estados grandes — sem risco perceptível no volume esperado do Essencial, mas vale monitorar se a base de receitas/ingredientes crescer muito.
  - `isStorageAvailable()` roda uma escrita de sonda a cada chamada (sem cache) — custo desprezível, mas é uma chamada de storage a mais por operação; pode ser revisto se performance virar problema.
- **Pendências:** telas e camada de UI (Fase 2-2): layout, dashboard, ingredientes, receitas, precificação simples, backup export/import.

#### Fase 2-2 — Layout base e dashboard inicial
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `app/layout.tsx` (editado): `lang="pt-BR"` (era `"en"`); `metadata.title` = "Doce Margem", `description` = a promessa completa do README; `<body>` agora renderiza `<Header />` + `<main>{children}</main>` (shell compartilhado por toda futura rota).
  - `components/layout/Header.tsx` (novo, Server Component): marca "Doce Margem" + navegação principal. "Painel" é um `<Link href="/">` ativo; "Ingredientes"/"Receitas"/"Precificação" aparecem como rótulos "em breve" (não são `<Link>`) — a Fase 2-2 não cria essas rotas, então não há link quebrado apontando para uma tela que não existe.
  - `components/dashboard/Dashboard.tsx` (novo, Client Component — `"use client"`): orquestra o dashboard. Lê o estado via `@/services` (barrel da Fase 2-1), nunca `localStorage` direto.
  - `components/dashboard/StatCard.tsx` (novo): card de resumo numérico reutilizável (usado 4x — ingredientes, receitas, custos fixos, canais customizados).
  - `app/page.tsx` (reescrito): Server Component — renderiza o título (a promessa curta "Pare de vender doce no achismo.") e um subtítulo estáticos, e delega a parte dependente de dados a `<Dashboard />`. Mantém o mínimo de JavaScript no cliente (só o que precisa de `localStorage` é Client Component).
- **Como o dashboard usa o storage local:** só por `@/services` (barrel), nunca importa `services/storage-service` diretamente nem toca `window.localStorage`. Usa `loadAppState()` para os 4 contadores e `isStorageAvailable()` para o aviso de indisponibilidade.
- **Como lida com estado vazio:** quando a soma dos 4 contadores é 0, os cards de resumo são substituídos por um card único de boas-vindas ("Você ainda não cadastrou nada por aqui" + CTA para começar pelos ingredientes) — decisão de design: mostrar "0/0/0/0" na primeira visita pareceria quebrado para uma iniciante; um card de boas-vindas é mais acolhedor. A seção "Próximos passos" aparece sempre, independente de haver dados.
- **Problema real encontrado e corrigido:** a primeira versão usava `useEffect` + `useState` para ler o `localStorage` após montar (padrão comum, mas o ESLint do projeto tem a regra `react-hooks/set-state-in-effect`, que rejeitou por causar "cascading renders"). Troquei por `useSyncExternalStore` (a API do próprio React para sincronizar com sistemas externos como `localStorage`): `getServerSnapshot()` devolve um estado vazio fixo (usado no servidor e na primeira pintura do cliente, evitando divergência de hidratação) e `getSnapshot()` lê o valor real do navegador uma vez, cacheado em uma variável de módulo (`useSyncExternalStore` exige referência estável ou o React reflui em loop). Resultado: sem `useEffect`, sem aviso do lint, sem mismatch de hidratação.
- **Testado com o app real rodando:** subi `npm run dev`, aguardei o servidor responder (poll em `curl`, não `sleep` fixo) e inspecionei o HTML servido por `GET /`. Confirmado no HTML gerado pelo servidor: "Doce Margem", "Pare de vender doce no achismo.", os 3 rótulos "em breve" da navegação, os 3 títulos de "Próximos passos", o aviso de dados salvos localmente e a mensagem de estado vazio ("Você ainda não cadastrou nada por aqui" — coerente, já que o servidor nunca tem dados no `localStorage`). Duas requisições `GET /` retornaram `200`; nenhum erro no log do servidor nem texto de erro no HTML.
  - **Limitação da verificação:** não havia `chromium-cli`/Playwright disponíveis neste ambiente, e instalar um seria uma dependência nova (fora do escopo pedido) — então não produzi um screenshot real de navegador nem testei a hidratação/interatividade no cliente visualmente. A prova ficou no nível de SSR (HTML correto, sem erro) + `typecheck`/`lint` limpos + revisão do código do `useSyncExternalStore` (API síncrona e determinística do React, sem superfície para bugs de timing). Recomendo um teste manual num navegador real antes de considerar a Fase 2-2 validada para produção.
- **Decisões de implementação (não estruturais):**
  - Seções de navegação sem tela ainda (Ingredientes/Receitas/Precificação) são rótulos não clicáveis, não `<Link>` — evita 404. Quando a Fase 2-3 criar essas rotas, é só trocar o rótulo por `<Link>`.
  - Paleta: neutros `stone` (cinza com viés quente) + acento `rose` (rosa/framboesa) — combina com o universo de confeitaria sem parecer "sistema financeiro" (evitado azul/cinza corporativo). Usa só as cores padrão do Tailwind v4, sem novo arquivo de tema.
  - Sem dependências novas: `useSyncExternalStore` é nativo do React 19 já instalado; ícones/ilustrações não foram usados (mantém o pacote enxuto).
- **Riscos:**
  - Sem verificação visual em navegador real (ver limitação acima) — a interatividade client-side (hidratação, correção do snapshot pós-montagem) não foi vista rodando, só validada pela leitura do código e pelo HTML de SSR.
  - ~~`cachedSnapshot` em `Dashboard.tsx` é um módulo-singleton: se a usuária salvar dados em outra aba/tela na mesma sessão sem recarregar esta página, o dashboard não atualiza sozinho (não há mecanismo de notificação de mudança no storageService ainda). Aceitável para a Fase 2-2 (ainda não existe nenhuma tela que escreva dados); reavaliar quando a Fase 2-3 criar CRUD de verdade.~~ **→ Este risco VIROU um bug real e foi corrigido na Revisão da Fase 2 (ver abaixo).** O "reavaliar na Fase 2-3" nunca foi feito nas Fases 2-3 a 2-6.
  - Rótulos "em breve" na navegação podem gerar expectativa; nenhuma tela foi prometida com prazo.
- **Pendências:** telas de CRUD — ingredientes, receitas, precificação simples, backup export/import (Fase 2-3).

#### Fase 2-3 — Tela simples de ingredientes
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `components/ingredients/ingredients-store.ts` (novo): store reativo — resolve a pendência que o `DECISIONS.md` da Fase 2-2 já tinha registrado ("uma tela que escreve dados precisará decidir como invalidar o cache — avaliar na Fase 2-3"). Mantém um cache de módulo + um `Set` de assinantes; `addIngredient`/`removeIngredient` regravam via `saveIngredients` (storageService) e notificam os assinantes. Expõe `subscribeIngredients`/`getIngredientsSnapshot`/`getIngredientsServerSnapshot` no formato exato que `useSyncExternalStore` exige.
  - `components/ingredients/IngredientForm.tsx` (novo, Client Component): formulário controlado (nome, quantidade comprada, unidade de compra, preço pago, unidade-base, fator de correção com padrão `"1"`). Não reimplementa nenhuma regra: monta um `Ingredient` e chama `validateIngredient`/`calculateIngredient` (Fase 1A) — os erros exibidos são as mensagens que o domínio já produz. Mostra uma prévia do custo por unidade-base enquanto a usuária digita (mesma função de domínio da listagem).
  - `components/ingredients/IngredientList.tsx` (novo, Client Component): lê o store via `useSyncExternalStore`; para cada ingrediente, chama `calculateIngredient` de novo para mostrar o custo (não persiste valor calculado — é sempre derivado). Botão "Excluir" chama `removeIngredient(id)`. Estado vazio amigável quando não há nada cadastrado.
  - `app/ingredientes/page.tsx` (novo): Server Component — título e descrição estáticos + `<IngredientForm />`/`<IngredientList />` lado a lado (empilhados no mobile).
  - `components/layout/Header.tsx` (editado): "Ingredientes" virou `<Link href="/ingredientes">` real (era rótulo "em breve"). **Correção junto:** o Header virou Client Component (`"use client"`) usando `usePathname()` para destacar o link certo — antes, "Painel" tinha `aria-current="page"` **fixo**, o que era invisível com uma única rota e virou um bug real e visível ao existir uma segunda rota de verdade.
- **Como salvou/carregou ingredientes pelo storage local:** só através de `saveIngredients`/`loadIngredients` de `@/services` (barrel da Fase 2-1) — nunca `localStorage` direto. O store reativo é quem chama essas funções; os componentes de UI nunca importam `@/services` diretamente, só o store local.
- **Como validou os ingredientes:** o formulário faz uma checagem de fronteira própria (números não-finitos viram uma mensagem genérica ANTES de chamar o domínio — `Number.isFinite`, mesmo padrão da revisão da Fase 1C, sem tocar `validators.ts`) e depois chama `validateIngredient()` (Fase 1A) com o candidato montado. Se houver erros, aparecem inline por campo (`field` → mensagem). O custo mostrado (formulário e listagem) vem sempre de `calculateIngredient()`, nunca calculado à mão na UI.
- **Testado com o app real rodando:** subi o `npm run dev`, aguardei responder via `curl` (poll, não `sleep` fixo) e confirmei `GET /` e `GET /ingredientes` em `200`, sem erro no log nem texto de erro no HTML. Confirmado no HTML de `/ingredientes`: título, rótulos dos campos do formulário, mensagem de estado vazio. Confirmado no HTML de `/`: link real para `/ingredientes` presente, e só 2 rótulos "em breve" restantes (Receitas, Precificação — antes eram 3).
  - **Prova adicional (além da Fase 2-2):** como a Fase 2-3 grava dados, também validei a lógica do `ingredients-store.ts` isolada do React — compilei para CommonJS (mesma técnica das fases anteriores) e rodei 16 checagens diretas: estado inicial vazio, `addIngredient` persiste e gera id, o dado gravado é visível por `loadIngredients()` direto do storageService (prova de que não é só cache local), `notify()` dispara os assinantes o número certo de vezes, `removeIngredient` remove o item certo e mantém os outros, `unsubscribe()` realmente para de notificar, e `getIngredientsServerSnapshot()` devolve sempre a mesma referência (exigência do `useSyncExternalStore`). Todas as 16 passaram.
  - Reconfirmados os 50 testes de precificação (1A→1C-3) e as 13 checagens de storage (Fase 2-1) — nada regrediu.
  - **Limitação:** mesma da Fase 2-2 — sem `chromium-cli`/Playwright disponível e sem poder instalar (proibido pela tarefa), não houve clique real em navegador nem screenshot. A prova ficou em três camadas: SSR (HTML correto, sem erro), lógica do store isolada (16/16, incluindo persistência real), e leitura de código. Recomendo um teste manual num navegador antes de considerar a tela validada para produção.
- **Decisões de implementação (não estruturais):**
  - `ingredients-store.ts` fica em `components/ingredients/`, não em `services/` — depende de conceitos de React (assinantes) e do navegador (`crypto.randomUUID`), que `services/storage-service.ts` deliberadamente não tem. Registrado em `DECISIONS.md` como o padrão a repetir nas próximas telas de CRUD (receitas, custos fixos, canais).
  - Id do ingrediente é gerado pelo store (`crypto.randomUUID()`, com fallback simples se indisponível), não pelo formulário — mantém a responsabilidade de identidade num só lugar.
  - Fator de correção vazio no formulário é tratado como "usar o padrão do domínio" (`undefined`, não `0` nem erro) — só texto não-numérico gera erro. Coerente com o "padrão 1" pedido.
- **Problemas encontrados:** o bug do `aria-current="page"` fixo no Header (ver acima) — não era visível antes por só existir uma rota; corrigido nesta fase porque ficaria claramente errado com duas rotas reais.
- **Riscos:**
  - Sem verificação visual em navegador real (ver limitação acima).
  - O store de ingredientes é independente do de `Dashboard.tsx` (cada um com seu próprio cache de módulo) — hoje sem problema (cada um lê sua fatia), mas se uma tela futura precisar refletir mudanças feitas por outra em tempo real (sem reload), vai precisar de um mecanismo compartilhado. Não é um problema agora porque não há duas telas escrevendo a mesma fatia ao mesmo tempo.
  - `removeIngredient` não pede confirmação — exclusão é imediata. Aceitável para uma tela simples de Fase 2-3; revisar se usuárias reclamarem de exclusão acidental.
- **Pendências:** telas de receitas, precificação simples e backup export/import (Fase 2-4).

#### Fase 2-4 — Tela simples de receitas
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `components/recipes/recipes-store.ts` (novo): mesmo padrão do `ingredients-store.ts` (cache de módulo + `Set` de assinantes + `addRecipe`/`removeRecipe` gravando via `saveRecipes`/`loadRecipes`). O id sempre é gerado pelo store (nunca pelo formulário).
  - `components/recipes/RecipeForm.tsx` (novo, Client Component): formulário com um sub-fluxo de "adicionar ingrediente à receita" — escolhe um ingrediente já cadastrado (lido via `useSyncExternalStore` do **mesmo** `ingredients-store.ts` da Fase 2-3, não uma cópia), informa quantidade e unidade, e acumula os itens numa lista local antes do submit final. Ao escolher o ingrediente, a unidade do item já vem pré-preenchida com a `baseUnit` dele (atalho de UX, continua editável). Nome, rendimento, unidade do rendimento (texto livre — o domínio permite qualquer string, ex. "porções") e perda de produção (padrão `"0"`) completam a receita. Bloqueia o cadastro se não houver nenhum ingrediente cadastrado ainda, com aviso explicando o porquê.
  - `components/recipes/RecipeList.tsx` (novo, Client Component): lê o store de receitas via `useSyncExternalStore`; para cada receita, chama `calculateRecipe(recipe, ingredientsById, {})` de novo para mostrar custo total (`totalCostWithLoss`) e custo unitário (`unitCost`) — nunca persiste valor calculado. Se um ingrediente referenciado tiver sido excluído depois, mostra a mensagem de erro que o próprio domínio produz (`NOT_FOUND`) em vez de quebrar.
  - `app/receitas/page.tsx` (novo): Server Component — título/descrição estáticos + `<RecipeForm />`/`<RecipeList />` lado a lado.
  - `components/layout/Header.tsx` (editado): "Receitas" virou `<Link href="/receitas">` real (era rótulo "em breve"); só "Precificação" continua "em breve". Reaproveitou a estrutura já corrigida na Fase 2-3 (`usePathname`) — nenhuma mudança estrutural nova aqui.
- **Como carregou ingredientes do storage local:** não chama `@/services` nem `loadIngredients()` diretamente — importa `getIngredientsSnapshot`/`subscribeIngredients`/`getIngredientsServerSnapshot` do **mesmo** `components/ingredients/ingredients-store.ts` da Fase 2-3 e lê via `useSyncExternalStore`. Como esse store é um singleton de módulo compartilhado por toda a aplicação (não por página), qualquer ingrediente cadastrado antes (na mesma sessão do navegador) já aparece no seletor da receita sem precisar recarregar.
- **Como salvou/carregou receitas no storage local:** só através de `saveRecipes`/`loadRecipes` de `@/services` (barrel da Fase 2-1) — nunca `localStorage` direto. O `recipes-store.ts` é quem chama essas funções.
- **Como validou e calculou a receita:** o formulário monta um `Recipe` candidato (com `id: ""` — o valor real vem do store só depois de válido) e chama `validateRecipe(candidate, ingredientsById, {})` (Fase 1B). O terceiro argumento (`recipesById`) é sempre `{}` porque a Fase 2-4 não cria sub-receitas na interface. Erros de itens (`items[N].*`) e de campos do topo (nome, rendimento, perda) aparecem separados. O custo (prévia no formulário e valor na listagem) vem sempre de `calculateRecipe()` — nunca somado à mão na UI.
- **Testado com o app real rodando:** subi o `npm run dev` (matando primeiro um processo antigo que ainda ocupava a porta 3000, deixado de uma verificação de diagnóstico anterior), aguardei responder via `curl` e confirmei `GET /`, `GET /ingredientes` e `GET /receitas` em `200`, sem erro no log nem no HTML. Confirmado no HTML de `/receitas`: título, campos do formulário, estado vazio ("Nenhuma receita cadastrada"), aviso de "nenhum ingrediente cadastrado" (coerente — servidor nunca tem dados). Confirmado em `/`: link real para `/receitas` presente, restando só 1 rótulo "em breve" (Precificação).
  - **Prova adicional:** validei a lógica de `recipes-store.ts` isolada do React (mesma técnica de compilação temporária) com 18 checagens, incluindo **o exemplo exato dado na tarefa**: ingrediente Chocolate ao leite (1 kg por R$ 38, base g) + item de 100 g + rendimento 10 un + perda 0% → `calculateRecipe` devolveu `totalCostWithLoss = R$ 3,80` e `unitCost = R$ 0,38/un`, batendo exatamente com o esperado. Também validei round-trip (add/remove), persistência real via `loadRecipes()` direto do storageService, e que uma receita referenciando um ingrediente inexistente é rejeitada por `validateRecipe` com `NOT_FOUND`.
  - Reconfirmados os 50 testes de precificação (1A→1C-3) e as 13 checagens de storage (Fase 2-1) — nada regrediu.
  - **Limitação:** mesma das fases anteriores — sem `chromium-cli`/Playwright disponível e sem poder instalar. Prova em três camadas: SSR, lógica do store isolada (incluindo o exemplo numérico da tarefa), leitura de código.
- **Decisões de implementação (não estruturais):**
  - `RecipeForm` importa o store de **ingredientes** (não duplica leitura) — consistente com "usar os ingredientes salvos pela Fase 2-3" e com o princípio de uma única fonte reativa por fatia de dado.
  - "Custo total" na UI é `totalCostWithLoss` (não `grossCost`) — é o valor que efetivamente alimenta `unitCost` (`unitCost = totalCostWithLoss / yieldQuantity`), mais coerente para a usuária do que mostrar o custo bruto sem perda quando há perda configurada.
  - `yieldUnit` é um campo de texto livre (não um `<select>`), refletindo o tipo do domínio (`Recipe.yieldUnit: string`, ex.: "un", "porções", "fatias") — diferente de `IngredientRecipeItem.unit`, que É uma união fechada (`PurchaseUnit`) e por isso usa `<select>`.
  - Cadastro de receita fica bloqueado (botão desabilitado + aviso) quando não há nenhum ingrediente cadastrado — evita a usuária cair num formulário que não tem como funcionar.
- **Problemas encontrados:** nenhum bloqueante no código. Ao testar no navegador real, um processo `next dev` de uma verificação anterior ainda ocupava a porta 3000 — precisei encerrá-lo antes de validar as mudanças desta fase (não é um problema do código, só do ambiente de teste).
- **Riscos:**
  - Mesmo risco já registrado na Fase 2-3: `ingredients-store` e `recipes-store` são singletons independentes — hoje sem problema, mas nenhum mecanismo cross-store existe se telas futuras precisarem reagir a mudanças umas das outras em tempo real.
  - Excluir um ingrediente que já é usado por uma receita cadastrada não é bloqueado nem avisado no momento da exclusão (só aparece como erro `NOT_FOUND` depois, ao tentar ver o custo da receita na listagem). Aceitável para uma tela simples de Fase 2-4; vale revisitar com um aviso mais direto numa fase futura.
  - Sem verificação visual em navegador real (ver limitação acima).
- **Pendências:** tela de precificação simples e backup export/import (Fase 2-5).

#### Fase 2-5 — Tela simples de precificação
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `components/channels/channels-store.ts` (novo): leitura reativa de `customChannels`, **só leitura** — sem CRUD de canais nesta fase, então não tem `addX`/`removeX`. `subscribeCustomChannels` é um no-op (mesmo formato do `Dashboard.tsx` original da Fase 2-2), já que nada nesta sessão consegue alterar esse dado ainda. Preparado para uma fase futura de CRUD de canais só adicionar as funções de escrita, sem precisar renomear/mover o arquivo.
  - `components/pricing/PricingForm.tsx` (novo, Client Component): lê receitas (`recipes-store`, Fase 2-4), ingredientes (`ingredients-store`, Fase 2-3) e canais customizados (`channels-store`, novo) — os três via `useSyncExternalStore`, nenhum `@/services` direto. Funciona como **calculadora ao vivo**: sem botão "calcular", o resultado aparece assim que os campos preenchidos fazem sentido (recomputa a cada tecla/seleção, mesmo padrão de prévia já usado nos formulários de ingrediente/receita). Campos: seleção de receita, custo fixo (%), lucro desejado (%), canal (padrão + customizados, com opção "Nenhum"), preço praticado (opcional).
  - `components/pricing/PricingResult.tsx` (novo): componente de exibição pura — recebe o `PricingEngineResult` já calculado e só formata/rotula em português. Três seções condicionais: sem canal (sempre), com canal (se selecionado), preço praticado (se informado), com o status traduzido (`below_suggested` → "Abaixo do ideal", `at_suggested` → "No ideal", `above_suggested` → "Acima do ideal").
  - `app/precificacao/page.tsx` (novo): Server Component — título/descrição estáticos + `<PricingForm />`. Layout de coluna única (`max-w-3xl`), diferente do layout de duas colunas de ingredientes/receitas — é um fluxo sequencial (escolher receita → preencher custos → ver resultado), não uma lista + formulário lado a lado.
  - `components/layout/Header.tsx` (editado): "Precificação" virou `<Link href="/precificacao">` real. Como as 4 seções principais (Painel, Ingredientes, Receitas, Precificação) já têm tela própria, removi o array/bloco `upcomingSections` inteiro (ficaria sempre vazio) — simplificação direta, não um refactor especulativo.
- **Como carregou receitas e ingredientes do storage:** nunca chama `@/services` direto — lê `recipes-store.ts` (Fase 2-4) e `ingredients-store.ts` (Fase 2-3) via `useSyncExternalStore`, reaproveitando os stores já existentes (mesmo padrão registrado em `DECISIONS.md`, "uma feature pode ler o store de outra"). `customChannels` usa o novo `channels-store.ts`, só leitura.
- **Como integrou `calculateRecipe`:** ao selecionar uma receita, monta `ingredientsById`/`recipesById` a partir das listas lidas dos stores e chama `calculateRecipe(receita, ingredientsById, recipesById)` — exatamente a mesma chamada já usada em `RecipeList.tsx` (Fase 2-4). Mostra custo total, rendimento e custo unitário direto do resultado; se a receita referenciar um ingrediente que foi excluído depois, mostra a mensagem de erro do próprio domínio em vez de quebrar.
- **Como integrou `calculatePricing`:** só chama quando a receita calculou com sucesso E os dois percentuais (custo fixo, lucro) são números válidos — monta `{ recipe: recipeCalc.value, fixedCostRate, desiredProfitRate, channel, practicedPrice }` e passa direto para `calculatePricing` (Fase 1C-3). Nenhuma soma/divisão de preço, margem ou markup foi escrita na UI — `PricingResult.tsx` só formata os campos que `PricingEngineResult` já traz prontos.
- **Como tratou custo fixo percentual:** um campo de texto simples ("Custo fixo sobre faturamento (%)", aceita vírgula OU ponto — o exemplo da tarefa usa "23,1"), com a dica sugerida ("Se você ainda não sabe, use 20%..."). Convertido para decimal (`/100`) só na hora de montar o input do pricing engine. **Não foi persistido** — não existe uma fatia segura de "preferências de precificação" no `AppState` hoje, e criar uma agora exigiria decidir versionamento de schema para um dado que a própria tarefa pediu para não salvar sem necessidade real. Fica como `useState` local, perdido ao sair da tela (mesmo comportamento do CRUD completo de custos fixos, que continua fora de escopo).
- **Como tratou canal de venda:** `[...defaultSalesChannels, ...customChannels]` como a lista do `<select>`, com "Nenhum (venda direta)" como primeira opção (valor `""`, vira `channel: undefined` no input do engine). Como `PricingEngineResult` sempre traz o cenário sem canal no topo e só adiciona `channelPricing` quando um canal é passado, a tela sempre mostra "preço sugerido sem canal" e, quando um canal está selecionado, adiciona a seção com as taxas dele — sem precisar de um canal "fake" default.
- **Como tratou preço praticado:** campo de texto opcional; vazio vira `undefined` (omitido do input, sem seção de comparação); texto inválido não gera erro visível, só não mostra resultado ainda (calculadora ao vivo, sem necessidade de bloquear com mensagem agressiva); número válido ativa `practicedComparison`, com o status mapeado para as 3 frases pedidas.
- **Testado com o app real rodando:** subi o `npm run dev` (matando de novo um processo antigo de uma verificação de diagnóstico anterior que ainda ocupava a porta 3000), confirmei `GET /`, `GET /ingredientes`, `GET /receitas` e `GET /precificacao` em `200`, sem erro no log nem no HTML. Confirmado no HTML de `/precificacao`: título, estado vazio ("nenhuma receita... Cadastre uma receita antes de calcular o preço"), link para Receitas. Confirmado em `/`: link real para `/precificacao`, **zero** rótulos "em breve" restantes.
  - **Prova adicional — o cenário exato desta tarefa:** validei `calculateRecipe`+`calculatePricing` isolados do React (mesma técnica de compilação temporária) com 11 checagens usando o Brownie simples (custo unitário R$ 0,38) + custo fixo 23,1% + lucro 20%: preço sugerido **sem canal = R$ 0,6678** (bate com o esperado da tarefa); com iFood Básico, preço sobe para R$ 3,3094 (maior, por causa das taxas + taxa fixa de R$ 1,00, como esperado); preço praticado R$ 0,50 (abaixo do sugerido) → status `below_suggested`; `loadCustomChannels()` vazio confirmado (nenhum CRUD de canal ainda escreve nele).
  - Reconfirmados os 50 testes de precificação (1A→1C-3) e as 13 checagens de storage (Fase 2-1) — nada regrediu.
  - **Limitação:** mesma das fases anteriores — sem `chromium-cli`/Playwright disponível e sem poder instalar. Prova em três camadas: SSR das 4 rotas, lógica de cálculo isolada com o cenário numérico exato da tarefa, leitura de código.
- **Decisões de implementação (não estruturais):**
  - Sem botão "calcular": a tela recalcula a cada mudança de campo (mesmo padrão de prévia ao vivo já usado em `IngredientForm`/`RecipeForm`) — não há ação de "salvar" nesta tela, então não fazia sentido um fluxo de submit/validação como o dos formulários de cadastro.
  - `channels-store.ts` (não `pricing-store.ts`): a tarefa sugeriu `pricing-store.ts` "apenas se necessário" — não foi necessário, porque a tela não escreve nenhum dado próprio (nem persiste custo fixo/lucro/canal escolhido). O único dado do storage que faltava um ponto de leitura reativo era `customChannels`, então criei o store certo pela fatia certa (`channels`, não `pricing`), já deixando o lugar certo para o CRUD futuro de canais.
  - "Custo fixo (%)" e "preço praticado" aceitam vírgula decimal (`"23,1"`), diferente dos campos numéricos das fases anteriores (que usam `type="number"`, que rejeita vírgula na maioria dos navegadores). Não retroagi essa correção para `IngredientForm`/`RecipeForm` — fora do escopo pedido; registrado como risco/oportunidade abaixo.
- **Problemas encontrados:** nenhum bloqueante no código. Mesmo obstáculo de ambiente das fases anteriores (processo `next dev` órfão de uma verificação de diagnóstico anterior ocupando a porta 3000).
- **Riscos:**
  - Inconsistência de UX entre formulários: `IngredientForm`/`RecipeForm` usam `<input type="number">` (só aceita ponto decimal); `PricingForm` usa `<input type="text" inputMode="decimal">` com suporte a vírgula. Vale uma passada de consistência numa fase futura de polimento — não fiz agora para não alterar código fora do pedido desta fase.
  - Sem persistência de custo fixo/lucro/canal: toda vez que a usuária sai da tela de precificação, precisa preencher os percentuais de novo. Aceitável para o MVP (a tarefa pediu explicitamente para não salvar sem estrutura segura já existente), mas é um atrito real; a Fase 2-6 (CRUD de custos fixos) deve resolver isso de verdade em vez de só cachear o campo.
  - Excluir um ingrediente ou receita usada em outro lugar não é bloqueado — mesmo risco já registrado nas fases 2-3/2-4, agora também visível na precificação (receita com ingrediente apagado mostra erro `NOT_FOUND` em vez de calcular).
  - Sem verificação visual em navegador real (ver limitação acima).
- **Pendências:** backup export/import; CRUD de custos fixos; CRUD de canais customizados (Fase 2-6).

#### Fase 2-6 — Configurações financeiras básicas
- **Status:** ✅ Concluída
- **O que foi feito:**
  - `types/app-state.ts` (editado): `BusinessSettings` novo — `estimatedMonthlyRevenue: number | null`, `estimatedMonthlyUnits: number | null`, `updatedAt: string`. Guarda só os INSUMOS informados pela usuária; o percentual de custo fixo continua sempre derivado (nunca persistido calculado), mesma filosofia de toda a Fase 2 (custo de ingrediente/receita/precificação também nunca são persistidos calculados). `AppState.businessSettings` novo, sempre presente.
  - `services/storage-service.ts` (editado): `createEmptyBusinessSettings()`, `normalizeBusinessSettings()` (mesmo princípio das listas — campo ausente/tipo errado vira padrão seguro, sem descartar o resto do estado), `saveBusinessSettings`/`loadBusinessSettings`. `normalizeStoredState` agora também recompõe `businessSettings`. **`APP_STATE_SCHEMA_VERSION` continua 1** — não foi necessário incrementar (ver "Como garantiu compatibilidade" abaixo).
  - `services/storage-examples.ts` (editado): de 13 para 16 checagens — round-trip de `businessSettings`, `clearAppState` cobrindo o novo campo, e principalmente o teste 12 reescrito para simular explicitamente um estado salvo **antes** da Fase 2-6 existir (schemaVersion 1, com ingredientes, sem `businessSettings` nem os outros arrays) — mais dois testes novos para `businessSettings` corrompido (string no lugar de objeto; campos com tipo/valor errado como `"dez mil"` e `NaN`).
  - `components/fixed-costs/fixed-costs-store.ts` (novo): mesmo padrão de `ingredients-store.ts`/`recipes-store.ts` — `addFixedCost`/`removeFixedCost` via `saveFixedCosts`/`loadFixedCosts`.
  - `components/fixed-costs/FixedCostForm.tsx` (novo): nome, categoria (12 opções da `FixedCostCategory`, com rótulos em português), valor mensal, checkbox ativo/inativo (padrão ativo), observação opcional. Monta o candidato e chama `validateFixedCost` (Fase 1C-2) — nenhuma regra reimplementada.
  - `components/fixed-costs/FixedCostList.tsx` (novo): lista com categoria, valor, badge "Inativo" quando aplicável, excluir.
  - `components/settings/business-settings-store.ts` (novo): store de um objeto ÚNICO (não lista) — `updateBusinessSettings({ estimatedMonthlyRevenue, estimatedMonthlyUnits })`, sem `addX`/`removeX`.
  - `components/settings/BusinessSettingsForm.tsx` (novo): campos de faturamento e volume mensal estimado + resumo ao vivo (custos fixos ativos, faturamento, percentual, custo fixo por unidade) calculado com `calculateFixedCostSummary` (Fase 1C-2) a partir dos valores **sendo digitados** (não só dos salvos) — mesma filosofia "calculadora ao vivo" da Fase 2-5. Botão "Salvar configurações" persiste `estimatedMonthlyRevenue`/`estimatedMonthlyUnits`.
  - `components/channels/channels-store.ts` (**estendido**, não recriado): ganhou `addCustomChannel`/`removeCustomChannel` e o `subscribeCustomChannels` (que era um no-op de leitura) virou o padrão real com `Set` de assinantes — exatamente o que o `DECISIONS.md` da Fase 2-5 já tinha previsto ("quando existir CRUD de canais, ele ganha as funções de escrita nesse MESMO arquivo, sem precisar mover nada").
  - `components/channels/CustomChannelForm.tsx` (novo): nome, comissão %, taxa de pagamento %, taxa fixa R$, anúncio %, mensalidade R$, observação opcional. Monta o candidato e chama `validateChannel` (Fase 1C-1) — nenhuma regra reimplementada. Sem edição (só criar/listar/excluir, como pedido).
  - `components/channels/CustomChannelList.tsx` (novo): lista com as taxas resumidas numa linha + excluir. Deixa claro que os canais padrão (iFood, Rappi...) aparecem na tela de Precificação, não aqui.
  - `app/configuracoes/page.tsx` (novo): Server Component — três seções empilhadas (Custos fixos → Faturamento/percentual → Canais customizados), cada uma form+lista lado a lado.
  - `components/layout/Header.tsx` (editado): "Configurações" virou o 5º link real da navegação.
  - `components/pricing/PricingForm.tsx` (editado — Parte 4): agora lê `fixed-costs-store` e `business-settings-store` também. Calcula `settingsBasedSummary` via `calculateFixedCostSummary` (custos fixos + faturamento salvos) e usa o resultado para pré-preencher o campo "Custo fixo sobre faturamento (%)" — só enquanto a usuária não editar esse campo nesta visita (`fixedCostRateDraft === null`); assim que ela digita algo, o valor calculado para de sobrescrever. Sem configuração salva (`estimatedMonthlyRevenue === null`), o campo continua vazio — comportamento idêntico ao da Fase 2-5.
- **Como salvou/carregou custos fixos:** só via `saveFixedCosts`/`loadFixedCosts` de `@/services`, chamadas exclusivamente por `fixed-costs-store.ts` — mesmo padrão de ingredientes/receitas.
- **Como salvou/carregou configurações financeiras:** só via `saveBusinessSettings`/`loadBusinessSettings` de `@/services`, chamadas exclusivamente por `business-settings-store.ts`. Diferente das outras fatias (que são listas com `addX`/`removeX`), aqui é um objeto único com `updateBusinessSettings` — não existe "adicionar" ou "remover" configuração, só atualizar os dois campos.
- **Como salvou/carregou canais customizados:** só via `saveCustomChannels`/`loadCustomChannels` de `@/services`, agora chamadas por `addCustomChannel`/`removeCustomChannel` no `channels-store.ts` estendido — a leitura (já existente desde a Fase 2-5) não mudou de comportamento, só ganhou companhia de escrita.
- **Como integrou o percentual de custo fixo na tela de precificação:** `PricingForm` lê `fixed-costs-store` + `business-settings-store`, chama `calculateFixedCostSummary` com esses dados (mesma função que `BusinessSettingsForm` usa) e, se `estimatedMonthlyRevenue` estiver definido, formata `fixedCostRate × 100` como texto com vírgula (`"23,1"`) para preencher o campo. Um `useState<string | null>` (`fixedCostRateDraft`, começa `null`) decide se mostra o valor calculado ou o que a usuária digitou — o padrão "não tocado ainda → deriva do valor externo; tocado → usa o que foi digitado" evita qualquer `useEffect` (mesmo cuidado de hidratação/lint das fases anteriores) e ainda garante edição manual livre, exatamente como pedido.
- **Como garantiu compatibilidade com dados antigos do localStorage:** reaproveitou a MESMA estratégia que a Fase 2-1 já tinha desenhado para "campo novo ausente" — `normalizeBusinessSettings()` recompõe `businessSettings` a partir de um padrão seguro sempre que o campo estiver ausente, não for um objeto, ou tiver algum valor interno inválido (string, `NaN`), **sem** descartar `ingredients`/`recipes`/`fixedCosts`/`customChannels` já existentes no mesmo estado. Por isso **`APP_STATE_SCHEMA_VERSION` continua 1** — incrementar teria sido contraproducente: faria o gate de versão (`schemaVersion !== APP_STATE_SCHEMA_VERSION → estado vazio`) rejeitar TODO dado gravado nas Fases 2-1 a 2-5 (todos com `schemaVersion: 1`), apagando ingredientes/receitas de quem já estivesse usando o app. A prova está no teste 12 de `storage-examples.ts`, que simula exatamente esse cenário (estado salvo antes de `businessSettings` existir) e confirma que os dados antigos sobrevivem.
- **Testado com o app real rodando:** subi o `npm run dev` (matando de novo um processo órfão de sessão anterior na porta 3000), confirmei `GET /`, `GET /ingredientes`, `GET /receitas`, `GET /precificacao` e `GET /configuracoes` em `200`, sem erro no log nem no HTML. Confirmado no HTML de `/configuracoes`: títulos das 3 seções, campos dos 2 formulários, as duas mensagens de estado vazio, e o aviso "Informe o faturamento mensal..." (coerente — servidor nunca tem dados). Confirmado em `/`: link real para `/configuracoes`. Confirmado que `/precificacao` continua renderizando normalmente após a integração da Parte 4.
  - **Prova adicional — o roteiro manual completo da tarefa, isolado do React:** compilei os novos stores (mesma técnica de compilação temporária) e rodei 12 checagens reproduzindo o cenário pedido: 9 custos fixos cadastrados (R$ 2.310 ativos, 1 inativo) → faturamento R$ 10.000 + volume 770 → `calculateFixedCostSummary` devolve `fixedCostRate = 0,231` e `fixedCostPerUnit = R$ 3,00` (bate com o cenário clássico já validado na Fase 1C-2) → o texto que o campo de precificação receberia é literalmente `"23,1"` (a mesma lógica de formatação usada em `PricingForm`, testada isoladamente) → canal customizado "Loja própria" validado por `validateChannel`, persistido, e aparece corretamente na lista combinada `[...defaultSalesChannels, ...customChannels]` (9 no total) → excluir canal e custo fixo funciona. Todas as 12 passaram.
  - Reconfirmados os 50 testes de precificação (1A→1C-3) e as agora 16 checagens de storage (Fase 2-1 + Fase 2-6) — nada regrediu.
  - **Limitação:** mesma de todas as fases anteriores — sem `chromium-cli`/Playwright disponível e sem poder instalar. Prova em três camadas: SSR das 5 rotas, lógica de dados isolada com o cenário numérico completo da tarefa, leitura de código.
- **Decisões de implementação (não estruturais):**
  - Estrutura de arquivos diferente da sugestão da tarefa: em vez de um único `components/settings/settings-store.ts` para custos fixos + configurações + canais, criei **três stores em três pastas** (`components/fixed-costs/`, `components/settings/`, `components/channels/`) — cada um na pasta da feature dona daquele dado, seguindo à risca o padrão já registrado em `DECISIONS.md` ("Store de leitura mora com o dono do dado"). `components/settings/` acabou só com o que é genuinely de "configurações" (faturamento/volume) — custos fixos e canais têm seus próprios lares. Registrado como decisão em `DECISIONS.md`.
  - `defaultFixedCostRate` (sugerido no formato da tarefa) **não foi persistido** — só `estimatedMonthlyRevenue`/`estimatedMonthlyUnits` são salvos; o percentual é sempre recalculado on-demand via `calculateFixedCostSummary`. Persistir um valor derivado arriscaria ficar desatualizado se os custos fixos mudassem sem essa tela ser reaberta — inconsistente com o resto do app, que nunca persiste valor calculado. Registrado em `DECISIONS.md`.
  - Resumo de `BusinessSettingsForm` é "ao vivo" (usa o que está sendo digitado, não só o que foi salvo) — mesma filosofia de prévia instantânea já usada em `IngredientForm`/`RecipeForm`/`PricingForm`.
  - Canal customizado e custo fixo não têm edição nesta fase (só criar/listar/excluir) — pedido explícito da tarefa para canais, estendido por consistência para custos fixos também (nenhuma tela de CRUD do app tem edição ainda; ver risco abaixo).
- **Problemas encontrados:** nenhum bloqueante no código. Vários diagnósticos do editor defasados durante a edição incremental de `storage-service.ts` e `PricingForm.tsx` (aviso de "propriedade ausente"/"declarado mas nunca lido" que desapareceram assim que o arquivo ficou completo) — mesma situação recorrente das fases anteriores; `typecheck` final sempre limpo. Mesmo obstáculo de ambiente de sempre (processo `next dev` órfão de sessão anterior).
- **Riscos:**
  - Nenhuma tela de CRUD do app (ingredientes, receitas, custos fixos, canais) tem edição — só criar e excluir. Corrigir um valor errado exige excluir e recadastrar. Aceitável até aqui pelo escopo controlado de cada fase; vale uma fase própria de "editar" mais adiante.
  - `fixed-costs-store`, `business-settings-store` e `channels-store` são singletons independentes entre si (mesmo risco já registrado nas Fases 2-3/2-4/2-5) — sem mecanismo de notificação cruzada se, no futuro, duas telas precisarem refletir mudanças uma da outra em tempo real.
  - `calculateFixedCostSummary` na tela de Configurações não inclui mensalidades de canais (`includeChannelMonthlyFees`) — segue exatamente o exemplo da tarefa (23,1% sem canais), mas é uma opção do domínio que a UI ainda não expõe.
  - Sem verificação visual em navegador real (ver limitação acima).
- **Pendências:** backup export/import; edição de custos fixos/canais/ingredientes/receitas (Fase 2-7+).

### Revisão da Fase 2 — Interface Essencial (fluxo completo)
- **Status:** ✅ Revisada. Fase 2 pode ser considerada concluída para uma primeira versão local.
- **Escopo:** revisão crítica do fluxo `Painel → Ingredientes → Receitas → Configurações → Precificação`, das 5 rotas, dos 5 stores, do `storage-service.ts`, do `app-state.ts` e da documentação viva. Nenhuma funcionalidade nova implementada.

#### 🐞 Bug real encontrado e corrigido — Painel com contagens desatualizadas
- **Sintoma:** a usuária cadastrava ingredientes (ou receitas/custos fixos/canais) e, ao voltar para o Painel por **navegação client-side** (sem recarregar a página), o Painel continuava exibindo "Você ainda não cadastrou nada por aqui". Na prática, o app parecia ter perdido os dados dela — logo na primeira tela, e exatamente no fluxo principal do produto.
- **Causa:** `Dashboard.tsx` mantinha um cache de módulo próprio (`cachedSnapshot`, alimentado por `loadAppState()`) com `subscribe` **no-op**. Como o cache é um singleton de módulo, ele sobrevive à navegação client-side; e como ninguém notificava, `useSyncExternalStore` nunca era avisado para reler. O valor lido na primeira visita ficava congelado pelo resto da sessão.
- **Por que passou despercebido até aqui:** o risco foi corretamente identificado e documentado na Fase 2-2 (ver risco riscado acima), com a instrução explícita "reavaliar quando a Fase 2-3 criar CRUD de verdade". As Fases 2-3, 2-4, 2-5 e 2-6 criaram quatro telas de escrita — e a reavaliação nunca aconteceu. Cada fase validou a **sua** tela isoladamente; o bug só aparece na **transição entre telas**, que nenhuma fase testou.
- **Correção:** `Dashboard.tsx` agora lê os mesmos stores reativos das telas de CRUD (`ingredients-store`, `recipes-store`, `fixed-costs-store`, `channels-store`) em vez do cache próprio — todos já têm `subscribe`/`notify` corretos desde que foram criados. Segue o padrão já registrado em `DECISIONS.md` ("uma feature pode LER o store de outra feature diretamente") e, de quebra, elimina a duplicação de responsabilidade de leitura que existia. Só `storageOk` mantém cache próprio com `subscribe` no-op — disponibilidade de `localStorage` genuinamente não muda durante a sessão, então ali o no-op é correto.
- **Prova da correção:** simulação do fluxo completo (mesma técnica de compilação temporária das fases anteriores) — Painel vazio → cadastrar 2 ingredientes → Painel mostra 2 → cadastrar receita → Painel mostra 1 → cadastrar custo fixo + canal → Painel mostra 1 e 1 → excluir ingrediente → Painel mostra 1. Antes da correção, o passo 2 devolvia `0`. 7/7 checagens.

#### ✅ Verificações que passaram (sem alteração necessária)
- **Navegação principal coerente:** 5 links reais no Header, `usePathname` destacando o ativo, todas as 5 rotas respondendo `200`, todos os 4 links de seção presentes em todas as páginas. Nenhum link morto, nenhum rótulo "em breve" sobrando.
- **App com `localStorage` vazio:** `loadAppState()` devolve estado vazio válido; cada tela mostra seu estado vazio amigável; `calculateFixedCostSummary` com lista vazia devolve `rate 0` sem erro.
- **App com dados antigos sem `businessSettings`:** ingredientes/receitas preservados, `businessSettings` recomposto com padrão seguro, `loadBusinessSettings()` não quebra. (Coberto também pelos 16 testes de `storage-examples.ts`.)
- **Excluir ingrediente usado em receita:** não lança exceção; `calculateRecipe` devolve `NOT_FOUND` tratável; `RecipeList` e `PricingForm` exibem a mensagem do domínio em vez de quebrar; `PricingForm` corretamente não chama `calculatePricing` nesse caso.
- **Sem clobbering entre fatias:** salvar receita não apaga ingredientes (cada `saveX` faz read-modify-write com `loadAppState()` fresco).
- **Stores sem duplicação de responsabilidade:** após a correção, cada fatia tem exatamente um dono que escreve; leitores reusam o store do dono. Nenhum componente fala com `localStorage` direto.
- **Sem risco de hydration bug:** todas as 5 rotas são prerenderizadas estáticas; todo acesso a `localStorage` passa por `useSyncExternalStore` com `getServerSnapshot` devolvendo referências estáveis. Servidor e primeira pintura do cliente sempre concordam.
- **Fórmulas da Fase 1 intactas:** 50/50 testes de precificação continuam passando.

#### 📄 Documentação desatualizada (corrigida)
- `PricingForm.tsx`: comentário de cabeçalho dizia "sem persistir" e "sem CRUD de canais ainda" — ambos deixaram de ser verdade na Fase 2-6. Atualizado.
- `ingredients-store.ts`: comentário descrevia o comportamento antigo do `Dashboard` ("só LÊ o storage — um cache de módulo simples bastava"), que acabou de mudar. Atualizado.

#### ⏳ Pendências registradas (NÃO implementadas nesta revisão)
Melhorias de UX/futuro, deliberadamente deixadas para uma fase própria:
1. ~~**Nenhuma tela tem edição**~~ **→ Resolvido na Fase 2-7** (ver seção própria abaixo).
2. ~~**Exclusão sem confirmação**~~ **→ Confirmação resolvida na Fase 2-7.** O "aviso de uso" (quantas receitas usam um ingrediente antes de excluir) continua pendente — ver item 9 abaixo.
3. ~~**Texto inválido no "preço praticado" some com o resultado inteiro**~~ **→ Resolvido na Fase 2-7** (ver seção própria abaixo).
4. **Inconsistência de entrada decimal** — `IngredientForm`/`RecipeForm` usam `<input type="number">` (rejeita vírgula na maioria dos navegadores); `PricingForm`/`FixedCostForm`/`CustomChannelForm`/`BusinessSettingsForm` usam `type="text"` com vírgula aceita. Padronizar numa passada de polimento. **Ainda pendente.**
5. **Marca não é link para a home** — "Doce Margem" no Header é um `<span>`; o convencional é levar para `/`. Trivial, mas quebra expectativa. **Ainda pendente.**
6. **Lucro desejado não é persistido** — a usuária redigita a cada visita à Precificação. Candidato natural a entrar em `businessSettings` numa próxima fase. **Ainda pendente.**
7. **`includeChannelMonthlyFees` não é exposto na UI** — o domínio (Fase 1C-2) suporta somar mensalidades de canais ao rateio de custo fixo, mas a tela de Configurações não oferece a opção. **Ainda pendente.**
8. **Sem verificação visual em navegador real** — limitação de todas as fases (sem `chromium-cli`/Playwright disponível, e instalar seria dependência nova). A prova continua sendo SSR + lógica isolada + leitura de código. **Ainda pendente — recomendo fortemente um passe manual em navegador antes de seguir para Supabase/Auth.**
9. **Sem aviso de itens em uso antes de excluir** (novo, nasceu do item 2 acima) — excluir um ingrediente usado por receitas continua sem avisar quantas receitas vão quebrar; o erro só aparece depois, ao abrir a receita (mostra `NOT_FOUND` do domínio, não quebra, mas não é preventivo). **Pendente.**

#### Riscos restantes
- As pendências 4–9 acima (decimal inconsistente, persistência de preferências, mensalidade de canal no rateio, sem teste em navegador, sem aviso de uso antes de excluir) continuam relevantes para uma fase de polimento futura.
- Continua sem migração de schema: mudar a forma de um campo **existente** exigirá escrever uma migração antes de incrementar `APP_STATE_SCHEMA_VERSION` (adicionar campo novo, como na Fase 2-6, não exige — ver `DECISIONS.md`). Precisa ser resolvido antes de existirem dados reais de produção.
- Stores continuam sendo singletons de módulo, sem sincronização **entre abas** (`storage` event não é escutado). Duas abas abertas divergem até um reload. Não é um problema no uso esperado (uma aba), mas é um limite conhecido.

### Fase 2-7 — Ajustes finais de UX da Interface Essencial
- **Status:** ✅ Concluída
- **Escopo:** confirmação antes de excluir, edição básica de registros, e correção do comportamento da precificação com campos inválidos — as 3 lacunas mais relevantes apontadas pela Revisão da Fase 2. Nenhuma funcionalidade nova além do pedido; nenhum arquivo em `modules/pricing/` tocado.

#### 1. Confirmação antes de excluir
`window.confirm(...)` adicionado antes de cada `removeX(...)` nas 4 listas: `IngredientList.tsx`, `RecipeList.tsx`, `FixedCostList.tsx`, `CustomChannelList.tsx` — mensagens exatamente como pedidas ("Tem certeza que deseja excluir este ingrediente?" etc.). Cancelar o `confirm` não chama `removeX`.

#### 2. Edição básica de registros
- **4 stores ganharam `updateX(id, dado)`** (`ingredients-store.ts`, `recipes-store.ts`, `fixed-costs-store.ts`, `channels-store.ts`) — mesmo padrão de `addX`/`removeX`: substitui o item pelo id no array, preserva o `id` original (ignora o que vier no candidato), persiste via `saveX` e notifica os assinantes.
- **4 formulários ganharam modo edição** (`IngredientForm`, `RecipeForm`, `FixedCostForm`, `CustomChannelForm`): prop `editingX?: X | null` + `onDoneEditing?: () => void`. Título e botão principal mudam ("Editar ingrediente"/"Salvar alterações"); botão "Cancelar edição" aparece só em modo edição. No submit, `editingX?.id` decide entre `updateX`/`addX` — a mesma validação de domínio (`validateIngredient`/`validateRecipe`/`validateFixedCost`/`validateChannel`) roda nos dois casos, sem duplicar regra.
- **4 listas ganharam botão "Editar"** + destaque visual (borda rosa) na linha em edição.
- **4 componentes novos `*Screen.tsx`** (`IngredientsScreen`, `RecipesScreen`, `FixedCostsScreen`, `CustomChannelsScreen`) — cada um combina o Form + a List da sua feature e guarda `editingId` (`useState`, estado de UI puro, não persistido). As 4 páginas (`app/ingredientes`, `app/receitas`, `app/configuracoes`) passaram a renderizar o `*Screen` no lugar do Form/List diretos.
- **Como troca de modo sem `useEffect`:** o `Screen` renderiza `<XForm key={editingId ?? "new"} editingX={...} .../>`. Trocar a `key` faz o React desmontar e remontar o componente do zero sempre que `editingId` muda (entrar em edição, trocar de item, cancelar) — os `useState` do formulário reinicializam com os valores do item (ou em branco, se "new") sem precisar de `useEffect` sincronizando props→state. Evita reintroduzir o padrão que já causou o bug do `Dashboard` corrigido na revisão anterior (`react-hooks/set-state-in-effect`).
- **Como evita duplicar:** o formulário nunca decide o `id` — em modo criação, `addX` gera um novo; em modo edição, `updateX(editingX.id, ...)` sempre sobrescreve o item existente por esse id específico, nunca acrescenta ao array.
- **Caso de borda tratado:** `Ingredient.id`/`Recipe.id`/etc. podem ser opcionais no tipo (o `id` é "preenchido pela camada de persistência" — Fase 1A), mas todo item que vem do store JÁ tem id. Cada `handleSubmit` trata esse caso com um `if (editingX?.id) {...} else if (editingX) {...} else {...}` — o ramo do meio (editando mas sem id) documenta a invariante e não deveria ser alcançável, mas não deixa a usuária travada se acontecer.
- **`RecipeForm` — caso especial:** ao editar, `items` é inicializado só com os itens `kind: "ingredient"` da receita (`.filter` com type predicate). Hoje isso é sempre 100% dos itens (a interface nunca cria sub-receita nem medida caseira), mas fica registrado: se um dado externo tivesse outro `kind`, ele seria descartado ao salvar a edição — não implementado porque não há como esse cenário acontecer com o app atual (`CLAUDE.md`: não validar contra o que não pode acontecer).

#### 3. Precificação com campos inválidos
- Três novas variáveis derivadas em `PricingForm.tsx`: `fixedCostRateInvalid`, `profitInvalid`, `practicedPriceInvalid` — `true` só quando o campo tem texto **não vazio** que não converte para número (`raw.trim() !== "" && decimalOuNumero === null`). Campo vazio nunca é tratado como erro.
- O componente `Field` local ganhou uma prop `error?: string`, seguindo o mesmo formato visual já usado em `IngredientForm`/`RecipeForm`/`FixedCostForm`/`CustomChannelForm` (texto vermelho abaixo do campo, substitui o `hint` quando presente).
- Mensagens: "Confira o custo fixo. Use apenas números (ex.: 23,1) ou deixe o campo vazio.", "Confira o lucro desejado. Use apenas números (ex.: 20).", e para preço praticado a frase exata pedida na tarefa ("Confira o preço praticado. Use apenas números maiores que zero ou deixe o campo vazio.").
- **Preço praticado vazio continua calculando normalmente:** comportamento já correto antes desta fase (`parseOptionalNumber("")` devolve `undefined`, que o `computePricingResult` trata como "omitir do input do engine", não como erro) — confirmado, não alterado.
- **Preço praticado zero/negativo:** já era tratado corretamente antes (o próprio `calculatePricing` valida e devolve `NON_POSITIVE`, exibido no bloco de erros existente) — não precisou de mudança.
- **A matemática do pricing engine não foi tocada** — a correção é inteiramente de camada de exibição: quais mensagens aparecem e onde, não como `calculatePricing` calcula.

#### Testado
- **17 checagens isoladas** (mesma técnica de compilação temporária das fases anteriores) provando as 4 funções `updateX`: não duplica, preserva o id original, atualiza os campos certos, persiste de verdade (`loadX()` direto do storageService), dispara `notify()`, e — crucial — editar um item específico numa lista com múltiplos itens não afeta os outros.
- Reconfirmados os 50 testes de precificação (1A→1C-3) e as 16 checagens de storage (Fase 2-1 + 2-6) — nada regrediu.
- `npm run typecheck`, `npm run lint` e `npm run build` limpos após cada sub-etapa (ingredientes, receitas, custos fixos, canais, precificação) e no final.
- Servidor de dev real: 5 rotas em `200`, sem erro no log nem no HTML.
- **Limitação:** mesma de todas as fases — sem `chromium-cli`/Playwright disponível. Não cliquei fisicamente em "Editar" num navegador; a prova ficou em três camadas (lógica de store isolada, SSR, leitura de código). Recomendo o teste manual descrito na pendência 8 antes de avançar para Supabase/Auth.

#### Decisões de implementação (não estruturais)
- Componentes `*Screen.tsx` (não sugeridos pela tarefa) foram necessários para compartilhar o estado `editingId` entre o Form e a List de cada feature, que hoje são renderizados como irmãos pela página. Preferi um novo componente client pequeno (guardando só `useState`) a converter as páginas (hoje Server Components estáticos) em Client Components — mantém o mínimo de JavaScript no cliente por página. Renderiza um Fragment (não uma `<div>`) para não interferir no grid CSS da página.
- Padrão `key`-remount para resetar o formulário ao trocar de item em edição, em vez de `useEffect` sincronizando props→state — ver decisão registrada no `DECISIONS.md`.

### Fase 2-8 — Backup export/import dos dados locais
- **Status:** ✅ Fatia de backup export/import concluída. Os demais polimentos da Fase 2-8 (decimal consistente, aviso de uso antes de excluir e teste manual em navegador real) continuam pendentes.
- **Escopo:** rede de segurança local antes de Supabase/Auth. Nenhum Supabase, Auth, webhook, admin ou fórmula de `modules/pricing/` foi criado/alterado.

#### O que foi feito
- `services/backup-service.ts`: novo serviço de backup. Exporta JSON com `appName: "Doce Margem"`, `backupVersion`, `schemaVersion`, `updatedAt`, `exportedAt` e o `AppState` completo em `data`.
- `components/backup/BackupPanel.tsx`: novo painel client em `/configuracoes`, com botão "Exportar backup", seletor de arquivo `.json`, ação "Importar backup", mensagens de sucesso/erro e confirmação antes de sobrescrever.
- `app/configuracoes/page.tsx`: nova seção "Backup dos dados" ao final da tela.
- `services/storage-service.ts`: `normalizeAppState` passou a ser exportada para o backup reutilizar a normalização segura já existente, sem duplicar regra.
- Stores reativos ganharam `reload*FromStorage()` para refletir uma importação completa imediatamente: ingredientes, receitas, custos fixos, canais customizados e configurações financeiras.

#### Importação segura
- JSON inválido cai no `catch` de `JSON.parse` e retorna mensagem amigável, sem lançar exceção para a UI.
- Arquivo sem `appName: "Doce Margem"` é rejeitado.
- `exportedAt`, `backupVersion` e `schemaVersion` são validados antes de salvar.
- Dados parciais antigos continuam compatíveis: se arrays ou `businessSettings` estiverem ausentes, `normalizeAppState` recompõe padrões seguros.
- A importação salva o `AppState` inteiro uma única vez via `saveAppState`, pede confirmação antes e depois recarrega todos os stores.

#### Validações
- `npm.cmd run typecheck` → exit 0.
- `npm.cmd run lint` → exit 0.
- `npm.cmd run build` → exit 0. A primeira tentativa no sandbox falhou porque `next/font` não conseguiu buscar Geist/Geist Mono no Google Fonts; repetido com rede liberada e passou. Rotas seguem estáticas: `/`, `/configuracoes`, `/ingredientes`, `/precificacao`, `/receitas`.

#### Limitação
- Teste manual em navegador real não foi concluído neste ambiente. `Start-Process` falhou por conflito de `PATH`, `Start-Job` não persistiu entre comandos, e o runtime Node usado pelo browser falhou antes de executar por erro interno de caminho. Recomendo um clique manual local antes de avançar para Supabase/Auth: exportar, alterar dados, importar e conferir as telas.

### Fase 4-1A — Base SQL de profiles
- **Status:** ✅ Concluída no que depende do repositório. ⚠️ **Não verificada contra um Postgres real** — ver "Limitação" abaixo.
- **Escopo:** só SQL e documentação. Nenhum client Supabase, nenhuma tela, nenhuma dependência, nenhuma licença. A interface local não foi tocada.

#### O que foi feito
- `supabase/migrations/0001_profiles.sql` (novo, único arquivo de código desta etapa):
  - **`public.profiles`** — `id` (FK para `auth.users` com `on delete cascade`), `email`, `full_name`, `created_at`, `updated_at`.
  - **`public.user_access_flags`** — `user_id` (PK/FK para `profiles`), `is_blocked`, timestamps.
  - **`set_updated_at()`** + triggers nas duas tabelas.
  - **`profiles_guard_immutable_columns()`** + trigger — rejeita alteração de `id`/`email` para quem não é `service_role`/`postgres`.
  - **`handle_new_user()`** + trigger `on_auth_user_created` em `auth.users` — cria perfil **e** flags no signup.
  - RLS habilitado nas duas tabelas + 3 policies.
  - `REVOKE ALL` seguido de grants mínimos, incluindo `grant update (full_name)` por coluna.
  - Índice `profiles_email_idx` em `lower(email)` para a busca do admin (Fase 7).

#### Como o risco de `is_blocked` foi resolvido — três camadas
O `PLAN-FASE-4.md` tinha registrado o furo: uma policy de "editar o próprio perfil" abriria **todas** as colunas da linha, inclusive um `is_blocked` que ali estivesse — a usuária se desbloquearia sozinha. RLS controla *quais linhas*, não *quais colunas*.

1. **Isolamento em tabela própria.** `is_blocked` saiu de `profiles` e foi para `user_access_flags`, que **não tem nenhuma policy de escrita**. Com RLS ligado e sem policy, o Postgres nega por padrão — só `service_role` (que ignora RLS) grava. A regra vira trivial de auditar: "esta tabela é read-only para o cliente".
2. **Privilégio por coluna.** `revoke all` + `grant update (full_name)` em `profiles`. Sem isso, a policy `profiles_update_own` deixaria alterar `email` (quebrando o espelho de `auth.users`) e `created_at`. É a peça que RLS sozinha não cobre.
3. **Trigger de imutabilidade.** Rede contra erro futuro: se alguma migration fizer `grant update on profiles to authenticated` amplo — engano fácil e silencioso — o trigger falha alto em vez de reabrir o furo sem ninguém notar.

Leitura do próprio `is_blocked` **é permitida** (`select` do próprio registro): o DAL da Fase 4-3 roda com a sessão da usuária e precisa saber se ela está bloqueada para exibir a tela de acesso bloqueado. Não é informação sensível — quem está bloqueado percebe de qualquer forma.

#### Decisões de implementação
- **`search_path` fixado em todas as 3 funções** (`set search_path = ''`), com todo identificador qualificado. Sem isso, uma função `security definer` pode ser sequestrada por um schema malicioso no `search_path` — é o erro clássico desse tipo de função.
- **`revoke execute ... from public, anon, authenticated`** em `handle_new_user()`: função `security definer` não deve ser executável por qualquer um.
- **`on conflict do nothing`** nos dois inserts do signup — evita derrubar o cadastro em reprocessamento/replay.
- **Falha no trigger derruba o signup inteiro** (é `after insert` na mesma transação). Comportamento desejado: não gera `auth.users` órfão sem perfil.
- **`coalesce(new.email, '')`** — `auth.users.email` é nullable (signup por telefone). O app usa só e-mail/senha, mas o coalesce evita quebrar o cadastro se isso mudar.
- **`(select auth.uid())`** em vez de `auth.uid()` puro nas policies: forma recomendada pelo Supabase, avaliada uma vez por statement em vez de uma vez por linha.
- **`anon` não recebe privilégio nenhum** nas duas tabelas.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0. Nenhum arquivo TypeScript foi alterado — rodados só para confirmar ausência de impacto.
- Auditoria estática das invariantes do próprio SQL: **0** policies de escrita em `user_access_flags`; **1** única coluna com `grant update` (`full_name`); **3/3** funções com `search_path` fixado; RLS em **2/2** tabelas.

#### ⚠️ Limitação — o que NÃO foi verificado
**Nenhuma linha deste SQL foi executada.** Não há projeto Supabase conectado, então a migration não foi aplicada, e a revisão foi por leitura + auditoria estática. Concretamente, ainda **não** está provado que:
- a sintaxe roda sem erro num Postgres real;
- o trigger em `auth.users` pode ser criado com as permissões que a migration recebe;
- as policies e grants se comportam como esperado — em especial, que uma sessão `authenticated` de fato **falha** ao tentar `update user_access_flags` e ao tentar `update profiles set email = ...`.

Essa terceira verificação é a que realmente importa, e é um **teste que precisa ser feito com o banco de pé**, antes da Fase 4-2. Registrado como tarefa pendente em `TASKS.md`.

#### Riscos
- **Risco principal:** o SQL nunca rodou (acima). Enquanto não rodar, a proteção de `is_blocked` é uma intenção bem fundamentada, não um fato verificado.
- `current_user in ('service_role','postgres','supabase_admin')` no trigger de imutabilidade assume os nomes de papel do Supabase gerenciado. Se o deploy for num Postgres self-hosted com papéis diferentes, a lista precisa ser revista.
- Trocar o e-mail via Supabase Auth **não** atualiza `profiles.email` automaticamente — o trigger atual só roda no `insert`. Se a troca de e-mail for oferecida na UI, será preciso um trigger de `update` em `auth.users`. Fora do escopo desta etapa; anotar para a 4-1B.
- Ainda sem `licenses`: `user_access_flags` sozinha não concede acesso a nada. É só metade do modelo (a metade que revoga).

### Fase 4-1B — Supabase client + Auth básico
- **Status:** ✅ Concluída no que depende do repositório. ⚠️ Falta um passe humano com acesso a caixa de e-mail (ver "Limitação").
- **Escopo:** cadastro, login, logout e tela de conta. Sem licenças, sem gating de plano, sem webhooks, sem admin, sem migração de dados locais.

#### O que foi feito
- **Dependências (as duas únicas):** `@supabase/supabase-js` e `@supabase/ssr`.
- **`services/supabase/server.ts`** — client de servidor com chave anônima + cookies (`getAll`/`setAll`, interface atual; `get`/`set`/`remove` está deprecada). `getAuthUser()` usa **`getUser()`**, que revalida o JWT com o servidor Auth, nunca `getSession()`. `import "server-only"` faz o build falhar se um Client Component importar. Nada aqui lança: sem config ou com Supabase fora do ar, devolve `null`.
- **`app/auth/actions.ts`** — `signUpAction`, `signInAction`, `signOutAction`. Senha viaja em `FormData` direto para o servidor.
- **`components/auth/form-state.ts`** — tipo `AuthFormState` + `initialAuthFormState`, fora do módulo `"use server"` (motivo abaixo).
- **`components/auth/{AuthFormShell,LoginForm,SignupForm}.tsx`** — `useActionState` (React 19), com `pending` desabilitando o botão e `aria-live` na mensagem.
- **Páginas** `/login`, `/cadastro` (redirecionam para `/conta` se já logada), `/conta` (redireciona para `/login` se não logada).
- **`app/auth/callback/route.ts`** — troca o `code` por sessão. O parâmetro `next` só é aceito como caminho relativo: `next=https://site-malicioso` viraria open redirect.
- **Header + layout** — o layout (Server Component) resolve a sessão e passa **só um booleano** ao Header. O cliente nunca recebe token nem objeto de usuária, e nunca decide sozinho se está autenticado.

#### Erro real encontrado pelo build (typecheck e lint não pegaram)
`A "use server" file can only export async functions, found object` — um módulo `"use server"` só pode exportar funções async, e eu exportava `initialAuthFormState` (um objeto) de `app/auth/actions.ts`. Corrigido movendo tipo e estado inicial para `components/auth/form-state.ts`, um módulo neutro que os dois lados importam. Vale registrar que **só o `build` pegou** — é o motivo de ele estar no gate de toda fase.

#### Dois defeitos de UX encontrados testando contra o Supabase real
Criei uma conta de teste de verdade e exercitei os caminhos de erro. Dois achados que a leitura de código não daria:

1. **Confirmação de e-mail está LIGADA no projeto.** O signup devolve usuária sem `access_token` e com `confirmation_sent_at`. O código já tratava esse caminho (mensagem "Confira seu e-mail"), mas isso torna `app/auth/callback/route.ts` **essencial**, não opcional — sem ele, ninguém consegue concluir o cadastro. Também exige `NEXT_PUBLIC_APP_URL` correto em produção, senão o link do e-mail aponta para o lugar errado.
2. **`email_not_confirmed` é um código distinto de `invalid_credentials`.** Minha primeira versão mapeava *todo* erro de login para "E-mail ou senha inválidos" — em nome de não permitir enumeração de e-mail. Só que quem se cadastrou, não confirmou e tenta entrar receberia "senha inválida" e iria caçar um problema que não existe. Passei a distinguir **esse único caso**, com mensagem orientando a procurar o e-mail de confirmação. O vazamento é pequeno (revela cadastro pendente para aquele endereço) e o ganho é grande: sem isso, vira chamado de suporte com uma usuária não-técnica. Todos os demais erros seguem com a mensagem genérica.
3. Terceiro achado menor: signup repetido no mesmo e-mail devolve **429** (limite de reenvio). Caía na mensagem genérica "Confira os dados", que não ajuda; agora diz para esperar alguns segundos.

#### Decisões de implementação
- **Não criei `services/supabase/browser.ts`**, embora estivesse na lista sugerida. Todo o auth desta fase roda em Server Actions — que é o caminho mais seguro, com os cookies gravados server-side — então um client de browser seria código morto. Entra quando houver leitura client-side de dados (fase de nuvem do Pro) ou `onAuthStateChange`.
- **Não criei `app/auth/proxy.ts`/`proxy.ts`.** Pertence à Fase 4-5 no plano, e a tarefa pedia para não tratar proxy como autorização. Consequência conhecida registrada abaixo.
- **`AuthFormShell` compartilhado** entre login e cadastro para os dois não divergirem em estilo e em como exibem erro.
- **Layout virou `async`** e lê a sessão — por isso as rotas passaram de estáticas (`○`) para dinâmicas (`ƒ`). É o preço esperado de ter estado de conta no cabeçalho, e está correto para um app com auth.

#### Validações
- `npm run typecheck` → exit 0. `npm run lint` → exit 0. `npm run build` → exit 0, 10 rotas, todas `ƒ (Dynamic)`.
- **Auditoria de segurança por grep:** 0 leituras de `SUPABASE_SERVICE_ROLE_KEY` (as 2 ocorrências no código são comentários explicando que ela não é usada); 0 usos de `getSession(` (a 1 ocorrência é comentário); nenhum Client Component importa `services/supabase/server`.
- **Teste contra o Supabase real do projeto:** cadastro criou usuária de verdade (`id` retornado); login sem confirmação devolve `email_not_confirmed`; senha errada devolve `invalid_credentials`; signup repetido devolve 429.
- **Servidor de dev:** 7 rotas em `200`, `/conta` sem sessão em `307 → /login`, Header mostrando "Entrar/Criar conta", Painel local intacto, 0 erros no log.

#### ⚠️ Limitação — o que NÃO foi verificado
- **O fluxo completo não foi fechado.** Como a confirmação de e-mail está ligada e a conta de teste usa um endereço ao qual não tenho acesso, **não** percorri: clicar no link de confirmação → `/auth/callback` trocar o code por sessão → login → `/conta` exibindo nome e status. Falta um passe humano com uma caixa de e-mail real.
- **Não reverifiquei o trigger `handle_new_user`.** Confirmar que `profiles` e `user_access_flags` ganharam linha exigiria ou uma sessão autenticada (bloqueada pela confirmação pendente) ou a `SUPABASE_SERVICE_ROLE_KEY` — que esta fase proíbe usar. Estou me apoiando na validação já feita e registrada no contexto da tarefa.
- **Uma conta de teste foi criada** no projeto Supabase (`doce.margem.teste.<timestamp>@gmail.com`) e **não foi removida** — remover exigiria service role. Registrado como tarefa na Fase 4-1C.

#### Riscos
- **Sessão expirada não se renova sozinha.** Sem `proxy.ts`, o token de acesso (1h por padrão) não é renovado durante a navegação em Server Components, que não podem gravar cookies. Na prática a usuária pode parecer deslogada até uma ação que escreva cookies. **Resolver na Fase 4-5** — é o principal débito desta fase.
- **Nenhuma rota está protegida além de `/conta`.** As telas locais (`/ingredientes`, `/receitas`, `/precificacao`, `/configuracoes`) continuam abertas, de propósito: o Essencial é local-first e o gating de licença é a Fase 4-5/4-6.
- Todas as rotas viraram dinâmicas. Correto para um app com auth, mas significa render por requisição — reavaliar se algum conteúdo público (ex.: `/precos`, Fase 4-6) puder voltar a ser estático.
- Copy do cadastro assume confirmação de e-mail ligada. Se ela for desligada no painel, a mensagem "Confira seu e-mail" fica errada — a decisão precisa ser tomada e refletida na copy (Fase 4-1C).

### Fase 4-2A — Base SQL de licenças
- **Status:** ✅ Concluída no repositório e validada manualmente no Supabase real em 2026-08-05.
- **Escopo:** só SQL e documentação. Sem gating de rota, sem webhooks, sem admin, sem uso de service role em código, sem tocar na interface local.

#### O que foi feito
`supabase/migrations/0002_licenses.sql` (novo, único arquivo de código):
- **`public.licenses`** — 4 constraints além das PK/FK: `product_type` e `status` com vocabulário fechado, coerência produto×validade (`annual_pro` exige `expires_at`; `one_time` exige nulo), e `UNIQUE (provider, provider_order_id)` para idempotência de webhook.
- **`public.license_events`** — `CHECK` fechado em `event_type` (8 valores), FKs com `ON DELETE SET NULL`, trigger de imutabilidade.
- **5 funções de acesso, em duas camadas** (ver "Funções de acesso" abaixo).
- **RLS** nas duas tabelas, só `SELECT` do próprio registro. **4 índices.**

#### Funções de acesso — internas × expostas
Ajuste feito ainda na 4-2A, fechando o vazamento lateral que eu havia levantado como risco na primeira entrega:

| Camada | Funções | `EXECUTE` |
|---|---|---|
| **Internas** (recebem `uid`) | `is_user_blocked(uid)`, `has_pro_access(uid)`, `has_essential_access(uid)` | revogado de `public`, `anon` e `authenticated` — só `service_role` |
| **Expostas** (sem parâmetro) | `current_user_has_pro_access()`, `current_user_has_essential_access()` | só `authenticated` |

As expostas resolvem `auth.uid()` por dentro e devolvem `false` quando ele é nulo (sessão anônima), de forma explícita em vez de depender de a função interna tratar `NULL` por acaso. Como recebem zero parâmetros, **não há como perguntar sobre outra pessoa** — o vazamento fica fechado por construção, não por convenção de uso.

A chamada em cadeia funciona porque, dentro de uma função `SECURITY DEFINER`, o papel efetivo é o da dona da função (não `authenticated`) — revogar `EXECUTE` das internas não impede as expostas de chamá-las. Também revoguei de `public`, e não só de `anon`/`authenticated`: o Postgres concede `EXECUTE` a `PUBLIC` por padrão em toda função nova, então revogar só dos papéis nomeados deixaria a porta aberta.

**Consequência para as fases seguintes:** policies de RLS de tabelas futuras do Pro devem usar `public.current_user_has_pro_access()`. A forma que o `PLAN-FASE-4.md` sugeria — `has_pro_access(auth.uid())` — **falharia** agora, por falta de privilégio. O plano foi corrigido nos dois pontos onde aparecia.

Não criei `current_user_is_blocked()`: o cliente já lê o próprio `is_blocked` direto de `user_access_flags` pela RLS da 4-1A, e uma função a mais só ampliaria a superfície sem necessidade. Se o DAL da 4-3 preferir a função, é adicioná-la lá.

#### Divergência do plano encontrada e corrigida
O `PLAN-FASE-4.md` (linha 189) definia a função de acesso como `join profiles p ... where p.is_blocked = false`. Mas a Fase 4-1A **moveu `is_blocked` de `profiles` para `user_access_flags`** — copiado literalmente do plano, este SQL **não compilaria** (coluna inexistente). Corrigido na migration; o plano foi alinhado. É exatamente o tipo de deriva que um plano escrito antes da implementação acumula, e vale o hábito de reler o schema real antes de transcrever.

#### Três decisões que divergem da minha primeira versão (a especificação estava certa)
Eu havia escrito uma versão antes de a especificação completa chegar. Três pontos dela eram melhores:
1. **`ON DELETE SET NULL` em vez de `CASCADE`** nas FKs de `license_events`. Eu tinha posto cascade — o que **destruiria a evidência** de um reembolso ao apagar a conta, exatamente quando ela é mais necessária (disputa de chargeback). Com `SET NULL`, o evento sobrevive órfão e anonimizado. Efeito colateral bom: exclusão de conta não cascateia mais para cá, o que simplificou o trigger de imutabilidade.
2. **`CHECK` fechado em `event_type`.** Eu havia deixado livre, argumentando que evento novo não deveria exigir migration. Numa tabela de auditoria isso é fraco: um typo (`'refund'` em vez de `'refunded'`) cria um registro que nenhuma consulta encontra. Um vocabulário novo é uma extensão deliberada — merece migration.
3. **Assinatura `(uid uuid)` nas funções.** Eu havia feito sem parâmetro, usando `auth.uid()` internamente, para impedir consultar terceiros. Mantida a assinatura da especificação por ser o que o admin (Fase 7) e as policies precisam. Ressalva registrada em "Riscos".

#### Como o cliente é impedido de criar/editar licença — duas barreiras independentes
1. **Sem policy de escrita.** Com RLS ligado e nenhuma policy de `INSERT`/`UPDATE`/`DELETE`, o Postgres nega por padrão. Só `service_role` (que ignora RLS) grava.
2. **Sem privilégio de escrita.** `REVOKE ALL` seguido de apenas `GRANT SELECT`. Mesmo que uma migration futura adicione uma policy por engano, falta o privilégio.

Vale a mesma leitura da Fase 4-1A: **RLS decide quais linhas; GRANT decide quais colunas.** Aqui o cliente não escreve nada, então nenhum grant de escrita — nem por coluna.

#### Como Essencial × Pro Anual foi tratado
- **Coexistem:** nenhuma unicidade por `(user_id, product_type)`. Acesso é agregado sobre todas as linhas.
- **Pro implica Essencial:** `has_essential_access` aceita `one_time` ativa **OU** `annual_pro` vigente. Sem isso, quem assina o Pro sem ter comprado o Essencial ficaria sem as telas básicas.
- **Essencial não implica Pro:** `has_pro_access` só olha `annual_pro`.
- **Pro vencido, Essencial permanece:** quem tem `one_time` ativa continua com Essencial quando o Pro expira.
- **Sem plano mensal:** o `CHECK` em `product_type` aceita só dois valores — o banco recusa fisicamente.

#### Como reembolso / chargeback / cancelamento foi tratado
Por **status no backend**, nunca por lógica de frontend. Três gatilhos independentes de revogação:
1. `status <> 'active'` → aquela licença não conta;
2. `expires_at <= now()` (só `annual_pro`) → Pro cai, Essencial permanece se houver `one_time` ativa;
3. `is_user_blocked(uid)` → derruba tudo, mesmo com licença ativa.

O efeito é **imediato**: o acesso é sempre calculado na hora, sem cache com TTL. Um webhook (Fase 6) muda `status` e a verificação seguinte já reflete.

Detalhe deliberado: `status = 'expired'` é conveniência de registro, **não** é o que decide vencimento. As funções comparam `expires_at > now()`, então uma licença vencida que ficou com `status = 'active'` (job não rodou) **não** concede Pro. Falha fechada.

#### Matriz de acesso validada no Supabase real
Os sete cenários abaixo foram executados manualmente contra as funções SQL. É a matriz de referência que a Fase 4-3 deve repetir para provar que TypeScript e SQL não divergem — o risco #6 do plano.

| # | Situação | Essencial | Pro |
|---|---|:---:|:---:|
| 1 | Sem licença | ❌ | ❌ |
| 2 | `one_time` active | ✅ | ❌ |
| 3 | `annual_pro active` com `expires_at` futuro | ✅ | ✅ |
| 4 | `annual_pro` vencido + `one_time active` | ✅ | ❌ |
| 5 | `one_time refunded` + Pro vencido | ❌ | ❌ |
| 6 | `is_blocked = true`, mesmo com licença ativa | ❌ | ❌ |
| 7 | `is_blocked = false` + `one_time active` | ✅ | ❌ |

Casos-limite cobertos por constraint, não por lógica: `annual_pro` com `expires_at` nulo é impossível (`licenses_annual_needs_expiry`); se ainda assim ocorresse, `NULL > now()` avalia como desconhecido e a licença é excluída — falha fechada.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0. Nenhum TypeScript alterado; rodados para confirmar ausência de impacto.
- A migration `supabase/migrations/0002_licenses.sql` foi aplicada com sucesso no Supabase real.
- `licenses` e `license_events` existem e estão com RLS ativo.
- Policies encontradas: `licenses_select_own` e `license_events_select_own`, ambas somente para `SELECT`; não há policies de `INSERT`/`UPDATE`/`DELETE` para cliente.
- Grants validados: `authenticated` tem apenas `SELECT` em `licenses` e `license_events`; `anon` e `authenticated` não têm grants de escrita nessas tabelas.
- As cinco funções existem: `is_user_blocked(uid uuid)`, `has_essential_access(uid uuid)`, `has_pro_access(uid uuid)`, `current_user_has_essential_access()` e `current_user_has_pro_access()`.
- Privilégios validados: `anon` não executa nenhuma função; `authenticated` não executa as parametrizadas com `uid` e executa somente as duas funções `current_user_*`.
- A matriz de sete cenários acima foi validada manualmente contra o banco real.

#### Validações complementares ainda pendentes
O contexto manual informado não incluiu testes destrutivos ou de constraints. Ainda não está registrado que:
- uma sessão `authenticated` de fato **falha** ao tentar `insert into licenses`;
- o trigger de imutabilidade bloqueia `UPDATE` em `license_events` mesmo por `service_role`;
- `UNIQUE (provider, provider_order_id)` bloqueia pedido duplicado e permite múltiplos registros manuais com `provider_order_id` nulo.

Essas verificações complementares permanecem registradas na **Fase 4-2B**.

#### Riscos
- A estrutura, os privilégios e a regra de acesso foram validados no Supabase real; permanecem pendentes apenas os testes complementares listados acima.
- ~~**Funções aceitam `uid` arbitrário.**~~ **→ Fechado ainda na 4-2A:** as parametrizadas viraram internas (sem `EXECUTE` para o cliente) e foram criadas `current_user_has_pro_access()` / `current_user_has_essential_access()`, sem parâmetro. Ver "Funções de acesso" acima.
- **`provider` sem `CHECK`.** Um typo (`'kiwfy'`) criaria licença que a idempotência não casa. Mitigado por ser sempre escrito por código, nunca digitado — mas é uma escolha consciente de flexibilidade sobre rigidez.
- **`license_events` não é preenchida automaticamente.** Nenhum trigger em `licenses` gera evento; quem registra é o webhook (Fase 6). Se ele esquecer, a mudança de status acontece sem auditoria. Vale decidir na Fase 6 se um trigger de log automático entra — é uma escolha de contrato, não deste arquivo.
- **`current_user in ('service_role','postgres','supabase_admin')`** no trigger assume os papéis do Supabase gerenciado, como em 0001. Self-hosted com papéis diferentes exigiria revisão.

## Checklist técnico
- [x] O projeto está em C:\dev\doce-margem
- [x] Não há dependência de OneDrive
- [x] A lógica de cálculo está separada da UI _(módulos puros em `modules/pricing/`, sem UI)_
- [x] Os cálculos principais foram validados _(ingredientes, receitas, sub-receitas, medidas caseiras, canais, custos fixos e pricing engine validados — 1A → 1C-3)_
- [ ] A interface simples não assusta iniciantes
- [ ] O modo avançado preserva recursos profissionais
- [x] Não existe plano mensal _(nada de mensal documentado)_
- [ ] Compra única tem acesso controlado
- [ ] Reembolso revoga acesso
- [x] Plano Pro é anual _(modelo definido no README)_
- [ ] Permissões não dependem apenas do frontend
- [ ] Webhooks estão protegidos
- [ ] Admin está protegido
- [x] Build passa _(Fase 2-8 validada; revalidar antes de deploy na Fase 8)_

## Checklist de produto
- [x] Promessa principal está clara _(documentada no README)_
- [ ] Essencial resolve a dor principal
- [ ] Pro Anual tem valor recorrente real
- [ ] Usuária iniciante entende o primeiro passo
- [ ] Recursos avançados não aparecem cedo demais
- [x] Backup está claro
- [ ] Bloqueio de acesso tem copy clara

## Riscos conhecidos
- Complexidade excessiva para confeiteiras iniciantes.
- Quebrar a matemática ao refatorar.
- Depender apenas do frontend para bloquear acesso.
- Criar SaaS robusto antes do Essencial vendável.
- Misturar compra única com assinatura sem regra clara.
