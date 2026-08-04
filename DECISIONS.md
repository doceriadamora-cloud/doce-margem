# DECISIONS — Doce Margem

Histórico oficial de decisões arquiteturais, comerciais e de produto.

Nunca remova decisões antigas. Quando uma decisão mudar, registre uma nova entrada explicando a mudança.

---

## 2026-06-27 — Local do projeto fora de pastas sincronizadas

### Decisão
O projeto deve ficar em `C:\dev\doce-margem`, fora de OneDrive, Desktop e Downloads.

### Contexto
Setup inicial do projeto em uma máquina Windows com OneDrive ativo em pastas de usuário.

### Motivo
Evitar problemas de sincronização, build, `node_modules` e erros de disco (ENOSPC). Pastas sincronizadas atrapalham o watch do Next.js e a performance de I/O.

### Impacto
Técnico: ambiente de desenvolvimento estável e previsível. Todo o trabalho (e futuro Git) acontece em `C:\dev\doce-margem`.

---

## 2026-06-27 — Duas modalidades comerciais, sem plano mensal

### Decisão
O Doce Margem terá duas modalidades: **Doce Margem Essencial** (compra única) e **Doce Margem Pro Anual** (plano anual). Não haverá plano mensal.

### Contexto
Definição do modelo de monetização do produto antes de iniciar a implementação.

### Motivo
A compra única reduz a barreira de entrada para iniciantes; o Pro Anual captura valor recorrente sem o atrito e a alta rotatividade típicos de planos mensais.

### Impacto
Comercial e técnico: a modelagem de `licenses` usa `product_type` (`one_time` | `annual_pro`) e `plan` (`essential` | `pro_annual`). Nenhuma referência a mensalidade em código, copy ou banco.

---

## 2026-06-27 — Compra única = acesso vitalício à versão Essencial atual

### Decisão
A compra única será vendida como "acesso vitalício à versão Essencial **atual**". Não prometer que todas as funções futuras estarão incluídas.

### Contexto
Risco de a compra única canibalizar o Pro Anual caso prometa "tudo para sempre".

### Motivo
Preservar a viabilidade do Pro Anual: funções futuras e mais robustas pertencem ao plano anual. A compra única entrega valor presente claro, sem comprometer a evolução paga.

### Impacto
Produto/copy: a página de preços e as telas comunicam "versão Essencial atual". Funções avançadas ficam atrás de feature flags exclusivas do Pro.

---

## 2026-06-27 — Acesso controlado por login/licença, mesmo na compra única

### Decisão
Mesmo na compra única, o acesso será controlado por login e licença. Em caso de reembolso, chargeback ou bloqueio manual, o acesso poderá ser revogado.

### Contexto
Compra única poderia ser entregue como arquivo/link aberto, o que impede revogação.

### Motivo
Proteger a receita: sem controle de acesso não há como revogar em fraude/reembolso. Vincular o acesso ao status da compra evita abuso.

### Impacto
Técnico: nada de arquivo baixável nem link público. Acesso depende de `licenses.status`; webhooks (Kiwify/Hotmart) e admin atualizam o status. Validação no backend.

---

## 2026-06-27 — Modo simples como experiência padrão

### Decisão
O modo simples será a experiência padrão. O modo avançado existirá, mas não deve assustar a usuária iniciante.

### Contexto
Público-alvo inclui muitas confeiteiras iniciantes; o domínio (CMV, markup, canais, fator de correção) pode intimidar.

### Motivo
Reduzir o atrito inicial: a usuária precisa responder rápido "quanto custa, por quanto vender, quanto sobra". Recursos avançados ficam ocultos por padrão (fator de correção = 1, perda = 0%, sem multicanal avançado).

### Impacto
Produto/UX: a interface separa modo simples × avançado sem remover a lógica avançada — apenas organiza a experiência.

---

## 2026-06-27 — Lógica de cálculo separada da UI e protegida por validação

### Decisão
A lógica de cálculo deve ficar separada da UI. A matemática de precificação não pode ser alterada sem validação/testes.

### Contexto
A confiabilidade dos números é o coração do produto; um erro de cálculo destrói a confiança.

### Motivo
Módulos puros (em `modules/`) são testáveis isoladamente e reutilizáveis (local e nuvem). Validar antes de mudar evita regressões silenciosas na matemática.

### Impacto
Técnico: `modules/pricing/*` contém apenas funções puras, sem dependência de React/UI/armazenamento. Mudanças na matemática exigem validação (testes/funções de validação) antes de seguir.

---

## 2026-06-27 — Validação de cálculo sem dependências de teste (por enquanto)

### Decisão
Na Fase 1, a matemática é validada por **funções puras de exemplo** (`runExampleValidations`) executadas via compilação temporária para CommonJS, sem instalar framework de testes. Reavaliar a adoção de um runner de testes (ex.: Vitest) na Fase 1C.

### Contexto
O Node 24 não resolve imports de TypeScript sem extensão de arquivo, e o código-fonte usa imports idiomáticos do Next (extensionless + alias `@/`). Era preciso uma forma de executar/validar os cálculos sem adicionar dependências cedo demais.

### Motivo
Manter o projeto enxuto no início e evitar instalar dependências antes de necessário (regra do CLAUDE.md), sem abrir mão de comprovar que os números batem.

### Impacto
Técnico: as validações vivem em `modules/pricing/examples.ts` (puras e reutilizáveis). A execução de prova roda fora do projeto (diretório temporário), sem poluir o repositório. Quando a complexidade crescer (receitas, canais, engine), avaliar um framework de testes formal.

---

## 2026-06-28 — Item de receita como união discriminada e sub-receitas recursivas

### Decisão
Um item de receita é uma **união discriminada** por `kind`: `IngredientRecipeItem` (`kind: "ingredient"`) ou `SubRecipeItem` (`kind: "subRecipe"`). O cálculo de receita é **recursivo** (sub-receita resolvida como receita e usada pelo custo por unidade de rendimento) e protegido contra **referência circular** via um conjunto de ancestrais no caminho de cálculo (código de erro `CIRCULAR_REFERENCE`). A lógica de sub-receita fica em `recipes.ts`/`recipe-validators.ts` — sem arquivo `sub-recipes.ts` separado.

### Contexto
A Fase 1B-2 exigiu permitir que uma receita use outra como item (ex.: Brownie usa Recheio de brigadeiro), preservando os cálculos das fases 1A e 1B-1.

### Motivo
A união discriminada deixa o modelo explícito e seguro em tipos (o `kind` estreita o tipo e evita campos opcionais ambíguos). A recursão é a forma natural de compor custo de sub-receitas. A detecção de ciclo por ancestrais é simples, cobre ciclos diretos e indiretos e não dá falso-positivo em grafos em diamante (DAG). Manter tudo em `recipes.ts` evita fragmentar a recursão e expor estado interno (ancestrais).

### Impacto
Técnico: `RecipeItem`/`CalculatedRecipeItem` passaram a ser uniões; `calculateRecipe`/`validateRecipe` agora recebem também `recipesById`. Consumidores devem checar `item.kind` antes de acessar campos específicos. Base pronta para canais/pricing engine consumirem o custo unitário de qualquer receita (com ou sem sub-receitas).

---

## 2026-06-28 — Canais de venda: percentuais em 0–100 e mensalidade fora do cálculo por pedido

### Decisão
Os percentuais de canal (comissão, pagamento, anúncio) são armazenados de **0 a 100** e convertidos para decimal apenas no cálculo. A **taxa fixa não entra no percentual**. A **mensalidade do canal (`monthlyFee`) NÃO entra no cálculo de preço por pedido** — fica registrada como dado do canal para uso futuro em custos fixos/rateio. O preço necessário por canal é `(líquido desejado + taxa fixa) / (1 − total%/100)`, exigindo que a soma dos percentuais seja `< 100`.

### Contexto
Início da Fase 1C-1 (canais e taxas). Era preciso definir como representar taxas e o que entra no cálculo por pedido versus o que pertence ao rateio de custos fixos.

### Motivo
Percentuais em 0–100 batem com o que a confeiteira lê nos contratos dos canais (UX). Misturar mensalidade no preço por pedido distorceria o custo unitário (a mensalidade independe do volume vendido) — ela é um custo fixo e será rateada na fase de custos fixos. Exigir soma `< 100` evita denominador zero/negativo.

### Impacto
Técnico: `SalesChannel` carrega `monthlyFee` sem usá-la em `calculateChannelPrice`; a Fase 1C-2 (custos fixos) consumirá esse campo no rateio. A biblioteca inicial de canais vive em `channels.ts` (dado de domínio), como a tabela de medidas caseiras em `household-measures.ts`.

---

## 2026-06-30 — Custos fixos: percentual e rateio sobre o total efetivo (com mensalidades de canais)

### Decisão
O percentual de custo fixo (`fixedCostRate`) e o custo fixo médio por unidade (`fixedCostPerUnit`) são calculados sobre o **total efetivo** (`totalConsidered` = soma dos custos fixos ativos + mensalidades de canais incluídas), e não apenas sobre a base de custos fixos. Quando nenhuma mensalidade é incluída, o total efetivo é igual à base. A seleção de canais "ativos" é a própria lista de canais passada ao cálculo — não foi adicionado um flag `active` ao `SalesChannel` da Fase 1C-1.

### Contexto
O briefing da Fase 1C-2 trazia a fórmula `fixedCostRate = totalFixedCosts / faturamento`, mas o exemplo com canais exigia o percentual de 25,4% calculado sobre R$ 2.540 (base R$ 2.310 + R$ 230 de mensalidades). Era preciso reconciliar a fórmula literal com o exemplo.

### Motivo
Usar o total efetivo satisfaz os dois exemplos do briefing (23,1% sem canais; 25,4% com canais) e é coerente: a mensalidade do canal é um custo fixo real e deve compor o rateio quando a confeiteira opta por incluí-la. Não criar flag `active` no canal evita alterar a Fase 1C-1 e mantém a responsabilidade da seleção com quem chama.

### Impacto
Técnico: `FixedCostSummary` expõe `totalFixedCosts`, `channelMonthlyFeesTotal` e `totalConsidered` separadamente (transparência), e `fixedCostRate`/`fixedCostPerUnit` derivam de `totalConsidered`. O pricing engine (Fase 1C-3) consumirá `fixedCostRate` para compor o preço sugerido — sem que esta fase calcule preço, margem ou markup.

---

## 2026-06-30 — Pricing engine: taxas em decimal, preço por divisão (mark-on) e comparação com tolerância

### Decisão
O pricing engine (`calculatePricing`) usa o método de **mark-on por divisão**: `preço = custo direto / (1 − fixedCostRate − desiredProfitRate)` (sem canal) e `preço = (custo direto + taxa fixa) / (1 − fixedCostRate − desiredProfitRate − channelRates)` (com canal). `fixedCostRate` e `desiredProfitRate` são **decimais (0 a <1)**; os percentuais do canal continuam **0–100** (Fase 1C-1) e são convertidos internamente. A **margem** é `lucro líquido / preço` e o **markup** é `preço / custo direto`. A comparação com o preço praticado usa **tolerância de 1%** (`PRICE_COMPARISON_TOLERANCE`) para o status `at_suggested`. O engine **não modifica** receitas, canais nem custos fixos — apenas consome seus resultados. "Receita inválida" é tratada como `custo direto unitário ≤ 0`.

### Contexto
Fase 1C-3. Era preciso unir custo de receita (`CalculatedRecipe.unitCost`), custo fixo percentual (`FixedCostSummary.fixedCostRate`) e taxas de canal (`SalesChannel`) num único preço sugerido com margem e markup, e comparar com o preço efetivamente praticado.

### Motivo
O método de divisão garante que custo fixo e lucro sejam frações do **preço final** (e não do custo), que é como a confeiteira raciocina ("quero 20% de margem sobre a venda"). Por construção, a margem esperada resulta exatamente igual ao `desiredProfitRate` — um sanity check natural. Manter `fixedCostRate`/`desiredProfitRate` em decimal alinha com a saída da Fase 1C-2 (já decimal) e evita ambiguidade; os % de canal ficam em 0–100 porque é como aparecem nos contratos. Exigir denominador `> 0` (soma das taxas `< 100%`) evita preço infinito/negativo. A tolerância de 1% evita marcar como "fora do ideal" diferenças irrelevantes de arredondamento.

### Impacto
Técnico: `PricingEngineResult` traz o cenário sem canal no topo e aninha `channelPricing` (com detalhamento de cada taxa e `netFinal`) e `practicedComparison` (margem/markup reais + status). O briefing trazia "custo fixo ≈ R$ 4,0608" no Exemplo 1; o valor correto é R$ 4,05975 (= 17,5747 × 0,231) e foi o adotado. A engenharia de cardápio fica para fase própria; o engine já entrega o que a UI (Fase 2) precisa para preço, margem e markup.

---

## 2026-08-04 — storageService: um único AppState versionado, sem migração ainda, e exemplos de storage fora de modules/pricing

### Decisão
O estado local (Fase 2-1) é um **único objeto `AppState`** salvo sob **uma única chave** de `localStorage` (`doce-margem:app-state`), versionado por `schemaVersion`. Quando a versão lida é diferente da atual, o storageService **não tenta migrar** — devolve o estado inicial vazio (ainda não existe nenhuma função de migração; só a v1 existe). Campos individuais ausentes ou com tipo errado (mas `schemaVersion` correta) são recompostos como `[]` em vez de descartar o estado inteiro. Nenhuma abstração/factory formal (`interface AppStateStorage`, seletor local/nuvem) foi criada para preparar a troca por Supabase — a camada única de acesso é `@/services` (a UI nunca fala com `localStorage` direto). As validações manuais de storage vivem em `services/storage-examples.ts`, **não** em `modules/pricing/examples.ts`.

### Contexto
Fase 2-1 (storageService local), primeira peça de persistência do projeto. Era preciso decidir a granularidade da chave de storage, o que fazer com dados de schema desconhecido/corrompido, e onde colocar os testes manuais de storage sem violar a separação cálculo × armazenamento.

### Motivo
Uma chave única mantém `schemaVersion` e `updatedAt` centralizados e as funções por fatia (`saveIngredients`, etc.) como conveniência sobre um só objeto — evita reconciliar versões diferentes entre chaves separadas. Descartar (em vez de tentar adivinhar) um schema desconhecido é a opção mais segura hoje: não há usuárias reais em produção, então perder dados de um schema não reconhecido é preferível a aplicar uma migração especulativa errada; isso **precisa ser revisitado** antes de existirem dados reais de produção. Recompor campos ausentes individualmente (em vez de descartar tudo) trata graciosamente dados antigos parcialmente incompletos sem exigir um bump de versão a cada campo novo opcional. Não criar a abstração de troca por Supabase agora respeita "não implementar funcionalidade nova": a decoupling pedida (UI nunca toca `localStorage`) já está garantida pelo import único via `@/services`; a decisão real entre local/nuvem só existe a partir da Fase 4, quando fizer sentido desenhar o seletor. Colocar `storage-examples.ts` em `services/` (não em `modules/pricing/examples.ts`) evita que `modules/pricing` importe de `services/`, o que inverteria a dependência e violaria a regra do CLAUDE.md de que a matemática de precificação não pode depender de armazenamento.

### Impacto
Técnico: `services/storage-service.ts` nunca lança (localStorage indisponível, JSON inválido, schema ausente/desconhecido ou campos corrompidos sempre caem em `createEmptyAppState()` ou `false`). Mudar a forma do `AppState` no futuro exige decidir explicitamente entre migrar (escrever uma função de migração antes do bump) ou aceitar perda de dados — hoje o comportamento é sempre perda. A Fase 4 (Supabase) provavelmente introduzirá um seletor Essencial (local) × Pro (nuvem) por cima de `@/services`, sem precisar mudar as assinaturas já usadas pela futura UI (`loadAppState`, `saveIngredients`, etc.).

---

## 2026-08-04 — Ler o storageService em Client Components com useSyncExternalStore, não useEffect+setState

### Decisão
Toda leitura do `localStorage` (via `@/services`) dentro de um Client Component deve usar **`useSyncExternalStore`**, não `useEffect` + `useState`. O padrão: `getServerSnapshot()` devolve um `AppState` vazio fixo (usado no servidor e na primeira pintura do cliente, antes da hidratação); `getSnapshot()` lê o valor real do navegador uma única vez por carregamento de página, cacheado numa variável de módulo (`useSyncExternalStore` exige que `getSnapshot` devolva uma referência estável quando nada mudou, senão o React entra em loop de re-render). Navegação principal para telas que ainda não existem (Ingredientes, Receitas, Precificação) usa rótulos "em breve" não clicáveis, em vez de criar rotas placeholder.

### Contexto
Fase 2-2 (layout base e dashboard inicial), primeira tela a consumir o storageService da Fase 2-1. A primeira implementação usava `useEffect` + `setState` para ler o `localStorage` após montar (padrão comum), mas o ESLint do projeto (regra `react-hooks/set-state-in-effect`, parte do `eslint-config-next` atual) rejeitou por causar "cascading renders".

### Motivo
`useSyncExternalStore` é a API que o próprio React recomenda para sincronizar um componente com um sistema externo que não existe durante SSR (a mensagem de erro do lint aponta exatamente para esse padrão: "subscribe for updates... calling setState in a callback"). Resolve dois problemas ao mesmo tempo: (1) evita o `useEffect`+`setState` que o lint rejeita; (2) evita divergência de hidratação, porque servidor e primeira pintura do cliente usam o mesmo `getServerSnapshot()` fixo, e só depois da hidratação o React troca para o valor real via `getSnapshot()` — sem essa técnica, ler `localStorage` direto no corpo do componente faria o servidor (sem `window`) renderizar algo diferente do cliente. Não criar rotas placeholder para Ingredientes/Receitas/Precificação respeita "não crie telas completas ainda": um rótulo "em breve" comunica a navegação futura sem prometer uma tela que não existe nem gerar um link morto (404).

### Impacto
Técnico: qualquer tela futura (Fase 2-3+) que precise ler `@/services` dentro de um Client Component deve seguir o mesmo padrão `useSyncExternalStore` (ver `components/dashboard/Dashboard.tsx` como referência), não reintroduzir `useEffect`+`setState`. Como o cache de snapshot é por módulo e nunca invalida sozinho (o storageService não emite eventos de mudança), uma tela que ESCREVE dados (Fase 2-3, CRUD) precisará decidir como invalidar esse cache após salvar — hoje não há solução pronta para isso; avaliar na Fase 2-3.

---

## 2026-08-04 — Store reativo por feature (components/<feature>/<feature>-store.ts) para telas que escrevem no storageService

### Decisão
Toda tela que **escreve** dados (não só lê) implementa um pequeno store reativo próprio, em `components/<feature>/<feature>-store.ts`, seguindo o padrão de `components/ingredients/ingredients-store.ts`: cache de módulo + `Set` de assinantes + funções de escrita (`addX`/`removeX`/`updateX`) que gravam via `@/services` e notificam os assinantes. Expõe `subscribeX`/`getXSnapshot`/`getXServerSnapshot` no formato que `useSyncExternalStore` exige. Esse store fica dentro de `components/<feature>/`, não em `services/` — `services/storage-service.ts` continua puro I/O (sem depender de React nem do navegador além de `localStorage`), enquanto o store reativo depende deliberadamente de conceitos de UI (assinantes React) e do navegador (`crypto.randomUUID`).

### Contexto
Fase 2-3 (tela de ingredientes) era a primeira tela a ESCREVER dados, não só ler — a decisão anterior (2026-08-04, `useSyncExternalStore` no Dashboard) já tinha deixado em aberto como invalidar o cache de snapshot depois de um `save`. Era preciso resolver isso sem reintroduzir `useEffect`+`setState` (rejeitado pelo lint) nem duplicar lógica de cache em cada tela.

### Motivo
Um `Set` de assinantes é exatamente o contrato que `useSyncExternalStore` espera de um "external store" — ao chamar `notify()` depois de gravar, o próprio hook cuida de re-renderizar quem estiver inscrito, sem `useEffect`. Ter um store por feature (não um store global único) evita acoplar telas que não têm relação (ingredientes não precisa saber de receitas); o custo é que hoje duas telas escrevendo a MESMA fatia em abas diferentes não se sincronizam sozinhas — aceitável por enquanto (nenhuma tela faz isso), documentado como risco em `REVIEW.md`.

### Impacto
Técnico: `components/recipes/`, `components/fixed-costs/`, `components/channels/` (Fase 2-4+) devem seguir o mesmo padrão — copiar a forma de `ingredients-store.ts`, trocando a fatia (`saveRecipes`/`loadRecipes` etc.) e o tipo (`Recipe`, `FixedCost`, `SalesChannel`). Se, no futuro, duas telas precisarem refletir mudanças uma da outra em tempo real, será preciso um mecanismo de notificação compartilhado entre stores — não existe hoje.
