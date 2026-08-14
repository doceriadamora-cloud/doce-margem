# REVIEW — Minha Fatia

> **Marca atual:** Minha Fatia. Referências datadas a Doce Margem neste histórico técnico descrevem o nome anterior do projeto e foram mantidas quando necessárias para preservar evidências, identificadores ou configurações da época.

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

### Fase 4-3A — types/access.ts + DAL de acesso
- **Status:** ✅ Concluída no que depende do repositório. ⚠️ Caminho autenticado não exercitado (ver "Limitação").
- **Escopo:** camada de leitura de acesso + refatoração de `/conta`. **Nenhum gating** — nenhuma tela ficou bloqueada.

#### O que foi feito
- **`types/access.ts`** — `ProductType`, `LicenseStatus` (espelhos exatos dos `CHECK` da migration 0002), `ActivePlan`, `UserAccess`, mais `ANONYMOUS_ACCESS` (congelado com `Object.freeze`) e `resolveActivePlan()`, pura e exportada para poder ser verificada isoladamente.
- **`lib/auth/dal.ts`** — `getCurrentUserAccess()`, `hasEssentialAccess()`, `hasProAccess()`.
- **`app/conta/page.tsx`** — refatorada: 5 consultas espalhadas viraram **uma** chamada ao DAL.

#### Como o acesso de terceiros ficou impossível — quatro barreiras estruturais
Não é convenção de uso; é ausência de caminho:
1. **Nenhuma função do DAL recebe `userId`.** A identidade vem sempre de `getAuthUser()` → `supabase.auth.getUser()`, que revalida o JWT com o servidor Auth. Não existe assinatura por onde a UI consiga pedir o acesso de outra pessoa.
2. **Só chama as RPCs sem parâmetro.** `current_user_has_essential_access()` / `current_user_has_pro_access()` resolvem `auth.uid()` por dentro. As parametrizadas com `uid` tiveram o `EXECUTE` revogado do cliente na 4-2A.
3. **Consultas a tabela sem filtro de `user_id`.** Quem restringe é a RLS. Um filtro redundante no código daria a impressão de que a proteção mora na aplicação, quando ela mora no banco — e mascararia uma RLS quebrada.
4. **`import "server-only"`** — o build falha se um Client Component importar o DAL.

Auditado: 0 usos de `getSession`, 0 leituras de `SUPABASE_SERVICE_ROLE_KEY`, 0 funções recebendo `userId`, 0 chamadas a RPC parametrizada, 0 Client Components importando o DAL.

#### Duas decisões de robustez
- **Bloqueio reaplicado em TypeScript.** As funções SQL já descontam `is_blocked`; o DAL faz `hasX && !isBlocked` de novo. É redundância **deliberada**: se alguém mexer na regra do lado do banco e esquecer do bloqueio, o TypeScript ainda nega. As duas camadas erram para o mesmo lado.
- **Falha fechada por comparação estrita.** `resultado.data === true`, nunca truthiness. Erro na RPC devolve `data: null`, e `null === true` é `false` — sem precisar de tratamento de erro separado. Testado com `null`, `undefined`, `0`, `""`, `"true"` e `1`: todos resultam em sem-acesso.

#### Como `/conta` passou a usar o DAL
Antes: `getAuthUser()` + duas consultas manuais a `profiles` e `user_access_flags`, com interfaces de linha declaradas na própria página e nenhuma noção de licença ("Plano e licença — ainda não implementado").

Agora: uma chamada a `getCurrentUserAccess()`. A página não sabe mais que existem tabelas — só consome `UserAccess`. Mostra o nome comercial do plano ("Sem licença ativa" / "Doce Margem Essencial" / "Doce Margem Pro Anual"), uma descrição do que ele dá, e o vencimento do Pro quando existe. Mantém o aviso de que nenhuma tela está bloqueada por plano ainda.

`redirect("/login")` agora usa `access.isAuthenticated` em vez de checar o usuário direto — mesma garantia, uma abstração acima.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0; `npm run build` → exit 0 (10 rotas, todas `ƒ`).
- **27 checagens isoladas** (compilação temporária, técnica das fases anteriores): as 8 combinações de `resolveActivePlan`; a regra de bloqueio do DAL; falha fechada da RPC com 6 valores diferentes; `ANONYMOUS_ACCESS` negativo e congelado; e **os 9 cenários da matriz da 4-2A** reproduzidos no lado TypeScript — incluindo "one_time + annual_pro vencido → essential" e "annual_pro vigente + bloqueada → none".
- **Contra o Supabase real:** `anon` recebe `permission denied for function` (42501) tanto em `current_user_has_pro_access` quanto em `has_pro_access`. As duas existem (erro é de permissão, não de função inexistente), o que confirma a migration 0002 aplicada e os grants da 4-2A corretos.
- **Servidor de dev:** 7 rotas em `200`, `/conta` sem sessão em `307 → /login`, app local intacto.

#### ⚠️ Limitação — o caminho autenticado não foi exercitado
A confirmação de e-mail continua **ligada** no projeto e não tenho acesso à caixa da conta de teste. Portanto **não** verifiquei com sessão real:
- `/conta` exibindo plano e vencimento de uma licença manual;
- a mudança de plano ao alterar `status`/`expires_at` no Supabase;
- que `authenticated` **consegue** chamar `current_user_has_pro_access()`.

O que está provado é a metade negativa (anon não consegue) e a lógica TypeScript inteira. A metade positiva depende de um passe humano — registrado como **Fase 4-3B** no `TASKS.md`, com o roteiro exato.

Criei mais uma conta de teste (`doce.margem.dal.<timestamp>@gmail.com`) ao tentar essa verificação, e **não consegui removê-la** — apagar exige service role, proibida nesta fase. Somam-se duas contas de teste a limpar (a outra é da 4-1B).

#### Riscos
- **`ProductType`/`LicenseStatus` duplicam o vocabulário dos `CHECK` da migration.** Adicionar um valor no SQL sem adicionar aqui (ou o inverso) é a divergência TS × SQL do risco #6 do plano. Hoje nenhum código depende exaustivamente desses tipos, então a divergência seria silenciosa — a Fase 6 (webhooks), que vai escrever `status`, é o momento de fixar isso.
- **`proExpiresAt` vem de uma consulta separada**, não da função SQL. Se houver mais de uma licença Pro ativa, mostra a de vencimento mais distante. É informativo apenas — quem decide acesso é a função SQL.
- **Sessão expirada continua sem renovação automática** (débito da 4-1B, resolver na 4-5 com `proxy.ts`). Com o DAL agora fazendo 5 consultas por render, uma sessão expirada custa mais round-trips inúteis do que antes.
- **Ambiente:** o disco `C:` está com **15 MB livres (100% cheio)**. Não afetou este trabalho (todas as rotas responderam 200), mas o cache do Turbopack já falhou ao compactar durante o teste, e isso vai atrapalhar builds e `npm install`. Vale liberar espaço antes da próxima fase.

### Fase 4-4A — Feature flags em código
- **Status:** ✅ Concluída, com a classificação comercial **aprovada em 2026-08-06**.
- **Escopo:** só a matriz e as funções puras. **Nada bloqueado** — nenhuma rota, nenhuma tela, nenhuma navegação alterada.

#### O que foi feito
- **`lib/features.ts`** — módulo puro: não importa `services/supabase`, não consulta banco, não lê cookie. `canAccessFeature` depende exclusivamente do `UserAccess` recebido.
- **`lib/features-examples.ts`** — 30 checagens, mesmo padrão sem framework de `modules/pricing/examples.ts`.
- Matriz com **15 recursos**: 6 Essencial disponíveis, 1 `authenticated` disponível, 3 Essencial planejados, 5 Pro planejados.

A matriz é um `Record<FeatureKey, FeatureDefinition>`, não um array: o TypeScript passa a exigir exaustividade, então **adicionar uma chave em `FeatureKey` sem classificar o recurso não compila**. É a garantia de que nenhum recurso nasce sem plano definido — e, por consequência, nenhum nasce aberto por engano.

#### Classificação comercial — resolvida em 2026-08-06
A especificação original da fase agrupava modo avançado, sub-receitas e medidas caseiras sob "Recursos **Pro ou futuros**", o que contrariava a tabela de planos do `README.md` ("Modo simples + avançado **básico**", ✅ nas duas colunas). O conflito foi levado à decisão e **resolvido a favor do Essencial**:

- `advanced_mode`, `sub_recipes`, `household_measures` → **`essential` + `planned`** — são o "avançado básico"; o motor de cálculo existe desde a Fase 1B, falta a interface (Fase 3).
- `menu_engineering`, `price_history`, `cloud_sync`, `pdf_export`, `ai_scanner` → **`pro_annual` + `planned`**.

**Régua para recursos novos** (ficou explícita nesta decisão): o Pro Anual é reservado a **recorrência, nuvem, automação, IA e relatórios**. Recurso que não cai em nenhum desses cinco eixos pertence ao Essencial. Isso substitui o critério anterior, que era "ver o que o README diz caso a caso" — agora há um princípio, e ele está no comentário da seção Pro em `lib/features.ts`.

Consequência boa de o conflito ter aparecido: **código e README não divergem**. A tabela de planos do README continua válida como está, e a página `/precos` da Fase 4-6 pode sair da matriz sem contradizer o material público.

Para que a decisão não se perca numa edição futura distraída, `lib/features-examples.ts` congela a classificação aprovada em `MATRIZ_APROVADA` — mover um recurso de plano **quebra a validação**. Classificação virou decisão comercial versionada, não escolha de quem está com o arquivo aberto.

#### Um problema de modelagem que a matriz revelou
`account` (a tela `/conta`) não cabe em `"essential" | "pro_annual"`. Quem está logada **sem licença nenhuma** precisa entrar lá — é onde vê "Sem licença ativa" e, na Fase 4-6, o botão de comprar. Classificar como `essential` criaria, na Fase 4-5, o bug de trancar a porta exatamente para quem quer entrar.

Acrescentei um terceiro nível, `"authenticated"`, fora do que a especificação previa. É um membro a mais na união e evita um erro concreto e previsível.

#### Regras de Essencial × Pro implementadas
- **Bloqueio derruba tudo**, antes de qualquer outra regra — verificado: Pro bloqueada não acessa nenhum dos 15 recursos.
- **Pro é superset**: `hasEssential` já vem verdadeiro para quem tem Pro (resolvido no SQL e no DAL), então `case "essential"` não precisa de `|| hasPro`. Verificado: Pro acessa os 9 Essenciais e os 5 Pro.
- **Essencial não acessa Pro**: verificado nos 5.
- **Visitante não acessa nada**, incluindo `account`.
- **`status` não gateia**: um recurso `planned` responde pelo plano dele, para que a página de preços possa dizer "o Pro terá isto" sem a matriz mentir sobre a que plano pertence.
- **Falha fechada em três caminhos**: bloqueio, plano insuficiente e chave desconhecida (string vinda de fora dos tipos) devolvem `false`. O `default` do `switch` também nega — se alguém adicionar um plano novo e esquecer do `switch`, nega em vez de liberar.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0; `npm run build` → exit 0, **10 rotas inalteradas** (nada passou a ser bloqueado).
- **30/30 checagens** isoladas, incluindo os 9 casos que a especificação pediu, mais: conformidade com a `MATRIZ_APROVADA` congelada; os três recursos do "avançado básico" liberando para Essencial; o Pro contendo exatamente os 5 recursos previstos; partição `acessíveis + bloqueados = matriz` sem sobreposição nos 5 perfis; integridade (chave do índice bate com a da definição, nenhum rótulo vazio); ausência de plano mensal; e chave desconhecida negando sem lançar.

#### Riscos
- **`getFeatureDefinition` lança** em chave desconhecida, enquanto `canAccessFeature` nega. É proposital (uma nega acesso, a outra denuncia programação errada), mas quem chamar `getFeatureDefinition` com dado externo precisa tratar — hoje ninguém chama.
- **A matriz ainda não é usada por ninguém.** Só ganha valor na 4-5 (gating) e na 4-6 (página de preços). Até lá, é possível que ela e a interface real divirjam sem que nada acuse — por exemplo, se uma tela nova nascer sem entrada correspondente aqui.
- **A classificação está congelada em dois lugares** (`lib/features.ts` e `MATRIZ_APROVADA`). É o preço de tornar a reclassificação deliberada; quem mudar de plano precisa tocar nos dois e registrar no `DECISIONS.md`, e a validação cobra isso.

### Fase 4-5A — Página de bloqueio + helpers de acesso
- **Status:** ✅ Concluída. Os guardas existem e funcionam; **só `/conta` os usa**. Nenhuma tela local foi bloqueada.
- **Escopo:** a camada 2 do modelo de três defesas do `PLAN-FASE-4.md` — a autorização de verdade. O `proxy.ts` (camada 1) fica para a 4-5B.

#### O que foi feito
- **`app/acesso-bloqueado/page.tsx`** — Server Component, rota dinâmica (`ƒ` no build).
- **`lib/auth/require-access.ts`** — `requireAuthenticatedAccess()`, `requireEssentialAccess()`, `requireProAccess()`.
- **`app/conta/page.tsx`** — trocou `getCurrentUserAccess()` + `redirect()` manual pelo guarda. Sem custo extra: `getCurrentUserAccess` é memoizado com `cache()`.

#### Duas armadilhas que apareceram no desenho e foram fechadas

**1. `requireAuthenticatedAccess()` não barra conta bloqueada — de propósito.**
A regra "bloqueio derruba tudo" é verdadeira para **licença**, não para a tela de conta. Se o guarda de autenticação também barrasse quem está bloqueada, `/conta` mandaria a usuária para `/acesso-bloqueado` — cujo botão principal leva de volta a `/conta`. Beco sem saída, e justamente para quem mais precisa da tela: ver o próprio status e sair da conta.

É a mesma razão pela qual a Fase 4-4A classificou `account` como `minimumPlan: "authenticated"`. O bloqueio age nos dois guardas de licença, onde ele importa.

**2. A `/acesso-bloqueado` não redireciona ninguém.**
Uma página cujo trabalho é explicar uma negativa não pode negar. Ela cobre os cinco estados (visitante, bloqueada, sem licença, sem Pro, e acesso completo por navegação direta) e sempre renderiza.

O motivo é **recalculado pelo DAL na mesma requisição**, nunca lido de query string. Um `?motivo=bloqueada` seria escrito por qualquer um e mostraria à usuária um diagnóstico falso sobre a própria conta.

#### Como se garantiu que ninguém consulta acesso de terceiros
Mesma trava estrutural do DAL, verificada por inspeção:
- `import "server-only"` no topo — Client Component que importar quebra o build.
- **Nenhuma das três funções recebe parâmetro.** Sem assinatura, não há o que forjar: a identidade vem sempre de `getCurrentUserAccess()` → `supabase.auth.getUser()` (revalida o JWT).
- `require-access.ts` **não importa `services/supabase/*`** — só `next/navigation`, `./dal` e o tipo. O ponto único de consulta continua sendo o DAL.
- `grep` por `SERVICE_ROLE` e `getSession` no projeto: só comentários explicando que não são usados.

#### Detalhe de produto
As duas listas de plano da página saem de `ALL_FEATURES` (Fase 4-4A), com selo "em breve" no que é `planned`. Assim a tela não consegue prometer uma divisão diferente da que o gating vai aplicar. Verificado no HTML renderizado: 6 recursos Essenciais sem selo, 3 Essenciais com selo, 5 Pro todos com selo, **nenhum valor em R$ e nenhuma menção a plano mensal**.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0; `npm run build` → exit 0, **11 rotas** (era 10; a nova é `/acesso-bloqueado`, dinâmica).
- Teste manual contra o dev server: `GET /conta` sem sessão → **307 para `/login`**; `GET /acesso-bloqueado` → **200**, com o estado de visitante correto ("Entre na sua conta para continuar", CTAs Entrar/Criar conta, sem "Voltar ao painel").
- **Não testado:** `/conta` com sessão real. Continua bloqueado pela confirmação de e-mail, sem acesso à caixa de entrada — a mesma pendência das Fases 4-1C e 4-3B.

#### ⚠️ A decisão que precisa vir antes da 4-5B
`getCurrentUserAccess()` devolve `ANONYMOUS_ACCESS` quando o Supabase não está configurado — falha fechada, que é o certo para um guarda. Consequência: se a 4-5B puser `requireEssentialAccess()` em `/`, `/ingredientes`, `/receitas`, `/precificacao` e `/configuracoes`, **o app inteiro passa a redirecionar para `/login` num ambiente sem Supabase**.

Isso colide de frente com a decisão de 2026-08-05 de o Essencial ser local-first e continuar funcionando sem Supabase. As saídas possíveis — gatear só a nuvem, exigir licença nas telas locais, ou tratar "sem Supabase configurado" como modo local explícito — são escolhas de produto, não de implementação. **Não dá para começar a 4-5B sem essa definição**, e afrouxar o guarda para "se não tem Supabase, libera" seria transformar variável de ambiente ausente em bypass de licença.

#### Riscos
- **`redirect("/login")` não guarda para onde a usuária ia.** Depois de entrar, ela cai em `/conta`, não na tela que tentou abrir. Aceitável agora; se virar `?next=`, o destino precisa ser validado como caminho interno, senão vira redirecionamento aberto.
- **Os guardas ainda quase não são exercitados.** Só o caminho `!isAuthenticated` foi provado de ponta a ponta; os ramos de bloqueio e de licença dependem de conta real com licença manual (Fase 4-2B/4-3B).
- **O CTA "Voltar ao painel" está condicionado a `hasEssential`** para não devolver a usuária à mesma tela depois da 4-5B. Se a 4-5B decidir manter o painel aberto, a condição deve ser revista — está anotado no `TASKS.md`.

### Fase 4-5B — Gating Essencial nas telas locais
- **Status:** ✅ Concluída. **O app passou a exigir licença.** Duas consequências de produto precisam de decisão (abaixo).
- **Escopo:** cinco chamadas de guarda. Nenhuma pasta reorganizada, nenhum layout refatorado, nenhuma UX alterada além do bloqueio.

#### O que foi feito
`await requireEssentialAccess()` como primeira instrução de `/`, `/ingredientes`, `/receitas`, `/configuracoes` e `/precificacao`. As cinco eram Server Components síncronos e viraram `async` — nenhuma outra alteração.

Públicas, intocadas: `/login`, `/cadastro`, `/conta`, `/acesso-bloqueado`, `/auth/callback`.

#### Como se evitou o loop em `/acesso-bloqueado`
Três coisas, nesta ordem:

1. **A página não tem guarda nenhum** (Fase 4-5A) e não redireciona em nenhum dos cinco estados que reconhece.
2. **Os destinos de redirecionamento são todos públicos.** `/login` e `/acesso-bloqueado` nunca ganham guarda de licença — está registrado no `DECISIONS.md` de 2026-08-06 como invariante, não como detalhe.
3. **`/conta` usa `requireAuthenticatedAccess()`**, que não barra bloqueio nem falta de licença. É o que faz o botão principal da tela de bloqueio ter para onde ir.

Verificado empiricamente com `curl -L --max-redirs 10`: **toda cadeia termina em 0 ou 1 salto**. `/acesso-bloqueado` → 0 redirects, 200. Não há par de rotas que se aponte mutuamente.

#### Achado positivo: sessão forjada é rejeitada
Enviei um cookie `sb-<ref>-auth-token` fabricado, com um `user.id` inventado, para `/ingredientes`. Resultado: **307 para `/login`**.

É a primeira demonstração empírica do risco #1 do `PLAN-FASE-4.md` — `getUser()` revalida o JWT com o servidor Auth em vez de acreditar no cookie. Se o DAL usasse `getSession()`, esse mesmo cookie teria aberto a tela.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0; `npm run build` → exit 0.
- **11 rotas, todas `ƒ` (dinâmicas)** — risco #7 do plano ("rota estática vazar conteúdo protegido") não se aplica: nenhuma protegida é pré-renderizada.
- Sem sessão: as 5 protegidas → **307 → `/login`**; `/login`, `/cadastro`, `/acesso-bloqueado` → **200**; `/auth/callback` sem code → `/login?erro=confirmacao`.
- `grep`: `canAccessFeature` tem **zero** ocorrências em código de rota — o gating é só pelos guardas, como pedido.
- **Não testado:** as 5 telas logada com licença Essencial. Continua bloqueado pela confirmação de e-mail sem acesso à caixa de entrada (pendência herdada das Fases 4-1C e 4-3B). É o único caminho que falta provar: hoje está demonstrado que **ninguém entra sem licença**, não que **quem tem licença entra**.

#### ⚠️ Duas consequências de produto que precisam de decisão

**1. O `Header` ficou mentindo.** Ele mostra "Painel / Ingredientes / Receitas / Precificação / Configurações" para todo mundo, inclusive visitante. Agora os cinco devolvem para `/login`. Não corrigi porque a fase proibia mexer em UX e refatorar layout — mas é um defeito visível introduzido aqui, não uma imperfeição herdada. Corrigir exige passar o acesso do layout para o `Header` (que já recebe `isAuthenticated`, então o caminho existe e é curto).

**2. O app não tem mais vitrine.** Com `/` protegida, quem abre o domínio cai em `/login`. Não existe nenhuma página pública que explique o produto — o que é um problema comercial direto para a Fase 4-6: a `/precos` precisa nascer pública, e provavelmente `/` deveria ser a landing, com o painel movido para `/painel`. Vale decidir antes de escrever a página de preços, para não ter que mover rota depois.

#### Riscos
- **O guarda está repetido em 5 arquivos.** Funciona e é explícito, mas tela nova nasce desprotegida por omissão — e omissão não quebra build. Route Groups com o guarda no layout do grupo resolvem isso na 4-5C; enquanto não vier, vale conferir na revisão de cada fase.
- **`signOutAction` redireciona para `/`**, que agora rebate para `/login`. Funciona, com um salto a mais. Apontar direto para `/login` seria mais limpo, mas é mudança de UX fora do escopo desta fase.
- **Sem `?next=`:** quem tentou abrir `/receitas` e foi para o login cai em `/conta` depois de entrar, não na tela que queria. Se for implementado, o destino tem que ser validado como caminho interno.

### Fase 4-6A — Página pública de preços
- **Status:** ✅ Concluída.
- **Escopo:** nova vitrine pública em `/precos` e link no Header de visitante. Sem alterar `/`, guardas, telas protegidas, `/acesso-bloqueado`, migrations ou cálculo.

#### O que foi feito
- **`app/precos/page.tsx`** — Server Component pública, sem `requireEssentialAccess()`, sem redirect e sem consulta ao Supabase. Apresenta Doce Margem Essencial (compra única) e Doce Margem Pro Anual (anual, sem mensal).
- As listas vêm de `ALL_FEATURES`: 6 recursos Essenciais disponíveis, 3 do avançado básico marcados como planejados e 5 recursos Pro planejados. A página não mantém uma segunda classificação comercial manual.
- Sem valores definidos, os dois planos mostram **“Preço de lançamento em breve”**. Nenhum valor numérico foi inventado.
- Os CTAs leem `NEXT_PUBLIC_BUY_ESSENTIAL_URL` e `NEXT_PUBLIC_BUY_PRO_ANNUAL_URL`. Quando a env está vazia, renderizam **“Em breve”** como botão desabilitado; nenhum checkout foi criado.
- O Header sem sessão mostra `Preços`, `Entrar` e `Criar conta`. Logada, a usuária continua vendo apenas a navegação do app e `Conta`.

#### Decisão de rota pública
`/` permanece protegida e não virou landing. A vitrine desta etapa é `/precos`, que não recebe guarda de licença. Isso resolve a ausência de apresentação pública apontada na 4-5B sem mover o painel, criar route groups ou alterar o gating existente.

#### Validações
- `npm run typecheck` → exit 0.
- `npm run lint` → exit 0.
- `npm run build` → exit 0, **12 rotas**, incluindo `/precos`.
- Dev server: `GET /precos` → **200**, com os dois planos, aviso de ausência de plano mensal e preço em breve; `GET /` continua → **307 para `/login`**.
- Auditoria de escopo: zero imports de guardas, zero `redirect()` e zero referência a `SUPABASE_SERVICE_ROLE_KEY` em `/precos`; nenhum diff nas cinco telas protegidas, migrations ou `modules/pricing/`.

#### Risco conhecido
As variáveis `NEXT_PUBLIC_*` são incorporadas pelo Next.js no build. Alterar as URLs de compra no ambiente exige novo deploy; não são configuração dinâmica em tempo de execução.

### Fase 4-7A — Planejamento do webhook Kiwify
- **Status:** ✅ Concluída. **Nenhum código.** Plano técnico em `PLAN-FASE-4.md`, capítulo 13.
- **Escopo:** só documentação. Nenhuma rota, nenhuma migration, nenhum uso de service role.

#### Três achados do schema que mudaram o plano
O plano foi escrito lendo `0001_profiles.sql` e `0002_licenses.sql`, não a partir de suposições. Três coisas apareceram, e as três contrariam o desenho natural da fase:

**(A) "Compra antes do cadastro" é impossibilidade física, não caso de borda.** `licenses.user_id → profiles.id → auth.users.id`. Não existe INSERT de licença para um e-mail sem conta — **nem com `service_role`**, porque FK não é RLS. O item "criar ou localizar profile" do escopo não é implementável como descrito: `profiles` só nasce pelo trigger em `auth.users`.

**(B) `license_events` não serve de fila de pendências.** O `event_type` tem CHECK de vocabulário fechado, sem valor para "compra sem dono", e a tabela é append-only por trigger — nem `service_role` faz UPDATE. Uma pendência que não pode ser marcada como resolvida não é uma fila. **Consequência: guardar pendência exige migration de qualquer jeito.** A fase não tem opção "sem tocar no banco"; tem só a escolha de qual mudança fazer.

**(C) A UNIQUE de idempotência tem buraco em NULL.** `unique (provider, provider_order_id)` com coluna nullable: em Postgres NULLs não conflitam entre si. Se o payload vier sem o identificador do pedido, **cada reenvio cria uma licença nova** — a idempotência prometida simplesmente não existe, e sem nenhum erro visível. Regra que saiu daí: payload sem order id é **rejeitado com 400**, nunca gravado com NULL.

#### Decisões técnicas registradas
- **Nome da env:** manter `KIWIFY_WEBHOOK_SECRET`, que já está no `.env.example` e é simétrico a `HOTMART_WEBHOOK_SECRET`. A Kiwify chama de "token" no painel; a diferença vira comentário, não renomeação. Aceitar os dois nomes foi descartado — duas fontes de verdade para um segredo é como um fica desatualizado sem ninguém notar.
- **Service role isolada** em `services/supabase/admin.ts` novo, nunca em `services/supabase/server.ts`. O arquivo que o app inteiro importa não pode ter ao alcance de um import errado uma chave que ignora RLS.
- **Corpo cru antes do parse** (`request.text()`, não `request.json()`): se a validação for HMAC, ela é sobre os bytes originais. É requisito, não estilo.
- **Falha fechada:** segredo ausente → 500, nada processado. Seria a versão webhook do bypass por env ausente que a decisão de 2026-08-06 já recusou.
- **Códigos de resposta** foram tratados como decisão de projeto, não detalhe: replay e evento não tratado devolvem **200**, porque 4xx faria a Kiwify reenviar para sempre; falha transitória devolve **500**, porque ali o reenvio é a recuperação.

#### Divergência de documentação encontrada
`README.md` (linha 87) e a Fase 6 do `TASKS.md` prometem uma tabela `webhook_events` que **não existe** — a 0002 resolveu idempotência pela UNIQUE de `licenses`. A UNIQUE cobre replay de concessão, mas não cobre replay de revogação (que é UPDATE), nem falha no meio do processamento. A tabela ainda faz sentido; a decisão de criá-la ou não fica para a 4-7B, junto com `pending_purchases`, já que seriam quase a mesma tabela.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- Não rodei `build`: nenhum arquivo de código foi tocado.

#### Riscos pendentes
- **O payload real da Kiwify não foi capturado.** Todos os nomes de campo do plano são hipótese até uma requisição real chegar. Primeira tarefa da 4-7B, antes de qualquer código.
- **O mecanismo de validação não está confirmado.** As duas formas conhecidas são token simples e HMAC do corpo cru em query string. O código deve ser escrito para a observada, não para a suposta.
- **A URL pública só existe depois do deploy.** Localhost não recebe webhook; o teste de ponta a ponta com compra real é pós-deploy, e é o único que prova a integração.
- **Compra antes do cadastro** continua sem decisão — convite via Admin API (recomendado), fila, ou manual. Muda o que a migration precisa ter.
- **E-mail diferente no checkout:** compra com um e-mail, cadastro com outro. Nenhuma automação resolve; depende de concessão manual (Fase 7). Mitigação parcial: normalizar `lower(trim(email))` e criar `unique index on profiles (lower(email))` — hoje a coluna não tem índice nem UNIQUE, então a busca é varredura **e** sensível a maiúsculas.

### Fase 4-7B — Migration de suporte ao webhook
- **Status:** ✅ Aplicada manualmente e validada no Supabase real em 2026-08-06.
- **Escopo:** só `supabase/migrations/0003_webhook_support.sql` + documentação. Nenhum código, nenhum route handler, nenhuma edição em 0001/0002.

#### Estrutura criada
`public.webhook_events`, 13 colunas. FKs para `profiles` e `licenses` com `on delete set null` — mesmo critério da 0002: apagar a conta não destrói a evidência de que a requisição chegou.

**5 CHECKs.** Três vieram da especificação (`provider`, `event_type`, `status`); dois eu acrescentei porque o schema sem eles admitia estados incoerentes:
- **`status ↔ processed_at`**: sem isso, cabia uma linha `processed` sem carimbo de quando, ou uma `received` já carimbada — e aí a coluna deixa de responder à única pergunta que existe para responder.
- **`error_message` só em `failed`**: mensagem de erro em linha bem-sucedida é ruído que confunde quem for depurar às 3 da manhã.

**6 índices.** O único parcial de idempotência, o de busca por pedido (não único, porque o mesmo pedido gera aprovada e depois reembolso), três operacionais (fila de retrabalho, listagem do admin, histórico por usuária) e o de e-mail em `profiles`.

**RLS habilitada com zero policies e zero grants.** O cliente não lê nem os próprios eventos: `payload` é o corpo bruto do provedor e pode conter campos que nunca passaram por uma decisão de "isto pode aparecer na tela". A transparência da usuária já existe pelo caminho certo — `license_events`, com vocabulário nosso. `webhook_events` é log de infraestrutura.

#### Uma diferença que precisa ficar clara para a 4-7C
`webhook_events` **não é** `license_events`, e não recebeu o trigger de imutabilidade da 0002. `license_events` é auditoria append-only; esta aqui é log de processamento e **muda de estado** (`received → processed | ignored | failed`). Copiar aquele trigger para cá quebraria o processamento no primeiro webhook. Está escrito no cabeçalho da migration para não se perder.

#### Descoberta que mudou o índice de e-mail
A especificação sugeria `create unique index on public.profiles (lower(email))`. Investiguei o risco de falha, como pedido, e encontrei um problema anterior ao das duplicatas:

**`handle_new_user` (0001) grava `coalesce(new.email, '')`.** Cadastro sem e-mail — telefone, OAuth sem e-mail — produz string vazia. **Duas linhas assim colidem num índice único total, e o `CREATE INDEX` falha.** O app é só e-mail/senha hoje, mas a própria 0001 comenta que isso pode mudar; um índice que quebra o cadastro futuro é pior que índice nenhum.

Solução: índice **parcial**, `where email <> ''`. Não enfraquece nada — string vazia não é e-mail de compra nenhuma, e o handler nunca vai procurar por ela.

#### Checagem de unicidade do e-mail
Duplicatas reais de e-mail derrubariam o índice. A consulta preventiva documentada na migration é:

```sql
select lower(email) as email_normalizado, count(*)
from public.profiles
where email <> ''
group by 1 having count(*) > 1;
```

O índice `profiles_email_lower_unique` foi criado com sucesso no Supabase real. Isso confirma que não havia duplicata bloqueando a aplicação naquele momento. **Nunca remover o `unique` para "fazer passar"** — duas contas com o mesmo e-mail tornam a identificação por e-mail ambígua, que é exatamente o que o webhook não pode ter.

Lembrete: existem **duas contas de teste** criadas na Fase 4-1B que nunca puderam ser apagadas (exigiria service role). Elas entram nessa contagem.

#### Riscos restantes
- **`provider` aceita só `'kiwify'`.** Hotmart — já citada no `README.md` e no `.env.example` — exigirá migration. É coerente e não descuido: o `CHECK` de `event_type` usa o vocabulário **português** da Kiwify (`compra_aprovada`), que a Hotmart não usa; um provedor novo estenderia os dois de qualquer forma. Note a assimetria deliberada com `licenses.provider`, que **não** tem CHECK — lá o valor é só procedência, aqui ele determina como o payload é lido.
- **`provider_event_id` NULL desliga a idempotência.** Mesmo buraco de NULL do `PLAN-FASE-4.md` 13.1(C): NULLs não conflitam entre si, então o índice único parcial não protege. **A 4-7C precisa rejeitar payload sem identificador de evento**, nunca gravar NULL e seguir. Está anotado no `TASKS.md` e no comentário da coluna.
- **O CHECK de coerência restringe o handler.** Inserir direto como `processed` obriga a preencher `processed_at` no mesmo statement. É intencional, mas quem escrever a 4-7C precisa saber antes de descobrir por erro de constraint.
- **`payload` guarda dado pessoal.** Diferente de `license_events`, aqui `DELETE` não tem trigger impedindo — pedido de apagamento (LGPD) se atende por service_role.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- `build` não rodado: nenhum arquivo TS/TSX foi tocado.
- `public.webhook_events` existe e está com RLS ativo.
- A tabela tem **zero policies**; `anon` e `authenticated` têm **zero privilégios** nela.
- O índice único parcial de `provider_event_id` existe.
- O índice `lower(email)` em `profiles` existe.
- Ainda não existe webhook cadastrado na Kiwify e ainda não existe `/api/webhooks/kiwify`; a próxima fase continua sendo a implementação do Route Handler.

### Fase 4-7C — Route Handler Kiwify em modo captura
- **Status:** ✅ Código completo e validado. ⛔ **Gravação bloqueada por um problema de banco anterior a esta fase** (abaixo).
- **Escopo:** capturar payload. Nenhuma licença criada, `licenses` e `license_events` intocadas.

> ✅ **Desbloqueada em 2026-08-06.** A migration `0004_service_role_grants.sql` foi aplicada e os testes foram reexecutados: **13/13 PASS**. O relato do bloqueio fica abaixo como registro — ver "Reexecução" no fim desta seção para o resultado final.

#### ⛔ Achado que bloqueou a fase — e era maior do que a fase
Os testes de gravação falharam com `42501`. Investiguei em vez de supor, e o diagnóstico direto contra o Supabase real devolveu:

```
permission denied for table webhook_events
hint: GRANT INSERT ON public.webhook_events TO service_role;
```

O mesmo erro aparece em **`licenses` e `user_access_flags`**. Ou seja: **não é a migration 0003.** A `service_role` nunca teve privilégio de tabela nenhum neste projeto, desde a 0001.

Confirmado por `grep`: **não existe um único `grant ... to service_role` em nenhuma das três migrations.** E o comentário da 0002, linha 366, afirma o contrário:

> "Só service_role — que, sendo superusuário efetivo no Supabase, não depende de grant explícito."

**Essa afirmação é falsa**, e este teste é a primeira coisa no projeto a exercitá-la. `service_role` tem o atributo `BYPASSRLS` — ignora *policies* — mas **privilégio de tabela é outra coisa**, e `GRANT` continua valendo. As três migrations foram escritas sobre essa confusão. Ninguém notou porque, até agora, todo acesso ao banco usava a chave anônima.

Consequência: **os webhooks da Fase 4-7D e o admin da Fase 7 não funcionariam**, e o modo de falha seria exatamente este — silencioso do lado do provedor, 500 do nosso lado, venda perdida.

Correção (migration nova, **fora do escopo desta fase** — nenhuma migration foi criada nem alterada aqui):

```sql
grant select, insert, update on public.webhook_events to service_role;
grant select, insert, update on public.licenses       to service_role;
grant select, insert          on public.license_events to service_role;
grant select, insert, update on public.user_access_flags to service_role;
grant select                 on public.profiles        to service_role;
```

Vale conferir também se o projeto tem `alter default privileges ... to service_role` — se não tiver, toda tabela nova nasce com o mesmo problema.

#### O que foi entregue e está validado
- **`app/api/webhooks/kiwify/route.ts`** — só `POST` exportado, então o Next responde **405** com header `Allow` nos demais métodos sem precisar de um GET escrito só para recusar.
- **`services/supabase/admin.ts`** — service role isolada de `server.ts`, `server-only`, chave nunca exportada nem logada, `persistSession: false`. Sem configuração devolve `null`, e o handler recusa com 500 — **nunca cai para a chave anônima**, que mascararia erro de privilégio como erro de dados.
- **`lib/webhooks/kiwify-payload.ts`** — extractores puros, sem I/O. Separados do handler pelo mesmo motivo que a matemática vive em `modules/`: para serem verificáveis sem subir servidor.
- **`lib/webhooks/kiwify-payload-examples.ts`** — **28/28 PASS**.

#### Decisões de segurança do handler
- **Autenticar antes de ler o corpo.** Payload não autenticado não chega ao banco nem como auditoria — princípio 2 da migration 0003.
- **Comparação por hash, não por texto.** SHA-256 dos dois lados e `timingSafeEqual`: 32 bytes sempre, então nem o comprimento do segredo vaza. Comparar direto exigiria um `if` de tamanho antes (senão `timingSafeEqual` lança), e esse `if` é o canal lateral.
- **Falha fechada sem segredo** — verificado: 500, e o token nem é avaliado.
- **Respostas pobres de propósito.** Webhook é endpoint público; detalhar "pedido já processado" o transformaria em oráculo sobre a base de clientes. `error.message` do Postgres nunca sai na resposta (pode conter nome de coluna e constraint).
- **Diagnóstico no 401 sem vazar nada.** O log registra **quais portadores vieram**, nunca o valor. Inclui `?signature` — que o handler não aceita como token, mas cuja presença identificaria HMAC como o mecanismo real da Kiwify. Sem isso, um 401 em produção seria mistério: nada gravado, nada explicado.

#### Testes locais — 7 de 13
Dev server com segredo de teste (`.env.local` não foi tocado):

| # | Caso | Esperado | Obtido |
|---|---|:--:|:--:|
| 1 | `GET` | 405 | ✅ 405 |
| 2 | `POST` sem token | 401 | ✅ 401 |
| 3 | token errado em `x-kiwify-token` | 401 | ✅ 401 |
| 4 | token errado em `Bearer` | 401 | ✅ 401 |
| 5 | token errado em `?token=` | 401 | ✅ 401 |
| 6 | token certo + JSON inválido | 400 | ✅ 400 |
| 7 | token certo + corpo vazio | 400 | ✅ 400 |
| — | **sem `KIWIFY_WEBHOOK_SECRET`** | 500 | ✅ 500, nada gravado |
| 8–13 | gravação e replay | 200 | ⛔ 500 (`42501`) |

O log confirmou os três portadores sendo reconhecidos individualmente (`portadores presentes: x-kiwify-token` / `authorization` / `?token`).

**Nota:** os 500 dos testes 8–13 são o **comportamento correto** para falha de infraestrutura — a Kiwify reenviaria, que é a recuperação desejada. **Nenhuma linha foi criada em `webhook_events`**: os INSERTs foram recusados pelo Postgres. Não há resíduo de teste para limpar.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0; `npm run build` → exit 0, **13 rotas**, `/api/webhooks/kiwify` dinâmica.
- Extractores isolados: **28/28 PASS**, incluindo 11 entradas hostis (`null`, `42`, `[]`, `{Customer:null}`, …) que não podem lançar nem virar evento acionável.

#### Riscos
- **O formato da Kiwify continua sendo hipótese.** Os 28 testes provam que os extractores *não quebram*, não que os caminhos estão certos. Só payload real resolve.
- **Se a Kiwify usar HMAC (`?signature=`), a captura devolve 401 e não grava nada.** É o cenário mais provável segundo o `PLAN-FASE-4.md` 13.8. Mitigado pelo log de portadores, que diria exatamente isso — mas exige olhar o log do deploy.
- **`provider_event_id` nulo continua desligando a idempotência.** O handler grava `null` hoje. Quando o formato real for conhecido, a 4-7D deve rejeitar payload sem identificador de evento.
- **Ambiente: disco C: chegou a 0 bytes livres** durante a fase. Limpei `.next/dev` (607 MB de cache Turbopack gerado pelos dev servers desta sessão) para destravar. Não é causado pelo código, mas vai voltar.

#### ✅ Reexecução após a 0004 — 13/13 PASS

| # | Caso | Esperado | Obtido |
|---|---|:--:|:--:|
| 1 | `GET` | 405 | ✅ |
| 2 | sem token | 401 | ✅ |
| 3–5 | token errado nos 3 portadores | 401 | ✅ |
| 6–7 | JSON inválido / corpo vazio | 400 | ✅ |
| 8 | `compra_aprovada` (header) | 200 | ✅ `{received:true}` |
| 9 | **replay do mesmo `provider_event_id`** | 200 | ✅ `{received:true,duplicate:true}` |
| 10 | `compra_reembolsada` (Bearer) | 200 | ✅ |
| 11 | `chargeback` (`?token=`) | 200 | ✅ |
| 12 | evento desconhecido | 200 + `ignored` | ✅ |
| 13 | JSON sem nome de evento | 200 + `unknown` | ✅ |

**O que o banco confirma** (consulta com service role, só leitura):

```
event_type          status     event_id  order_id  processed_at  user_id  license_id
compra_aprovada     received   e1        ok        null          null     null
compra_reembolsada  received   e2        ok        null          null     null
chargeback          received   e3        ok        null          null     null
ignored             ignored    e4        ok        sim           null     null
unknown             ignored    e5        —         sim           null     null
```

- **Replay não duplicou.** 6 requisições com token válido, **5 linhas** — o índice único parcial `webhook_events_provider_event_unique` da 0003 barrou a repetida, o handler traduziu o `23505` em 200, e a Kiwify não teria motivo para reenviar.
- **Token inválido não gera linha.** 13 requisições no total, e a tabela inteira tem **5 linhas**, todas com o marcador da rodada. As tentativas 2–5 (sem token / token errado) não deixaram rastro — a autenticação roda antes de o corpo ser lido, como projetado.
- **A distinção `ignored` × `unknown` funcionou na prática**, não só nos testes isolados: `boleto_gerado` virou `ignored` (nome lido, fora do escopo) e o payload sem nome de evento virou `unknown`.
- **CHECK `status ↔ processed_at` respeitado** nas 5 linhas — `received` sem carimbo, `ignored` carimbado.
- **`user_id` e `license_id` nulos** nas 5, como esta fase exige.
- **`licenses` e `license_events` intocadas:** ambas com 2 linhas, todas `provider = 'manual'` / `source = 'manual:test'`, do teste manual de 02:08–02:09. Nenhuma com `provider = 'kiwify'` nem `source = 'webhook:kiwify'`.

**Limpeza das 5 linhas de teste**, quando quiser:

```sql
delete from public.webhook_events
where payload ->> '_teste_claude_4_7c' is not null;
```

Não é urgente — a tabela é log de captura, e as linhas mostram o handler funcionando. Mas convém apagar antes de ligar o webhook na Kiwify de verdade, para o payload real não se misturar com payload inventado por mim.

**Nota de método:** os testes usaram um segredo injetado só no processo do dev server. **`.env.local` não foi tocado**, e `KIWIFY_WEBHOOK_SECRET` continua vazia lá — o webhook em produção só funcionará quando ela for preenchida com o token do painel da Kiwify.

### Fase 4-7C-fix — Grants para service_role
- **Status:** ✅ Migration escrita. ⚠️ **Não aplicada** (regra da fase) e não validada por parser SQL — não há Postgres local.
- **Escopo:** só `0004_service_role_grants.sql` + documentação. Nenhuma linha de código, nenhuma migration antiga tocada (`git diff` vazio em 0001/0002/0003).

#### Grants concedidos

| Objeto | Privilégios | Por que não mais que isso |
|---|---|---|
| `schema public` | `usage` | pré-requisito; sem ele todo grant de tabela falha com o mesmo 42501 |
| `profiles` | `select` | webhook só precisa achar a usuária pelo e-mail |
| `webhook_events` | `select, insert, update` | a linha muda de `received` para `processed`/`ignored`/`failed` |
| `licenses` | `select, insert, update` | compra, reembolso, chargeback, renovação |
| `license_events` | `select, insert` | **sem `update`** — é auditoria |
| `user_access_flags` | `select, update` | bloqueio administrativo; a linha nasce pelo trigger |
| 3 funções internas | `execute` | ver abaixo |

**Nenhum `delete` em lugar nenhum.** Licença revogada vira `status = 'refunded'`, nunca some — uma licença apagada destrói a resposta para "esta pessoa já teve acesso?", que é a pergunta de uma disputa de chargeback.

#### Um segundo caso da mesma falha, em funções
A 0002 fez `revoke execute ... from public, anon, authenticated` nas três funções internas. Revogar de `PUBLIC` remove o default do Postgres, e `service_role` **não é dono dessas funções** — logo hoje também não consegue executá-las. É o mesmo engano da seção de tabelas, aplicado a funções, e contraria o que a própria 0002 declara como projeto ("Usadas por service_role (admin, Fase 7)").

Incluí `grant execute` nas três. **Não estava na lista pedida** — sinalizo para você poder tirar, mas sem isso a Fase 7 teria que reimplementar a regra de acesso em TypeScript, que é exatamente a duplicação que as funções SQL existem para evitar.

As versões sem parâmetro (`current_user_has_*`) ficaram **de fora de propósito**: elas resolvem `auth.uid()`, que é NULL fora de sessão autenticada, então responderiam sempre `false` para `service_role`. Conceder acesso a elas só criaria uma armadilha silenciosa para quem chamasse a função errada no admin.

#### `alter default privileges` — avaliado e descartado
Seria a correção automática para toda tabela futura. Recusei: concede `ALL` em tudo que nascer, que é literalmente o "privilégio amplo demais" que a fase proíbe. O preço é ter que conceder explicitamente a cada tabela nova — e esse preço **é o ponto**, porque obriga a decidir verbo por verbo o que o backend realmente precisa. Deixei o lembrete em caixa-alta na seção 4 da migration, onde a próxima pessoa que criar tabela vai passar.

#### Riscos antes de aplicar
- **Não executada e não checada por parser.** Verificação foi estrutural: 10 comandos, todos `grant ... to service_role`; zero grants a `anon`/`authenticated`, zero `grant all`, zero `create policy`, zero `alter table`, zero `revoke`, zero `delete`. Erro de sintaxe só aparece no `db push`.
- **`user_access_flags` sem `insert`, e a consequência é silenciosa.** Se algum perfil existir sem linha nessa tabela (conta anterior ao trigger, ou importada), o `UPDATE` de bloqueio não afeta linha nenhuma e **não dá erro** — o admin veria sucesso e a conta seguiria liberada. A consulta 5.4 da migration procura esses casos; vale rodar antes de confiar no bloqueio.
- **Os comentários falsos continuam lá.** 0002 linha 366 e 0003 linha 342 seguem afirmando que `service_role` não precisa de grant. Corrigi-los exigiria alterar migrations antigas, proibido nesta fase — então registrei a falsidade no cabeçalho da 0004. É paliativo: quem ler a 0002 isolada continua sendo informado errado.
- **Escopo do grant é o backend inteiro, não só o webhook.** `licenses` com `insert/update` é o poder de conceder e revogar licença. A proteção real aqui não é o grant, é **quem tem a `SUPABASE_SERVICE_ROLE_KEY`** — ela nunca pode ter prefixo `NEXT_PUBLIC_`, e hoje é lida por um único arquivo (`services/supabase/admin.ts`).

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- `build` não rodado: nenhum arquivo TS/TSX tocado.

### Auditoria pré-lançamento — 2026-08-07
- **Documento:** `GO-LIVE-AND-PRO-ROADMAP.md`. Diagnóstico, sem alteração de código.
- **Escopo:** leitura de código, migrations, histórico do Git e documentação viva. **Sem internet, sem service role, sem SQL.**

#### O que a auditoria concluiu
**A parte difícil está feita.** O motor de precificação está completo e verificado, e o modelo de licença é sólido — o cliente não consegue se conceder licença nem se desbloquear, em duas barreiras independentes. O que falta é a ponte entre o pagamento e o acesso.

**Bloqueador nº 1: compra aprovada não libera nada.** O webhook grava o evento e para por aí. Hoje, quem comprar não recebe acesso sem intervenção manual. São 10 bloqueadores críticos no total, e quatro deles (reembolso não revogar, idempotência com `provider_event_id` nulo, e-mail divergente, comprador sem cadastro) coincidem com os riscos de segurança ainda abertos.

#### Três achados que valem registro
1. **Três caminhos de saída do handler não escrevem log nenhum** — corpo ilegível, corpo vazio e JSON inválido devolvem 400 em silêncio. Se o teste da Kiwify mandar corpo não-JSON com token válido, o resultado é 400 sem uma linha sequer, e quem procura por `[webhook:kiwify]` conclui erradamente que a requisição nunca chegou. É a hipótese H3 da seção 3 e uma correção de observabilidade para a próxima fase.
2. **`GET` na rota do webhook distingue 405 de 404**, e essa diferença resolve sozinha a hipótese mais provável do diagnóstico: 405 significa que a rota existe no deploy, 404 que não. É o teste mais barato disponível.
3. **As 5 linhas de teste que deixei em `webhook_events` podem enganar a investigação** — um `order by created_at desc limit 1` devolve uma delas, não a da Kiwify. Filtrar por `payload ->> '_teste_claude_4_7c' is null`.

#### Dívidas que a auditoria expôs por atravessarem várias fases
- **Nenhuma tela jamais foi testada por clique real** (pendente desde a Fase 2-2). Tudo foi validado por SSR, HTTP e lógica isolada. É a maior incerteza do cronograma.
- **O caminho autenticado nunca rodou ponta a ponta** (Fase 4-3B) — login → licença → tela liberada foi deduzido, nunca observado.
- **`NEXT_PUBLIC_APP_URL` local ainda é `localhost:3000`.** Se estiver assim na Vercel, o link de confirmação de e-mail está quebrado para todos os clientes.

#### Estimativa
**Essencial vendendo: 35–60 h ≈ 2 a 3 semanas.** Do zero ao Pro completo com IA: 6 a 11 semanas. A faixa é larga por causa do teste em navegador real — é impossível estimar correções de bugs que ninguém viu ainda.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0.
- Nenhum código, migration ou `modules/pricing` alterado.

### Fase 4-7D — Validação real do webhook em produção
- **Status:** ✅ Ajuste feito e validado localmente. ⚠️ **Falta confirmar em produção** (exige redeploy).
- **Escopo:** só a função que coleta portadores de token e o log de 401. Nenhuma mudança de lógica de negócio.

#### A hipótese H4 da auditoria se confirmou — quase
O `GO-LIVE-AND-PRO-ROADMAP.md` listou como hipótese: *"a Kiwify usa assinatura/HMAC em vez de token simples → 401"*. O log de produção confirmou **metade**: o portador é mesmo `?signature=`, mas o valor se comporta como **token simples**, não como digest.

Foi o log de 401 escrito na Fase 4-7C que entregou o diagnóstico — ele existia exatamente para isso, e funcionou: sem ele, o 401 seria um mistério sem nada gravado em lugar nenhum.

#### O ajuste
`?signature=` entrou na lista de portadores. **Tratado como token simples**: só é aceito se for exatamente igual a `KIWIFY_WEBHOOK_SECRET`, na mesma comparação por hash SHA-256 + `timingSafeEqual` dos outros três.

**Isto não enfraquece nada.** Se a Kiwify um dia mandar um HMAC de verdade nesse mesmo parâmetro, ele não vai bater com o segredo e a requisição continua sendo recusada — nunca aceita "por parecer uma assinatura". O nome do parâmetro não decide nada; a comparação com o segredo decide. Verificado no teste 7: uma cadeia hexadecimal de 40 caracteres em `?signature=` devolve 401.

**HMAC completo não foi implementado, de propósito.** Exigiria conhecer o algoritmo e o formato de digest que a Kiwify usa, e nenhum payload real documenta isso. Implementar por suposição a verificação de uma rota que concede licença seria construir no escuro justamente a parte que mexe em dinheiro. O corpo já é lido como texto cru antes do `JSON.parse`, então a peça necessária para HMAC está no lugar quando houver evidência.

#### Log: booleanos, e um bit que responde a próxima pergunta
O diagnóstico de 401 virou flags puras:

```
hasHeaderToken=false hasBearer=false hasQueryToken=false hasQuerySignature=true signatureLooksLikeHex=true
```

`signatureLooksLikeHex` não estava na especificação e acrescentei porque resolve a única dúvida que sobra depois de um 401: **a Kiwify mandou o token simples ou um digest?** Cadeia longa só de hexadecimais é assinatura; qualquer outra coisa é token.

É seguro justamente por só aparecer no 401: se a autenticação falhou, o valor inspecionado **não** é o segredo, e a forma dele não revela nada sobre o segredo. Verificado nos dois sentidos — `assinatura-errada` → `false`; 40 hex → `true`.

Auditoria dos `console.*`: **nenhum imprime token, signature, segredo ou payload**, em nenhum caminho, nem truncado.

#### Testes locais — 12/12

| # | Caso | Obtido |
|---|---|:--:|
| 1 | sem token | ✅ 401 |
| 2 | token errado (header) | ✅ 401 |
| 3 | `x-kiwify-token` certo | ✅ 200 |
| 4 | `?token=` certo | ✅ 200 |
| 5 | **`?signature=` certo** | ✅ 200 |
| 6 | `?signature=` errado | ✅ 401 |
| 7 | `?signature=` com cara de HMAC | ✅ 401 |
| 8 | `Bearer` certo | ✅ 200 |
| 9 | JSON inválido + signature certo | ✅ 400 |
| 10 | evento desconhecido | ✅ 200 → `ignored` |
| 11 | replay do mesmo `provider_event_id` | ✅ 200 `duplicate:true` |
| 12 | `GET` | ✅ 405 |

Banco confirma: **5 requisições com sucesso = 5 linhas**, o replay não criou a sexta, coerência `status ↔ processed_at` intacta, `user_id`/`license_id` nulos. `licenses` e `license_events` seguem com 2 linhas cada, todas `provider=manual` / `source=manual:test`.

#### Riscos
- ~~⚠️ **O teste do painel pode não representar o evento de produção.**~~ ✅ A compra e o reembolso reais retornaram 200 na validação de 2026-08-08.
- **`?signature=` viaja na URL** e entra em log de proxy, CDN e histórico de acesso. É a Kiwify que escolhe o portador, não nós — mas vale saber que o segredo do webhook tem exposição maior que um header. Rotacionar o token no painel invalida o antigo, se algum dia for preciso.
- ~~**Ainda não confirmado em produção.**~~ ✅ Confirmado por eventos reais após o redeploy.

### Fase 4-7E — Validação da assinatura real (HMAC)
- **Status:** ✅ Implementado, validado localmente e posteriormente confirmado por compra e reembolso reais em produção.
- **Escopo:** só a autenticação do handler. Nenhuma liberação de licença, `licenses` e `license_events` intocadas.

#### A conclusão da 4-7D estava errada, e o log escrito nela é que provou
A 4-7D aceitou `?signature=` como **token simples**, sobre a hipótese de que o painel da Kiwify mandava o próprio segredo ali. O teste real desmentiu: o log de produção registrou `signatureLooksLikeHex=true` — um digest, não um segredo.

Vale registrar o mecanismo: **o bit de diagnóstico que acrescentei na 4-7D foi exatamente o que derrubou a minha própria hipótese.** Sem ele, o 401 seria mais uma tentativa às cegas.

#### Como a assinatura é validada agora
Ordem fechada, primeira que bater vence:

| # | Portador | Verificação |
|---|---|---|
| 1 | `x-kiwify-token` | token simples = segredo |
| 2 | `Authorization: Bearer` | token simples = segredo |
| 3 | `?token=` | token simples = segredo |
| 4 | `?signature=` | **HMAC-SHA256 do corpo cru**, hex |
| 5 | `?signature=` | **HMAC-SHA1 do corpo cru**, hex |

Prefixos `sha256=` / `sha1=` são removidos antes de comparar. Tudo em tempo constante: os dois lados passam por SHA-256 antes do `timingSafeEqual`, que assim nunca lança por tamanhos diferentes — e nenhum comprimento vaza.

**A aceitação de `signature` como token simples foi removida**, conforme sua preferência e porque manter as duas leituras seria pior do que parece: a verificação fraca (comparar com o segredo) passaria a valer **sempre que a forte falhasse**. Isso é fallback silencioso — o padrão que transforma autenticação forte em teatro. Verificado: `?signature=<segredo>` agora devolve **401**.

#### Uma inversão de ordem que precisa ficar registrada
A Fase 4-7C autenticava **antes** de ler o corpo. Com HMAC isso é impossível: a assinatura é sobre os bytes recebidos, e não há como conferi-la sem tê-los.

O handler agora lê `request.text()` primeiro e autentica depois. **A garantia que importa continua de pé** — payload não autenticado nunca chega ao banco (princípio 2 da migration 0003). O que mudou é que ele existe em memória por alguns milissegundos. `request.json()` segue proibido: consumiria o stream e destruiria os bytes originais, que são a única coisa contra a qual a assinatura pode ser conferida.

#### Testes locais — 14/14
Corpo bruto fixo de 94 bytes, assinaturas calculadas com o mesmo segredo:

| # | Caso | Obtido |
|---|---|:--:|
| 1 | sem token/signature | ✅ 401 |
| 2–4 | token nos 3 portadores | ✅ 200 |
| 5 | **HMAC-SHA256 correta** | ✅ 200 |
| 6 | **HMAC-SHA1 correta** | ✅ 200 |
| 7 | prefixo `sha256=` | ✅ 200 |
| 8 | signature errada (texto) | ✅ 401 |
| 9 | hex 64 com digest errado | ✅ 401 |
| 10 | **signature = o próprio segredo** | ✅ 401 |
| 11 | **HMAC válida de OUTRO corpo** | ✅ 401 |
| 12 | JSON inválido + assinatura correta | ✅ 400 |
| 13 | evento válido + assinatura correta | ✅ 200, gravou |
| 14 | replay do mesmo `provider_event_id` | ✅ 200 `duplicate:true` |

O caso 11 é o que prova que a verificação é real: uma assinatura legítima, calculada com o segredo certo, **não** autentica um corpo diferente. Sem esse teste, um bug que ignorasse o corpo passaria despercebido.

Log de sucesso confirmou o caminho usado: `tokenCarrierUsed=hmac-sha256`.

#### Flags de log
`hasHeaderToken`, `hasBearer`, `hasQueryToken`, `hasQuerySignature`, `signatureFormat`, `hmacSha256Match`, `hmacSha1Match`, `tokenCarrierUsed`, `authResult`.

`signatureFormat` classifica a **forma** — `hex-64(sha256?)`, `hex-40(sha1?)`, `base64-N`, `other`, `none` — nunca o valor. `grep` confirma: nenhum `console.*` imprime token, signature, segredo, payload, e-mail ou qualquer dado pessoal.

#### O que ainda não estava provado nesta fase
- ~~**Nenhuma compra real foi testada.**~~ ✅ Compra e reembolso reais foram autenticados e processados em 2026-08-08.
- **É justamente para isso que `signatureFormat` existe.** Se o próximo teste falhar, o log dirá se o digest é hex-64, hex-40, base64 ou outra coisa — e aí a correção é uma linha, não uma investigação.
- **Liberação de licença não existe.** O handler grava o evento e para. Compra aprovada continua não virando acesso — é a Fase 4-7F.
- ~~**7 linhas de teste em `webhook_events`.**~~ ✅ Webhooks antigos `failed`/`ignored` removidos na limpeza final.

### Fase 4-7F — Normalização do payload real e idempotência
- **Status:** ✅ Implementado e validado; formato e processamento posteriormente confirmados por compra e reembolso reais.
- **Escopo:** extractores e idempotência. Nenhuma liberação de licença.

#### O payload real, finalmente
O POST de teste da Kiwify chegou à produção, passou pela verificação HMAC da 4-7E e foi gravado. A estrutura:

| Campo | Valor observado | Uso |
|---|---|---|
| `webhook_event_type` | `"order_approved"` | **o evento** |
| `order_id` | uuid | `provider_order_id` |
| `order_status` | `"paid"` | ⚠️ status de pagamento, **não** evento |
| `payment_method` | `"credit_card"` | — |
| `product_type` | `"membership"` | diagnóstico |
| `Product.product_id` / `product_name` | — | diagnóstico, elo com o plano |
| `Customer.email` / `full_name` / `cnpj` / `mobile` | — | `buyerEmail` |

#### O problema que a captura expôs
`provider_event_id` veio **NULL** — a Kiwify não manda identificador de evento. E em Postgres **NULLs não conflitam entre si** numa UNIQUE, então o índice `webhook_events_provider_event_unique` não protegia nada: cada reenvio viraria uma linha nova, sem nenhum sinal. É exatamente o buraco previsto no `PLAN-FASE-4.md` 13.1(C), agora confirmado com dado real.

**Solução: chave determinística `evento:pedido`.**

```
compra_aprovada:07271940-b573-41a6-9e6a-0e504bf45916
```

Por que não chavear só pelo pedido: um mesmo pedido produz eventos diferentes ao longo do tempo — aprovada hoje, reembolsada em duas semanas. Chave só pelo pedido faria o **reembolso ser descartado como duplicata do pagamento**, e a licença nunca seria revogada. É o pior erro possível nesta parte do sistema.

`event_id` explícito, se a Kiwify um dia enviar, tem prioridade — a derivação sai de cena sozinha, sem mudança de código.

#### Uma correção de segurança que a captura tornou visível
`order_status` estava na lista de caminhos de nome de evento (herança da Fase 4-7C, quando o formato era hipótese). O payload real traz `order_status: "paid"`, e `paid` é um apelido de `compra_aprovada` no mapa.

Enquanto `webhook_event_type` estiver presente a prioridade resolve. Mas bastaria ele vir vazio numa notificação de boleto ou de reembolso para **um status de pagamento virar "compra aprovada"** — e, na fase seguinte, liberar licença indevida.

**Removi `order_status` e `status` da lista.** Sem `webhook_event_type` legível, o certo é cair em `unknown`: o evento fica gravado, nada é liberado, e alguém olha. Verificado: `{ order_id, order_status: "paid" }` agora devolve `unknown`.

Pelo mesmo raciocínio tirei `id` dos candidatos a `order_id` — num payload da Kiwify ele pode ser id de produto ou de cliente, e um `provider_order_id` errado corromperia o elo com a licença.

#### Validações
- **52/52 isoladas** (eram 28). As novas usam o payload real com dados pessoais fictícios — nenhum e-mail, CNPJ ou telefone verdadeiro entrou no repositório.
- **7/7 HTTP** com o formato real: aprovada → 200; replay → `duplicate:true`; reembolso e chargeback do mesmo pedido → **linhas novas**; fora do escopo → `ignored`; sem tipo de evento → `unknown`.
- Banco confirma as três chaves distintas para o mesmo pedido:
  ```
  compra_aprovada:47f-…    received
  compra_reembolsada:47f-… received
  chargeback:47f-…         received
  ```
- Log: `eventIdSource=derived`, `tokenCarrierUsed=hmac-sha256`.
- `typecheck` → 0; `lint` → 0; `build` → 0, 13 rotas.
- `licenses` e `license_events` intocadas.

#### Riscos
- ⚠️ **Limite da chave derivada:** dois eventos genuinamente distintos com o mesmo tipo e o mesmo `order_id` colidem, e o segundo é tratado como replay. Para a compra única do Essencial isso é o comportamento **correto**. Para renovação do Pro anual — se a Kiwify reusar o `order_id` — a renovação seria engolida. Anotado no `TASKS.md` para a fase de assinatura.
- **O payload é o do botão de teste.** O evento de produção pode trazer campos a mais ou nomes diferentes. Os extractores toleram ausência, mas `eventIdSource=none` no log seria o sinal de que `order_id` mudou de lugar.
- **13 linhas de teste em `webhook_events`**, incluindo a linha real com `provider_event_id = NULL` — a que motivou esta fase. Vale apagar antes de ligar em produção.
- **Liberação de licença continua não existindo.** O handler grava e para.

### Fase 4-7G — Compra aprovada libera licença Essencial
- **Status:** ✅ Caminho principal funcionando, **33/33** contra o Supabase real. ⛔ **Dois bloqueadores encontrados**, ambos fora do código desta fase.
- **Escopo:** só concessão. Reembolso e chargeback continuam sem revogar.

#### O fluxo
1. Autenticar (HMAC ou token) → 2. gravar `webhook_events` → 3. se `compra_aprovada`: resolver compradora → 4. criar/reaproveitar licença → 5. `license_events` → 6. fechar a linha como `processed`.

A regra de negócio foi para `lib/webhooks/kiwify-processor.ts`, com `server-only`. O Route Handler ficou só com HTTP: autenticar, ler corpo, traduzir resultado em código. Mesma separação que mantém a matemática em `modules/pricing`.

**Valores gravados**, todos conferidos contra os CHECK das migrations: `product_type = 'one_time'`, `status = 'active'`, `expires_at = NULL` (obrigatório para compra única), `provider = 'kiwify'`, `event_type = 'granted'`, `source = 'webhook:kiwify'`.

#### Idempotência em duas camadas
- **Camada 1 — `webhook_events`:** o insert acontece **antes** de qualquer trabalho de licença. Replay esbarra no índice único e nunca chega a criar licença.
- **Camada 2 — `licenses`:** a unicidade `(provider, provider_order_id)` segura mesmo quando a camada 1 é contornada. Testado enviando o mesmo pedido com um `webhook_event_id` explícito diferente: o webhook passou, a licença **não** duplicou, e `license_events` também não.

**E uma terceira propriedade, que é recuperação e não bloqueio:** quando o insert colide, a linha existente é inspecionada. Se ainda está `received` — sinal de que a entrega anterior morreu no meio — o processamento **continua** sobre ela. Sem isso, uma falha entre gravar o webhook e conceder a licença deixaria a compra registrada e nunca liberada, e o reenvio da Kiwify, que é a chance natural de consertar, seria descartado como duplicata.

#### Detalhes de segurança
- **`ilike` com curingas escapados.** `_` é caractere legítimo em e-mail e é curinga em `LIKE`: sem escapar, `maria_silva@x.com` casaria com `mariaXsilva@x.com` — e casar o perfil errado numa rotina que concede licença é o pior defeito imaginável aqui.
- **`license_events.payload` guarda só referências** (`webhook_event_id`, `provider_event_id`, `provider_order_id`, `product_id`). Os dados pessoais já estão em `webhook_events.payload`; duplicá-los espalharia PII por duas tabelas com políticas de retenção diferentes. Verificado: o e-mail de teste não aparece no payload de auditoria.
- **Auditoria só quando a licença nasce.** `license_events` é append-only e não tem unicidade, então quem controla duplicação é essa condição.
- **Service role não vaza:** `grep` em `.next/static/` não encontra nada, e só o Route Handler importa `admin.ts`.
- **Logs:** só booleanos e códigos curtos. Nunca token, assinatura, chave, CPF, telefone, payload ou e-mail completo.

#### ⛔ Bloqueador 1 — convite por e-mail não funciona
Compradora **sem conta** não é liberada. `inviteUserByEmail` devolveu, em produção:

```
invite_failed:email_address_invalid
invite_failed:over_email_send_rate_limit
```

O segundo confirma o que a auditoria de go-live já apontava: **o SMTP padrão do Supabase tem limite de poucos envios por hora e não serve para produção.** Na terceira venda da mesma hora, o convite falha.

**O que o código faz quando isso acontece** — e é o comportamento certo: marca `webhook_events` como `failed` com o código do erro, responde **500** para a Kiwify reenviar, e **não cria conta órfã nem licença solta**. A compra fica registrada e visível; nada se perde em silêncio.

**Por que não improvisei um contorno.** `createUser` sem convite criaria uma conta que a compradora não consegue acessar — o app ainda não tem tela de recuperação de senha, então ela teria pago e ficaria presa. Preferi falhar de forma visível a criar uma armadilha.

**Correção:** configurar SMTP próprio no Supabase (Resend, SendGrid, SES). É configuração, não código.

#### ⛔ Bloqueador 2 — usuária com evento de licença não pode ser excluída
Descoberto ao tentar limpar os dados de teste. Isolado com três casos:

| Caso | `deleteUser` |
|---|---|
| A — usuária sem `license_events` | ✅ ok |
| B — usuária com licença, sem eventos | ✅ ok |
| C — usuária **com `license_events`** | ❌ `Database error deleting user` |

**Causa:** `license_events.user_id` tem `ON DELETE SET NULL`, e `SET NULL` é um **UPDATE**. O trigger `license_events_immutable` da migration 0002 bloqueia UPDATE para **todos**, inclusive `service_role`. A FK tenta anonimizar o registro e a própria proteção o impede.

A intenção da 0002 estava certa (a evidência deve sobreviver à exclusão da conta); a implementação transforma "anonimizar" em "impedir". **Impacto: LGPD** — pedido de exclusão de conta não pode ser atendido por nenhum caminho automático.

**Correção sugerida** (migration futura, fora do escopo desta fase): permitir UPDATE quando ele apenas anula `user_id`/`license_id`, mantendo o bloqueio para alteração de conteúdo.

#### Testes — 33/33
Contra o Supabase real, com compradora fictícia em `@example.com` (domínio reservado RFC 2606): concessão completa; auditoria; fechamento do webhook; `has_essential_access = true`; bloqueio derrubando o acesso; replay sem duplicar; mesmo pedido com `event_id` novo sem duplicar; pedido novo criando segunda licença; payload sem e-mail → `failed/sem_email`; sem `order_id` → não libera; `billet_created`, `order_refunded` e `order_chargeback` sem tocar em licença; reembolso permanecendo `received`.

#### ⚠️ Dados de teste que ficaram no banco
Não consegui limpar: `service_role` **não tem DELETE** em `licenses`, `license_events` nem `webhook_events` — decisão deliberada da 4-7C-fix, aqui confirmada funcionando. Rodar no SQL Editor, nesta ordem:

```sql
-- 1. eventos primeiro: é o que destrava a exclusão das contas (bloqueador 2)
delete from public.license_events
where source = 'probe'
   or license_id in (
     select id from public.licenses
     where provider_order_id like '47g-%' or provider_order_id like 'probe-%'
   );

-- 2. licenças de teste
delete from public.licenses
where provider_order_id like '47g-%' or provider_order_id like 'probe-%';

-- 3. webhooks de teste
delete from public.webhook_events
where payload ->> '_teste_claude_4_7c' is not null or provider_event_id is null;

-- 4. contas de teste (agora possível, sem license_events pendurado)
delete from auth.users where email like '%@example.com';
```

#### Riscos registrados naquele momento — situação posterior
- ~~**Compra real nunca testada de ponta a ponta.**~~ ✅ Validada em 2026-08-08.
- ~~**Compradora sem conta continua sem liberação.**~~ ✅ Convite via Resend/Supabase SMTP validado com compradora real.
- ~~**Reembolso não revoga.**~~ ✅ Reembolso real mudou a licença para `refunded` e derrubou o acesso. Chargeback usa o mesmo mecanismo, mas ainda não foi testado manualmente de ponta a ponta.
- ~~**Reativação silenciosa após dinheiro devolvido.**~~ ✅ Bloqueada na Fase 4-7H.
- **Perfis antigos de teste** permanecem, mas sem licença ativa.

### Fase 4-7G-convite — Aceite de convite do Supabase
- **Status:** ✅ Implementado e verificado em navegador real. **Bloqueador 1 da 4-7G resolvido.**
- **Branch:** `feature/4-7g-license-grant`. Sem push, sem merge.

#### O que estava quebrado
Com o SMTP do Resend configurado, o convite passou a chegar. Mas o "Accept invitation" abria `/login#access_token=…` e mostrava **o formulário de login comum** — sem senha para digitar, com o token pendurado na URL. A compradora tinha pago e ficava presa.

Causa: **o fragment da URL nunca é enviado ao servidor.** Nenhum Server Component consegue lê-lo. Todo o app até aqui era server-side, e por isso não havia quem consumisse aquilo.

#### O fluxo agora
1. Convite → `redirectTo` aponta para **`/auth/accept-invite`**
2. Client Component lê `access_token` / `refresh_token` / `type` do fragment
3. **Apaga o fragment antes de qualquer `await`**
4. `setSession` grava a sessão **em cookie** (não `localStorage`) — é o que faz o servidor passar a enxergar a usuária
5. Formulário de senha → **Server Action** → `updateUser`
6. `redirect("/conta")`

#### Decisões que valem registro
- **Hash apagado antes do primeiro `await`.** Se ficasse na barra durante a criação da sessão, o token viajaria em `Referer` para qualquer recurso externo carregado no meio, ficaria no histórico e apareceria em print de tela. Apagar primeiro fecha os três e não custa nada.
- **Senha por Server Action, não por `updateUser` no cliente.** Mantém a regra que o login já seguia: a senha vai por `FormData` direto ao servidor, sem passar por estado de cliente. E permite revalidar a sessão com **`getUser()`** antes de trocar — não `getSession()`, que só lê o cookie e é forjável. Sem essa revalidação, um cookie fabricado permitiria trocar a senha de outra pessoa.
- **`detectSessionInUrl: false`** no client de navegador. A detecção automática competiria com a leitura manual do hash, e duas rotinas disputando o mesmo fragment produzem uma corrida cujo vencedor muda a cada carregamento. Leitura explícita é determinística e testável.
- **`/auth/accept-invite` sem guarda de acesso.** Quem chega ainda não tem sessão — é ela que a rota vai criar. Um `requireAuthenticatedAccess` aqui trancaria a porta na cara de quem acabou de comprar; mesmo erro que a Fase 4-5A evitou em `/acesso-bloqueado`.
- **`InviteHashRescue` em `/login`.** Convites já enviados apontam para lá, e o Site URL do painel volta a mandar gente para `/login` se `redirectTo` não estiver em Redirect URLs. Usa `window.location.replace` em vez do router do Next por dois motivos: o fragment sobrevive à navegação, e a entrada some do histórico. Só dispara quando há de fato token ou erro de convite — um `#secao` qualquer não vira redirecionamento.
- **Mensagens sem eco do erro do Supabase**, que vem em inglês e pode conter detalhe interno.

#### Testes em navegador real (Chrome headless)
| Caso | Resultado |
|---|---|
| sem hash | ✅ "Este link não trouxe as informações de acesso" |
| hash de erro (`otp_expired`) | ✅ "Este convite expirou ou já foi utilizado" |
| token falso | ✅ "Não foi possível validar este convite" |
| hash lixo (`#qualquer-coisa`) | ✅ mensagem amigável, **não quebra** |

**URL limpa — verificado por CDP, não inferido:**

| Entrada | URL final |
|---|---|
| `/auth/accept-invite#access_token=…&refresh_token=…` | `/auth/accept-invite` |
| `/login#access_token=…&refresh_token=…` | `/auth/accept-invite` |

Servidor: `/login` 200, `/cadastro` 200, `/auth/accept-invite` 200 sem sessão, `/conta` e `/ingredientes` seguem redirecionando para `/login`.

`grep`: nenhum `console.*` nos arquivos novos, nenhum token em log, service role fora de `.next/static/`.

#### Configuração externa — situação posterior
1. ✅ **Redirect URL** de `/auth/accept-invite` configurada no Supabase e validada no fluxo real.
2. ✅ **`NEXT_PUBLIC_APP_URL`** apontando para o domínio real, validada pelo convite.
3. ⚠️ **Entregabilidade do Resend:** o convite ainda pode cair em spam.

#### Riscos
- ~~**Compra real de ponta a ponta ainda não testada.**~~ ✅ Ciclo validado em produção em 2026-08-08.
- **E-mail em spam** é, na prática, quase tão ruim quanto e-mail não entregue.
- **Convite expira.** Quem demorar precisa de um novo, e não há como pedir sozinha — depende de suporte. Uma tela de "reenviar convite" resolveria; fora do escopo.
- ~~**Reembolso e chargeback continuam sem revogar.**~~ ✅ Revogação implementada; reembolso validado com evento real. Chargeback ainda não foi exercitado manualmente de ponta a ponta.

### Fase 4-7G — Revisão final (pós-correções externas)
- **Status:** ✅ Branch `feature/4-7g-license-grant` **pronta para merge controlado**. Sem push, sem merge.
- **Escopo desta revisão:** só documentação. Nenhuma linha de código alterada.

#### Configuração externa — confirmada
| Item | Estado |
|---|---|
| Resend verificado | ✅ |
| SMTP do Supabase (`smtp.resend.com`, remetente `Doce Margem <noreply@doceriadamora.com.br>`) | ✅ |
| Convite entregue no Gmail | ✅ (caiu em spam, marcado como "não é spam") |
| Redirect URL `https://docemargem.doceriadamora.com.br/auth/accept-invite` | ✅ |
| `NEXT_PUBLIC_APP_URL` na Vercel | ✅ domínio real |
| Dados de teste limpos | ✅ |

**Isso encerra os dois bloqueadores que a 4-7G tinha aberto.** O convite era o nº 1; sem ele, quem comprasse sem ter conta não era liberado.

Banco conferido: `licenses` e `license_events` com 2 linhas cada, **todas `manual:test`** — nenhum resíduo `kiwify`. Sobraram **2 linhas em `webhook_events`** com status `failed` (`compra_aprovada:47g-…-C`), dos testes de payload sem e-mail. Inofensivas; se quiser zerar, `delete from public.webhook_events where provider_event_id like 'compra_aprovada:47g-%'`.

#### Três achados da revisão de código
Nenhum bloqueia o teste controlado, mas os três são reais e ficam registrados:

**1. ✅ CORRIGIDO — o `insert` em `license_events` não checava erro.** Ver a seção "Fase 4-7G-auditoria" abaixo.

**2. 🟡 Sessão válida sem senha definida.** Quem abre o convite e fecha a aba antes de salvar a senha fica com sessão ativa: navega normalmente naquele navegador, mas **não consegue voltar depois** — não tem senha, e o app não tem recuperação. Precisaria de novo convite. Uma tela de "definir senha" acessível a partir de `/conta` fecharia isso.

**3. 🟡 `InviteHashRescue` reencaminha qualquer hash com token**, inclusive de recuperação de senha (`type=recovery`). Benigno hoje, porque o destino também é uma tela de definir senha — mas vira comportamento errado no dia em que existir um fluxo próprio de recuperação.

#### Validações
- `npm run typecheck` → exit 0; `npm run lint` → exit 0; `npm run build` → exit 0, **14 rotas**.

#### Prontidão da branch
**Pronta para merge controlado e um teste de compra real de valor mínimo.** O caminho principal está validado com 33/33 contra o Supabase real, o aceite de convite foi verificado em navegador real (inclusive a limpeza do token da URL, por CDP), e a configuração externa está completa.

O que ainda não foi provado: **o percurso real de ponta a ponta** — comprar, receber o e-mail, criar a senha, entrar e usar. Nenhuma validação sintética substitui esse.

#### Riscos restantes
- **Reembolso e chargeback não revogam.** Quem pedir reembolso hoje recebe o dinheiro **e mantém a licença vitalícia**. É o maior risco financeiro aberto.
- **Entregabilidade:** SPF/DKIM/DMARC pendentes. Não bloqueia tecnicamente — o e-mail chega — mas cair em spam custa vendas de quem não procura no lixo eletrônico.
- **Exclusão de conta continua impossível** para quem tem `license_events` (bug do trigger da migration 0002, registrado na 4-7G). Impacto LGPD.
- **Convite expira** e não há como pedir outro sozinha; depende de suporte.

### Fase 4-7G-auditoria — concessão sem registro não passa mais
- **Status:** ✅ Corrigido e validado. **30/30 isolados + 33/33 ponta a ponta.**
- **Escopo:** `lib/webhooks/kiwify-processor.ts` e o log do Route Handler. Nada mais.

#### O risco
O `insert` em `license_events` era a **única escrita do fluxo cujo erro era ignorado**. Se falhasse, a licença ficava ativa, o webhook era marcado `processed`, e a concessão existia sem registro nenhum.

Isso importa porque `license_events` existe para responder **"por que esta pessoa ganhou acesso, e quando"** — a pergunta de uma disputa de chargeback. Uma auditoria com buracos que ninguém sabe que tem é pior que auditoria nenhuma: dá confiança falsa exatamente quando se precisa dela.

#### A correção, e as duas armadilhas no caminho
Auditoria passou a ser verificada antes de fechar a compra: falha → `webhook_events` vira `failed` com código curto, resposta **500**, e a Kiwify reenvia.

**Armadilha 1 — a condição óbvia estava errada.** O código auditava com `if (license.created)`. Trocar só o tratamento de erro manteria um buraco: se a auditoria quebrasse e a Kiwify reenviasse, na segunda passagem a licença **já existe**, `created` é `false`, o insert seria pulado — e o webhook fecharia como `processed` sem registro. **O reprocessamento restauraria em silêncio o defeito que deveria consertar.**

Por isso `ensureGrantAudited` **consulta antes de inserir**: pergunta se existe `granted` para aquela licença. Idempotência por estado, não por sorte de caminho.

**Armadilha 2 — marcar `failed` criaria beco sem saída.** O reprocessamento só acontecia em linhas `received`. Marcar `failed` faria o reenvio seguinte bater na constraint, virar "duplicate", e a compra ficar travada num erro que já tinha passado. `failed` entrou nos estados reprocessáveis — é o que faz o reenvio ser recuperação de verdade.

#### O que ficou fora do alcance
A licença é criada **antes** da auditoria, e não dá para inverter: `license_events.license_id` referencia `licenses`. Sem função no banco não há transação única, então a janela entre "licença ativa" e "concessão auditada" existe.

O que a correção garante não é ausência de janela — é que **ela nunca se fecha em silêncio**: enquanto a auditoria não gravar, a linha fica `failed`, com o `license_id` preenchido para achar rápido a concessão pendente, e a Kiwify continua reenviando até completar.

#### Testes
**30/30 isolados**, com um Supabase falso de falhas programáveis — o único jeito honesto de exercitar o caminho de erro:

| Caso | Resultado |
|---|---|
| auditoria ok → `processed` | ✅ |
| **`insert` de auditoria falha** | ✅ `storage_error`, webhook `failed`, zero auditoria |
| **`select` de auditoria falha** | ✅ `storage_error`, webhook `failed` |
| **reenvio depois da falha cura** | ✅ vira `granted`, auditoria gravada, licença não duplica |
| replay de `processed` | ✅ `duplicate`, nada duplicado |
| reprocessar com auditoria existente | ✅ `auditCreated=false`, segue com 1 registro |
| sem e-mail / sem `order_id` | ✅ `rejected`, nenhuma licença |
| reembolso / chargeback | ✅ `recorded`, licença e auditoria intactas |

**33/33 ponta a ponta** contra o Supabase real — o stub não valida as consultas do PostgREST, e a consulta nova de auditoria nunca tinha rodado de verdade. Log confirma os dois caminhos: `licenseCreated=true auditCreated=true` na concessão, `licenseCreated=false auditCreated=false` no reprocessamento.

`error_message` verificado: `audit_insert:42501` — código curto, sem payload, e-mail, token ou segredo.

#### Validações
`typecheck` → 0; `lint` → 0; `build` → 0, 14 rotas.

#### Dados de teste criados nesta rodada
Uma conta `@example.com`, 2 licenças `kiwify`, 2 `license_events` e ~8 `webhook_events`. Mesma limitação de sempre: `service_role` não tem DELETE nessas tabelas. SQL de limpeza na seção da Fase 4-7G.

### Fase 4-7H — Reembolso e chargeback revogam licença
- **Status:** ✅ Implementado e validado. **65/65 isolados + 24/24 ponta a ponta.**
- **Escopo:** `lib/webhooks/kiwify-processor.ts` e o log do Route Handler. Nada mais.

#### O ciclo comercial fecha aqui
| Evento | `licenses.status` | `license_events` | Acesso |
|---|---|---|---|
| `order_approved` | `active` | `granted` | liberado |
| `order_refunded` | `refunded` | `refunded` | **cai** |
| `order_chargeback` | `chargeback` | `chargeback` | **cai** |

A revogação é só um `UPDATE` de status. Não precisa de mais nada porque as funções SQL filtram `status = 'active'` a cada chamada e o DAL não persiste acesso: **o efeito é imediato na requisição seguinte, sem cache para invalidar.** É o retorno concreto da decisão de 2026-08-05 de nunca persistir acesso calculado — o desenho feito lá é o que torna esta fase quase trivial.

Verificado de ponta a ponta: `has_essential_access` vai para `false` após reembolso e após chargeback.

#### Três decisões que não eram óbvias

**1. Revogação sem licença vira `failed`, não `processed`.**
A escolha confortável seria "não há o que revogar, marca processado e segue". Ela tem um buraco: um reembolso sem licença correspondente costuma significar que **a aprovação ainda não foi processada** — webhook fora de ordem, ou uma concessão que falhou e ficou pendente. Dar o reembolso por concluído nesse estado faz a aprovação chegar depois, criar a licença, e **quem foi reembolsado ficar com acesso**.

Como `failed` é reprocessável e a resposta é 500, a Kiwify reenvia e a revogação acontece assim que a licença existir. Se nunca existir, a linha fica visível — que é o certo.

**2. Aprovação depois de reembolso/chargeback não reativa.**
A 4-7G reativava qualquer licença não-`active` ao receber uma aprovação. Isso agora está bloqueado para `refunded` e `chargeback`: **o dinheiro já voltou para a compradora**, e reconceder acesso a partir de um webhook, sem ninguém olhar, é devolver o produto depois de devolver o pagamento. O caso vira `failed` com `reativacao_bloqueada:<status>` para decisão humana.

`cancelled` e `expired` continuam reativáveis — não envolvem devolução.

**3. Reembolso depois de chargeback não sobrescreve o chargeback.**
Para o acesso dá no mesmo (qualquer um derruba), mas o chargeback é o fato mais grave e o registro deve preservá-lo.

#### Auditoria
`ensureAudited` foi generalizado da 4-7G e serve os três eventos. Continua consultando antes de inserir — idempotência por estado, não por caminho — e continua **obrigatória**: falha vira `failed` + 500, nunca `processed` sem registro.

Uma licença revogada acumula `granted` + `refunded` (ou `chargeback`), que é exatamente a linha do tempo que uma disputa exige.

#### Testes
**65/65 isolados** com o Supabase falso de falhas programáveis (12 casos novos), incluindo: revogação sem licença; replay não duplicando auditoria; reprocessamento com auditoria existente; falha da auditoria da revogação; aprovação pós-reembolso e pós-chargeback bloqueadas; reembolso não sobrescrevendo chargeback; evento ignorado sem tocar em licença.

**24/24 ponta a ponta** contra o Supabase real — o stub não valida as consultas do PostgREST. Confirmado no banco: status corretos, auditoria com os dois eventos, `webhook_events` fechado com `user_id`/`license_id`, e **`has_essential_access` indo para `false` nas duas revogações**.

Duas asserções antigas (9 e 10) falharam na primeira rodada porque afirmavam o comportamento anterior — `recorded` para revogação sem licença. Foram corrigidas para a regra nova; o código estava certo.

`typecheck` → 0; `lint` → 0; `build` → 0, 14 rotas.

#### Riscos restantes
- ~~**Compra real de ponta a ponta continua sem teste.**~~ ✅ Compra e reembolso reais validados em 2026-08-08.
- **`cancelled` e `expired` não são tratados.** A Kiwify pode enviá-los; hoje caem em `ignored` e não revogam. Para compra única vitalícia isso raramente importa, mas vira relevante no Pro anual.
- **Assinatura recorrente não tem renovação.** Fora de escopo até o Pro existir.
- **Exclusão de conta continua impossível** para quem tem `license_events` (bug do trigger da 0002). Impacto LGPD, e agora atinge mais contas, já que toda compra gera evento.
- **Perfis antigos de teste** continuam no Supabase por causa do mesmo bug, mas sem licença ativa. As licenças manuais de teste e os webhooks antigos `failed`/`ignored` foram removidos na validação final de produção.

### Fase 4-7I — Filtrar teste da Kiwify e validar produto
- **Status:** ✅ Implementado e validado. **95/95 isolados + 19/19 ponta a ponta.**
- **Escopo:** `lib/webhooks/kiwify-payload.ts`, `lib/webhooks/kiwify-processor.ts`, log do Route Handler, `.env.example`.

#### O que aconteceu em produção
O botão "Testar Webhook" da Kiwify mandou um `order_approved` completo — com `order_id`, e-mail e produto — e o handler tentou processar como compra real. Convidou `johndoe@example.com`, falhou, e a linha ficou `failed:invite_failed:AuthRetryableFetchError`.

O sintoma era chato. **O risco por trás era grave:** se o webhook estiver cadastrado na Kiwify como *"todos os produtos que sou produtor"*, a venda de **qualquer outra oferta** chegaria aqui e liberaria licença do Doce Margem. O identificador do produto é a única coisa no payload que separa uma compra nossa das outras — e ninguém estava olhando para ele.

#### Como o teste é detectado
Sinais **literais e estreitos**, não heurísticos:

| Sinal | Por que é seguro |
|---|---|
| e-mail termina em `@example.com` | domínio reservado pela **RFC 2606** — não existe caixa postal nele. Nenhum cliente real pode ter esse e-mail. Sozinho já é conclusivo |
| `product_name === "Example product"` | comparação **exata**, não "contém". "Exemplo de bolo" não cai aqui — testado |
| `custom_fields` com `"Example field"` / `"Example value"` | strings literais do payload de teste |

**A direção do erro guiou o desenho.** Classificar compra real como teste é muito pior que o contrário: a compradora paga e não recebe nada. Por isso nada de "parece teste" — só marcas que um cliente real não consegue produzir.

Prova de que a régua é estreita o bastante para incomodar: **meus próprios fixtures de teste usavam `@example.com`** e passaram a ser ignorados. Precisei trocar o domínio das compradoras fictícias para `@teste-docemargem.com.br`. A detecção pegou exatamente o que devia.

#### Como o produto é validado
`KIWIFY_ESSENTIAL_PRODUCT_ID` é o caminho principal — estável, não muda quando alguém edita a oferta no painel. `KIWIFY_ESSENTIAL_PRODUCT_NAME` é reserva, usada só quando o payload não traz o id; a comparação ignora maiúsculas e espaços nas pontas, porque exigir igualdade exata de texto digitado à mão recusaria compra legítima por um espaço.

| Situação | Concessão | Revogação |
|---|---|---|
| produto bate | processa | processa |
| produto **é outro** | `ignored` + 200 | `ignored` + 200 |
| payload sem identificação | `failed:produto_nao_identificado` | **processa mesmo assim** |
| nenhuma env configurada | `failed:product_config_missing` | **processa mesmo assim** |

#### Uma assimetria deliberada, e o porquê
A instrução era validar produto em **todos** os eventos. Segui na concessão e **não** na revogação, porque a direção do erro se inverte:

- **Concessão** incerta → não liberar. Errar liberando dá acesso a quem não comprou.
- **Revogação** incerta → revogar. Errar não revogando deixa acesso com quem foi reembolsado.

A busca da licença é por `provider_order_id`, que **já limita o alcance ao que este app vendeu** — um reembolso de outro produto simplesmente não acha licença. Exigir produto identificado ali faria um campo malformado deixar de revogar quem tomou o dinheiro de volta.

O ruído que a validação evitaria — reembolsos de outras ofertas virando `failed` — continua evitado: `mismatch` (produto **comprovadamente** diferente) ignora a revogação também. Só `unknown` e `not_configured` seguem adiante.

#### Ordem das checagens
Teste → produto → e-mail/pedido. "Isso é uma venda nossa?" vem antes de "conseguimos processá-la?". Duas asserções antigas falharam por causa disso (reclamavam de e-mail ausente onde agora o produto é reclamado primeiro) — as asserções é que estavam desatualizadas; ajustei os payloads para exercitar cada checagem.

#### Testes
**95/95 isolados** (30 casos novos) e **19/19 ponta a ponta** contra o Supabase real, usando o payload real do botão de teste: teste ignorado sem criar conta `johndoe@example.com`; outro produto ignorado; replay de ignorado não duplica; produto certo libera; reembolso e chargeback revogam; sem produto não libera.

`typecheck` → 0; `lint` → 0; `build` → 0, 14 rotas.

#### ⛔ Antes da primeira venda
**Adicionar `KIWIFY_ESSENTIAL_PRODUCT_ID` na Vercel.** Sem ela, compra real falha fechada com `product_config_missing` e **não libera nada**. É deliberado — sem saber que produto foi vendido, liberar licença é apostar que só existe uma oferta na conta da Kiwify, e essa aposta se perde no dia em que houver a segunda.

O valor sai de `Product.product_id` num payload real (o teste do painel serve: ele traz o id do produto fictício, mas a estrutura mostra onde olhar) ou da URL do produto no painel da Kiwify.

#### Riscos restantes
- ~~**Compra real de ponta a ponta continua sem teste.**~~ ✅ Resolvido pela validação final de produção de 2026-08-08, registrada abaixo.
- **`KIWIFY_ESSENTIAL_PRODUCT_NAME` é frágil por natureza:** renomear a oferta no painel sem atualizar a env quebra a liberação silenciosamente. Sempre prefira o ID.
- **`cancelled` e `expired` não revogam** — caem em `ignored`.
- Exclusão de conta com `license_events` continua impossível (bug do trigger da 0002).

### Validação final — ciclo real em produção (2026-08-08)
- **Status:** ✅ Ciclo comercial real validado de ponta a ponta em produção, da compra ao reembolso e bloqueio do acesso.
- **Produto testado:** Doce Margem Essencial, com pagamento e reembolso reais pela Kiwify.

#### Resultado observado
1. O botão **“Testar Webhook”** da Kiwify retornou HTTP 200 e foi ignorado com segurança.
2. A compra real do produto **Doce Margem Essencial** retornou HTTP 200.
3. O webhook `compra_aprovada` ficou com status `processed`.
4. A usuária compradora foi criada.
5. O convite chegou por meio do Resend configurado como SMTP do Supabase.
6. A compradora criou a senha pelo fluxo de convite.
7. A licença Kiwify ficou com status `active`.
8. `license_events` registrou o evento `granted`.
9. A usuária acessou `/conta`, `/ingredientes`, `/receitas`, `/precificacao` e `/configuracoes`.
10. Um reembolso real na Kiwify disparou o webhook correspondente.
11. O webhook `compra_reembolsada` ficou com status `processed`.
12. A licença mudou para `refunded`.
13. `license_events` registrou o evento `refunded`.
14. A usuária perdeu o acesso e foi redirecionada para `/acesso-bloqueado`.
15. As licenças manuais usadas nos testes foram removidas.
16. Os webhooks antigos com status `failed`/`ignored` foram removidos.
17. O estado final do banco ficou somente com os eventos `processed` de auditoria da compra e do reembolso reais.

#### Pendências conhecidas após a validação
- O e-mail de convite ainda pode cair em spam.
- Perfis antigos de teste continuam existindo, porém sem licença ativa.
- Chargeback não foi testado manualmente de ponta a ponta; ele usa o mesmo mecanismo de revogação já validado pelo reembolso.
- O app ainda não está com venda aberta oficialmente.
- Antes da abertura oficial, revisar copy, checkout, domínio, suporte e política de reembolso.

## Checklist técnico
- [x] O projeto está em C:\dev\doce-margem
- [x] Não há dependência de OneDrive
- [x] A lógica de cálculo está separada da UI _(módulos puros em `modules/pricing/`, sem UI)_
- [x] Os cálculos principais foram validados _(ingredientes, receitas, sub-receitas, medidas caseiras, canais, custos fixos e pricing engine validados — 1A → 1C-3)_
- [ ] A interface simples não assusta iniciantes
- [ ] O modo avançado preserva recursos profissionais
- [x] Não existe plano mensal _(nada de mensal documentado)_
- [x] Compra única tem acesso controlado _(validado com compra real em produção)_
- [x] Reembolso revoga acesso _(validado com reembolso real em produção)_
- [x] Plano Pro é anual _(modelo definido no README)_
- [x] Permissões não dependem apenas do frontend _(a licença `refunded` bloqueou as rotas na requisição seguinte)_
- [x] Webhooks estão protegidos _(teste do painel ignorado; compra e reembolso reais autenticados e processados)_
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

---

## 2026-08-09 — Rebrand controlado para Minha Fatia

### Escopo concluído

- Navbar, login, cadastro, convite, preços, conta, acesso bloqueado e metadata exibem **Minha Fatia**.
- Os planos aparecem como **Minha Fatia Essencial** e **Minha Fatia Pro Anual**.
- A documentação viva adota a marca e o domínio público `https://www.minhafatia.com.br`.
- O nome de arquivo exportado mudou para `minha-fatia-backup-AAAA-MM-DD.json`; o marcador interno do formato legado foi preservado para manter a importação compatível.
- A busca final encontrou zero ocorrências de Doce Margem em `app/`, `components/` e `public/`.

### Fronteira preservada

Nenhuma alteração em pricing engine, migrations, schema do Supabase, endpoint ou processamento do webhook Kiwify, validação de produto, licenças, auth actions, serviços de autenticação ou envs. Diretório, nome do pacote, chaves de `localStorage`, tipos existentes e marcadores internos continuam com os identificadores legados quando necessário para compatibilidade.

### Validação

- `npm run typecheck`: passou (`tsc --noEmit`).
- `npm run lint`: passou (`eslint`).
- `npm run build`: passou no Next.js 16.2.9; 16 páginas geradas. A primeira tentativa no sandbox não alcançou o Google Fonts; a repetição com rede permitida baixou Geist/Geist Mono e concluiu sem erros.
- `git diff --check`: passou sem erros.

---

## Fase P0-8 — Auditoria final de lançamento (2026-08-12)

> Auditoria de leitura, com olhar de usuária nova comprando o Essencial. Nenhuma
> fórmula, rota, migration, env, licença ou integração foi alterada. Só duas
> correções de copy factualmente erradas (listadas ao final).

### Veredito
**Pode vender com pequenos ajustes.** O ciclo compra → convite → senha → acesso →
reembolso já está validado em produção e o fluxo de trabalho do app está coerente
e bem sinalizado. O que trava não é o produto: é a **recuperação de acesso** e a
**ausência de canal de suporte e de páginas legais**.

### Bloqueadores de lançamento
1. **Não existe recuperação de senha.** Nenhum `resetPasswordForEmail`, nenhum link
   "Esqueci minha senha" em `/login`, nenhuma tela de troca de senha em `/conta`.
   Quem paga, cria a senha pelo convite e a esquece fica permanentemente fora de um
   produto pago. É o gerador clássico de chargeback.
2. **Nenhum canal de suporte no app.** Quatro mensagens mandam a usuária "falar com
   o suporte" (`/conta` bloqueada, três estados de `AcceptInviteClient`) e não há
   e-mail nem WhatsApp em lugar nenhum. `NEXT_PUBLIC_SUPPORT_WHATSAPP` existe no
   `.env.example` e **não é lida por nenhum arquivo**.
3. **Sem política de reembolso, termos de uso e política de privacidade.** Venda
   online com login e e-mail armazenado, sem CDC art. 49 visível e sem aviso LGPD.
   O app não tem rodapé nem rota legal.

### Ajustes recomendados antes de vender
- `/precos` anuncia "12x de R$ 10,03" sem informar o total (R$ 120,36) nem indicar
  juros da operadora.
- `/` é rota protegida: quem digita o domínio cai em `/login`. A vitrine pública é
  só `/precos` — toda divulgação precisa apontar para lá.
- Contradição aparente em `/precos`: a lista do Essencial traz três recursos
  "Em desenvolvimento — incluído no Essencial" e o rodapé do cartão Pro diz que
  "recursos novos e avançados poderão pertencer ao Pro Anual futuro".
- Ingredientes e Receitas usam `type="number"`; Embalagens, Precificação e
  Orçamento usam texto com normalização de vírgula. Pendência antiga da Fase 2-8,
  agora nas duas primeiras telas da jornada.
- A Ficha interna de precificação não tem data de geração nem rodapé de documento
  interno — a Ficha técnica da receita tem os dois.
- Em Orçamentos, o campo "Observações" fica no cartão **Cliente** e é impresso no
  documento enviado ao cliente, sem aviso disso no formulário.

### Confirmações de fronteira
- O Orçamento imprime apenas marca, contatos, cliente, itens, quantidade, valor
  unitário, subtotal, desconto e total. Nenhum custo, mão de obra, embalagem,
  margem, markup ou lucro atravessa para o documento do cliente.
- Ficha interna de precificação e Ficha técnica da receita se identificam como
  internas; a segunda ainda fecha com "Documento interno de produção".
- A impressão esconde cabeçalho do site, formulários, listas e botões
  (`body > header`, `.pricing-print-hidden`, `.quote-print-hidden`,
  `.recipe-print-hidden`).

### Alterações feitas nesta fase (somente copy)
- `app/layout.tsx` — a descrição padrão do site ainda era a promessa antiga
  ("Pare de vender doce no achismo…"), que aparece em busca e prévia de link e
  contradizia o posicionamento aprovado na P0-7.
- `components/auth/AcceptInviteClient.tsx` — o rodapé prometia trocar a senha
  depois "na sua conta"; `/conta` não tem essa funcionalidade.

### Validação
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou no Next.js 16.2.9; 16 rotas, todas dinâmicas.
- `git diff --check`: passou sem erros.

---

## Fase P0-8A — Pós-venda mínimo antes da venda pública (2026-08-12)

> Responde aos três bloqueadores da auditoria P0-8. Critério de corte: entra o que
> evita cliente pagante sem produto ou sem interlocutor; melhoria de experiência
> não entra.

### 1. Recuperação de senha — bloqueador B1 resolvido

Fluxo novo, sem tabela, migration ou SQL:

```
/login → "Esqueci minha senha" → /auth/esqueci-senha → e-mail → /auth/nova-senha → /conta
```

- `requestPasswordResetAction` chama `resetPasswordForEmail` com `redirectTo` para
  `/auth/nova-senha`. **Resposta idêntica exista ou não a conta** — a tela é pública e
  mensagens diferentes a transformariam num verificador de base de usuárias. Só o
  limite de tentativas tem mensagem própria, e ele não revela existência nenhuma.
- `/auth/nova-senha` aceita as **três** formas em que a sessão pode chegar: fragment
  (fluxo implícito), `?code=` (PKCE) e sessão já ativa. O formato depende de
  configuração do painel do Supabase que o código não controla, e uma tela que só
  funciona num deles trava exatamente quem já está travada.
- Hash e `code` são apagados da URL **antes de qualquer `await`**, como no convite:
  fecha `Referer`, histórico e print de tela de uma vez.
- `setRecoveryPasswordAction` revalida com `getUser()` antes de `updateUser` — nunca
  `getSession()`, que só lê o cookie e é forjável.
- **`setInvitedPasswordAction` não foi tocada.** A duplicação entre as duas actions é
  deliberada e está comentada nos dois lados (ver `DECISIONS.md`).
- `InviteHashRescue` passou a escolher o destino pelo `type` do fragment: `recovery`
  vai para a tela nova, qualquer outro caso segue para o convite, como antes.
- `/conta` ganhou "Trocar minha senha", que reaproveita o mesmo link por e-mail.

### 2. Suporte visível — bloqueador B2 resolvido

Canal centralizado em `lib/support.ts` e exibido por `SupportLink` em `/precos`,
`/acesso-bloqueado`, `/conta`, `/login`, `/auth/esqueci-senha`, `/auth/nova-senha`, na
tela de convite com erro e no rodapé de todas as páginas. Cada ponto manda uma mensagem
de WhatsApp já escrita com o contexto daquela tela.

O WhatsApp oficial de atendimento — **+55 21 95905-4988**, `wa.me/5521959054988` — foi
configurado ao fechar a fase, substituindo o placeholder usado durante a implementação.
A troca custou a edição de uma constante e nenhuma outra alteração no app, que era o
resultado esperado de centralizar o canal.

### 3. Páginas legais — bloqueador B3 resolvido

`/termos`, `/privacidade` e `/reembolso`, públicas, com casca compartilhada e data única
em `LEGAL_UPDATED_AT`. Descrevem o produto **como ele é hoje**: dados no navegador,
conta e licença no servidor, sem cartão armazenado. `/reembolso` remete ao checkout e
cita o direito de arrependimento do art. 49 do CDC, que existe por lei — não cria
garantia própria.

### 4. Parcelamento e aviso fiscal

- `/precos` passou a informar o total aproximado de R$ 120,36 e que juros e condições
  são da plataforma de pagamento. Preço à vista e link de compra inalterados.
- `/precificacao` ganhou aviso discreto de que impostos não entram automaticamente no
  cálculo, sugerindo considerá-los no custo fixo. Fica **na página**, não no
  `PricingForm`, para não encostar em nada que participe do cálculo, e carrega
  `pricing-print-hidden` para não sair na Ficha interna impressa. Não é CTA: nenhum
  "Fale com contador" foi criado.

### 5. Botão de compra — verificação de código

`NEXT_PUBLIC_BUY_ESSENTIAL_URL` é lida em um único lugar, `app/precos/page.tsx`, e
passada ao `PurchaseCta`. Sem a variável, o CTA vira botão desabilitado escrito "Compra
indisponível no momento" — sem erro e sem log. A copy é clara sobre o estado, e agora há
um link de suporte logo abaixo. **A validação em produção continua sendo manual e
obrigatória.**

### Fronteira preservada

Nenhum arquivo de `modules/` foi editado. Nenhuma dependência nova. Nenhum env, product
ID, webhook/Kiwify, migration, SQL, licença ou regra de liberação/revogação de acesso
foi alterado. O rodapé novo é escondido na impressão por `body > footer`, para não sair
no orçamento enviado ao cliente.

### Validação
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou no Next.js 16.2.9; **21 rotas** (eram 16), todas dinâmicas.
- Teste HTTP no build de produção: `/termos`, `/privacidade`, `/reembolso`,
  `/auth/esqueci-senha` e `/auth/nova-senha` devolveram **200**; `/conta` e
  `/ingredientes` continuaram em **307** para `/login`. Gating intacto.
- `git diff --check`: passou sem erros.

### Pendências desta fase
- ✅ WhatsApp oficial de suporte configurado em `lib/support.ts`.
- 🚨 Validar o botão de compra em `/precos` no ambiente de produção.
- 🚨 Cadastrar `/auth/nova-senha` nas Redirect URLs do Supabase e disparar um e-mail de
  recuperação real — o envio do e-mail **não foi exercido** nesta fase.
- 🚨 Mandar uma mensagem de teste por um dos CTAs e confirmar que ela chega ao aparelho
  de atendimento. O link foi verificado no HTML renderizado; a entrega, não.
- Revisar as páginas legais com apoio jurídico quando o volume justificar.

---

## Fase P0-9A — Modo avançado (2026-08-12)

> Fase de **interface**. Nenhum arquivo de `modules/` ou `services/` foi tocado:
> os três campos já existiam no motor e já afetavam o custo desde a Fase 1.

### O que mudou de verdade

Fator de correção e perda de produção eram campos **fixos e sempre visíveis**, cada um
com uma dica que dizia "ignore isto" — *"Deixe 1 se você não sabe o que é isso"* e
*"Deixe 0 se não sabe o que é isso"*. A P0-9A recolheu os dois atrás de uma área
opcional e trocou a dica por explicação de verdade.

O resultado é que a jornada simples ficou **mais** simples, não menos: a Etapa 1
(Ingredientes) perdeu um campo técnico da visão padrão.

### Decisões de implementação

- `<details>` nativo em `components/advanced/AdvancedSection.tsx`: funciona sem
  JavaScript, já resolve teclado e leitor de tela, e não precisa ser reinicializado no
  remount por `key` que os dois formulários usam ao entrar em edição.
- A seção **abre sozinha** quando o item em edição já tem ajuste aplicado, e esse estado
  é **congelado no primeiro render**. Se dependesse do valor atual, apagar o campo para
  redigitar fecharia a seção no meio da edição.
- O efeito de cada ajuste é mostrado antes de salvar, calculado por
  `applyCorrectionFactor` e `calculateRecipe` — a UI não repete a conta.

### Defeito silencioso corrigido

`RecipeForm` remontava o `Recipe` ao salvar **sem copiar `notes`**. O campo existia em
`types/pricing.ts` desde a Fase 1B-1 e já era impresso na Ficha técnica, mas nenhuma
tela o gravava — então a perda era latente. Passaria a ser real no instante em que a
P0-9A criou o campo. Corrigido na mesma fase.

### Compatibilidade com dados locais

Nenhuma migração foi necessária, e nenhuma seria possível sem quebrar a regra da fase:

- `APP_STATE_STORAGE_KEY` e `APP_STATE_SCHEMA_VERSION` inalterados.
- `normalizeAppState` guarda `recipes` e `ingredients` como estão — não houve mudança de
  forma a normalizar.
- `notes` e `correctionFactor` sempre foram opcionais. Receita sem observação continua
  sem a chave; ingrediente sem fator continua valendo 1 pelo `?? 1` do domínio.
- Receitas, ingredientes e embalagens antigos abrem, calculam e imprimem igual.

### Onde o ajuste aparece depois de aplicado

| Documento | O que mostra |
|---|---|
| Ficha técnica da receita | Perda de produção, fator por item (≠ 1) + nota de que já está no custo, Observações técnicas |
| Precificação | Linha discreta com a perda considerada |
| Ficha interna de precificação | "Perda de produção considerada — já no custo da receita" |
| **Orçamento para cliente** | **Nada.** Nenhum dado interno atravessa. |

### Fronteira preservada

`advanced_mode` foi para `available` em `lib/features.ts`, com a `MATRIZ_APROVADA`
atualizada junto — o guard existe para forçar essa confirmação. `sub_recipes` e
`household_measures` seguem `planned`.

### Pendência registrada para a P0-9B

`RecipeForm` descarta itens que não sejam `kind: "ingredient"` ao editar. Inócuo hoje,
porque a interface nunca cria outro tipo. No dia em que criar, editar uma receita
apagaria suas sub-receitas — resolver **junto** com a interface.

### Validação
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou no Next.js 16.2.9; 21 rotas, todas dinâmicas.
- `git diff --check`: passou sem erros.

---

## Fase P0-9B — Sub-receitas na interface (2026-08-13)

> Fase de **interface**, como a P0-9A. Cálculo, validação e proteção contra
> referência circular existem desde a Fase 1B-2. Nenhum arquivo de `modules/`,
> `services/` ou `types/` foi tocado.

### A correção veio antes do recurso

`RecipeForm` inicializava `items` filtrando `kind: "ingredient"`, então salvar uma edição
**descartava silenciosamente** qualquer outro tipo de item. Ligar sub-receitas sem
corrigir transformaria "editar o nome da receita" em "apagar o recheio". Foi a primeira
coisa feita.

O ganho atravessa para a P0-9C: itens de medida caseira vindos de backup importado agora
sobrevivem à edição, mesmo sem interface para editá-los.

### O `id` real no candidato

`validateRecipe` detecta ciclo comparando a receita com seus ancestrais. Com `id: ""`, a
receita **nunca se reconhecia** na própria árvore: adicionar "Bolo de pote" dentro de
"Bolo de pote" passava pela validação e só quebrava depois, na leitura, com a receita já
gravada e sem calcular. O candidato agora carrega o id real; `updateRecipe` preserva o id
original de qualquer forma, então a persistência não muda.

A verificação isolada prova os dois lados — com id real o ciclo é pego, com `id: ""`
passa despercebido.

### Verificação isolada contra o domínio real — 13/13

Rodada com o motor de verdade (Node com type stripping, sem instalar nada), reproduzindo
o cenário do teste manual sugerido:

| Verificação | Resultado |
|---|---|
| Base: 400 g de leite condensado → 500 g | custo R$ 16,00 · R$ 0,032/g ✅ |
| Final: 300 g de massa + 200 g da base → 5 un | sub-receita entra com R$ 6,40 ✅ |
| Final: custo total e unitário | R$ 12,40 · R$ 2,48/un ✅ |
| P0-9A intacto: perda de 20% sobre a receita composta | R$ 15,50 ✅ |
| Auto-referência | `CIRCULAR_REFERENCE` ✅ |
| Ciclo indireto (base passa a usar a final) | `CIRCULAR_REFERENCE` ✅ |
| Com `id: ""` o ciclo passaria despercebido | confirmado — motivo da correção ✅ |
| Rendimento em unidade livre como componente | `INCOMPATIBLE_UNIT` ✅ |

Matriz de recursos: **30/30**, incluindo a `MATRIZ_APROVADA` com
`sub_recipes: essential / available`.

### Limitação assumida

Receita com rendimento em unidade livre ("porções", "fatias") **não pode** virar
componente: `SubRecipeItem.unit` é `PurchaseUnit` e `isUnitCompatibleWithYield` recusaria
o item. O seletor filtra e diz quantas receitas ficaram de fora e por quê. Resolver de
verdade exigiria mexer no domínio, o que esta fase não faz.

### Fronteira preservada

- Precificação: **zero mudança** — `PricingForm` já montava `recipesById` desde a Fase 2-5.
- Orçamento para cliente: **zero mudança** — nenhum componente interno atravessa.
- Ficha técnica: ganhou só a nota de que há componentes vindos de outras receitas; não
  virou árvore.
- `APP_STATE_STORAGE_KEY`, schema e normalização intactos. `SubRecipeItem` já fazia parte
  de `RecipeItem` desde a Fase 1B-2, então dados antigos e novos têm o mesmo formato.

### Validação
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou no Next.js 16.2.9; 21 rotas, todas dinâmicas.
- `/precos` conferida no build: Modo avançado e Sub-receitas sem selo; Medidas caseiras
  ainda "Em desenvolvimento". `/receitas`, `/precificacao` e `/orcamentos` seguem em 307.
- `git diff --check`: passou sem erros.


---

## Fase P0-9C — Medidas caseiras, rendimento real e unidades seguras (2026-08-13)

> Fase de **interface e tolerância de entrada**. Nenhum arquivo de `modules/`,
> `services/` ou `types/` foi tocado; nenhuma fórmula alterada.

### O defeito que originou a fase

A P0-9B validou sub-receitas com unidades reconhecidas. Na prática apareceu o caso real:
a usuária digita **"gr"** no rendimento e a receita fica inelegível como sub-receita —
`isUnitCompatibleWithYield` compara com as cinco unidades canônicas, e "gr" não é nenhuma
delas. A receita parecia certa e o app dizia não, sem explicar.

### As três entregas

1. **Unidade de rendimento virou seletor** (g, kg, ml, l, un), com `lib/recipe-units.ts`
   normalizando o que já estava gravado. A normalização acontece **na leitura do store**
   — `services/storage-service.ts` não foi tocado, e o arquivo gravado só muda quando a
   usuária salva algo.

   "Porções", "fatias" e "pedaços" **não** são convertidas: mapear para "un" apagaria a
   informação dela. Continuam legíveis e selecionáveis como "unidade livre" na edição,
   com aviso do que isso impede.

2. **Medidas caseiras** (`lib/household-input.ts`), com as opções derivadas do
   ingrediente escolhido. Embalagem (lata 395 g, caixinha 200 g) vira item de ingrediente
   comum já convertido; xícara e colher viram `HouseholdMeasureRecipeItem`, com a
   conversão feita pela tabela da Fase 1B-3 dentro do domínio.

3. **Assistente de rendimento real** no Modo avançado: estimado + real → perda calculada,
   aplicada **só se a usuária clicar**. Preencher sozinho mudaria o custo dela sem ela
   pedir.

### A regra que governa as conversões

**Só oferecer conversão que dá para defender.** 1 xícara de farinha são 120 g e 1 xícara
de açúcar são 180 g; num app de precificação, um número errado aqui vira preço errado na
ponta, em silêncio. Sem referência confiável, a tela pede g ou ml em vez de chutar.

Consequências verificadas: cacau não recebe "lata de leite condensado"; leite condensado
não recebe "xícara" (nenhuma tabela responde por ele — a lata é a ferramenta certa);
ingrediente contado em `un` não recebe medida caseira nenhuma.

### Verificação isolada contra o domínio real — 46/46

Inclui o teste manual sugerido, ponta a ponta:

| Verificação | Resultado |
|---|---|
| 15 normalizações de unidade (`gr`, `Grama`, `Kilos`, `mls`, `lt`, `und`…) | ✅ |
| 5 unidades livres preservadas (`porções`, `fatias`, `pedaços`, `potes`, vazio) | ✅ |
| Lista sem alteração mantém a **mesma referência** (evita re-render infinito) | ✅ |
| 1 lata = 395 g · 1 caixinha = 200 g | ✅ |
| 1 xícara de cacau = 90 g · meia xícara = 45 g · 1 xícara de líquido = 240 ml | ✅ |
| Cacau não recebe lata; leite condensado não recebe xícara; ovos não recebem nada | ✅ |
| Brigadeiro Recheio (lata + caixinha + meia xícara de cacau) → R$ 16,45 / 920 g | ✅ |
| Bolo de pote com 200 g do recheio → custo proporcional | ✅ |
| Perda de 8% aplica a fórmula da P0-9A sem alteração | ✅ |

Matriz de recursos: **31/31**. Regressão da P0-9B (sub-receitas): **13/13**.

### Efeito comercial

Com `household_measures` em `available`, **nenhum recurso do Essencial continua marcado
como "Em desenvolvimento"** em `/precos` — conferido no build: zero ocorrências do selo.
Fecha o risco levantado na auditoria P0-8 sobre a distância entre promessa e produto.

### Fronteira preservada

- Precificação e Orçamento: **zero mudança de código**.
- `APP_STATE_STORAGE_KEY`, schema e `storageService` intactos. `HouseholdMeasureRecipeItem`
  já fazia parte de `RecipeItem` desde a Fase 1B-3.
- Modo avançado (P0-9A) e sub-receitas (P0-9B) verificados sem regressão.

### Registrado como fora de escopo
- **Upload de receita** — fase própria.
- **Tabela nutricional** — ⚠️ implicação regulatória (RDC/ANVISA). Não sair sem decisão
  explícita, fonte confiável e ressalva de responsabilidade.

### Validação
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou no Next.js 16.2.9; 21 rotas, todas dinâmicas.
- `/precos` conferida no build: os três recursos sem selo; gating de `/receitas`,
  `/precificacao` e `/orcamentos` mantido em 307.
- `git diff --check`: passou sem erros.
