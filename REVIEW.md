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
- **Status:** ⏳ Não iniciada
- O que foi feito:
- Problemas encontrados:
- Riscos:
- Pendências:

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
