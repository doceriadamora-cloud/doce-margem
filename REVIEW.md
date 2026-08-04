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
  - `cachedSnapshot` em `Dashboard.tsx` é um módulo-singleton: se a usuária salvar dados em outra aba/tela na mesma sessão sem recarregar esta página, o dashboard não atualiza sozinho (não há mecanismo de notificação de mudança no storageService ainda). Aceitável para a Fase 2-2 (ainda não existe nenhuma tela que escreva dados); reavaliar quando a Fase 2-3 criar CRUD de verdade.
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
