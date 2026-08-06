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

---

## 2026-08-04 — Uma feature pode LER o store de outra feature diretamente; só grava no próprio

### Decisão
Um componente pode importar e ler (via `useSyncExternalStore` com `subscribeX`/`getXSnapshot`/`getXServerSnapshot`) o store reativo de OUTRA feature quando precisa dos dados dela — sem duplicar leitura de storage nem criar uma cópia local. Só continua valendo que cada store só é ESCRITO pela sua própria feature (ex.: só `ingredients-store.ts` chama `saveIngredients`).

### Contexto
Fase 2-4 (tela de receitas): o formulário de receita precisa listar os ingredientes já cadastrados (Fase 2-3) para a usuária escolher. A dúvida era se `RecipeForm`/`RecipeList` deveriam chamar `loadIngredients()` de `@/services` direto (bypassando o store reativo) ou importar `components/ingredients/ingredients-store.ts`.

### Motivo
Como o cache de cada store reativo é um singleton por módulo (não por página), ele já persiste durante toda a navegação client-side dentro da mesma aba — ler o store de ingredientes a partir de receitas reflete corretamente qualquer ingrediente cadastrado antes na mesma sessão, sem exigir reload. Chamar `loadIngredients()` direto de `@/services` funcionaria também (sempre pega o dado mais recente do storage), mas ignoraria a camada reativa: se, no futuro, duas telas do mesmo layout mostrarem ingredientes lado a lado, só o store reativo garante que ambas atualizem juntas ao vivo. Manter a escrita restrita ao dono da fatia evita que duas features conflitem sobre quem é responsável por gerar id/persistir aquele dado.

### Impacto
Técnico: a tela de precificação (Fase 2-5+) deve seguir o mesmo padrão — ler `recipes-store` (e possivelmente `ingredients-store`) diretamente para calcular preço sugerido, sem duplicar a leitura via `@/services`. Cada novo store deve continuar exportando as três funções (`subscribeX`/`getXSnapshot`/`getXServerSnapshot`) justamente para permitir esse reaproveitamento entre features.

---

## 2026-08-04 — Store de leitura mora com o dono do dado, não com quem só consome; inputs efêmeros de precificação não são persistidos

### Decisão
Um store reativo (mesmo só de leitura, sem CRUD ainda) fica na pasta da feature **dona daquele dado**, não na pasta de quem primeiro precisou lê-lo. Por isso `channels-store.ts` (leitura de `customChannels`, sem escrita) foi criado em `components/channels/`, não em `components/pricing/`, mesmo a tela de precificação sendo a primeira e única consumidora hoje — quando existir CRUD de canais, ele ganha as funções de escrita nesse MESMO arquivo, sem precisar mover nada. Separadamente: os inputs da tela de precificação que não têm uma fatia própria no `AppState` (custo fixo %, lucro desejado %, canal escolhido, preço praticado) **não são persistidos** — vivem só como `useState` local, perdidos ao sair da tela.

### Contexto
Fase 2-5 (tela de precificação): era preciso ler `customChannels` de forma reativa e segura para hidratação (mesmo padrão dos outros stores), mas ainda não existe CRUD de canais. Era preciso decidir onde esse arquivo deveria morar, e se valia a pena persistir os campos de custo fixo/lucro/canal para poupar a usuária de preencher de novo a cada visita.

### Motivo
Colocar o store na pasta do DONO do dado (não do primeiro consumidor) evita um retrabalho previsível: se `channels-store.ts` nascesse em `components/pricing/`, o dia que a Fase 2-6 criar o CRUD de canais teria que mover o arquivo (ou duplicar) para um lugar mais correto — melhor já nascer no lugar certo. Não persistir os inputs de precificação é a opção mais simples e honesta agora: criar uma fatia nova no `AppState` só para "preferências de precificação" implica decidir versionamento de schema (ver decisão de 2026-08-04 sobre `storageService`) para um dado que a própria tarefa pediu para não salvar sem necessidade real comprovada — melhor reconhecer o atrito (preencher de novo a cada visita) como um risco documentado do que resolver com uma estrutura de dados provisória.

### Impacto
Técnico: futuros stores de leitura (para dados que ainda não têm CRUD) devem seguir o padrão `channels-store.ts` — só as três funções (`subscribeX` no-op, `getXSnapshot`, `getXServerSnapshot`), sem `addX`/`removeX` até existir de fato uma tela que escreve. Produto: a Fase 2-6 (CRUD de custos fixos) precisa decidir se resolve esse atrito de verdade (persistindo custo fixo/canal como preferência real da usuária) — hoje é um risco conhecido, não um problema resolvido.

---

## 2026-08-04 — Fase 2-6: três stores por feature (não um settings-store.ts único); percentual de custo fixo nunca persistido, só recalculado

### Decisão
A Fase 2-6 ("configurações financeiras") foi implementada com **três stores em três pastas diferentes** — `components/fixed-costs/fixed-costs-store.ts` (novo), `components/settings/business-settings-store.ts` (novo, objeto único com `updateX`, não uma lista com `addX`/`removeX`) e `components/channels/channels-store.ts` (**estendido** com `addCustomChannel`/`removeCustomChannel`, não recriado) — em vez do único `components/settings/settings-store.ts` sugerido pela tarefa. Separadamente: o campo `defaultFixedCostRate` sugerido para `BusinessSettings` **não foi criado** — o `AppState.businessSettings` guarda só `estimatedMonthlyRevenue`/`estimatedMonthlyUnits` (os insumos); o percentual de custo fixo é sempre recalculado on-demand via `calculateFixedCostSummary`, nunca persistido já calculado.

### Contexto
Fase 2-6 pedia custos fixos + configurações financeiras + canais customizados numa mesma leva de trabalho, com um arquivo de storage sugerido (`settings-store.ts`) cobrindo os três. Também pedia persistir algo como `defaultFixedCostRate: number | null` nas configurações, para a tela de precificação usar sem recalcular.

### Motivo
Cada uma dessas três fatias de dado (`fixedCosts`, `businessSettings`, `customChannels`) já tem — ou está prestes a ganhar — sua própria tela e seu próprio dono conceitual; um `settings-store.ts` único misturaria três responsabilidades num arquivo, contrariando a decisão já registrada de que "o store mora com o dono do dado" (2026-08-04, mais acima). `channels-store.ts` em particular já existia (Fase 2-5, só leitura) e o `DECISIONS.md` daquela fase já tinha literalmente prescrito este exato momento: "quando existir CRUD de canais, ele ganha as funções de escrita nesse MESMO arquivo" — seguir a receita já escrita evita um retrabalho inútil. Não persistir `defaultFixedCostRate` evita uma fonte de verdade duplicada: se ele fosse salvo e depois a usuária editasse ou excluísse um custo fixo (Fase 2-6 tela), o valor cacheado ficaria desatualizado até alguém reabrir a tela de Configurações para recalcular — um bug de estado obsoleto silencioso. Recalcular sempre a partir de `fixedCosts` + `estimatedMonthlyRevenue` (ambos já persistidos) custa a mesma chamada de função pura (`calculateFixedCostSummary`) que já é usada em dois lugares (Configurações e Precificação) — sem custo real, e sem risco de dessincronia.

### Impacto
Técnico: telas futuras que precisarem de outra fatia de dado nova devem continuar criando (ou estendendo) um store na pasta da feature dona, nunca um arquivo "genérico" compartilhado por múltiplas fatias. `PricingForm.tsx` lê `fixed-costs-store` + `business-settings-store` diretamente e chama `calculateFixedCostSummary` ela mesma para pré-preencher o campo — não existe (nem deve existir) um valor "prontinho" gravado em `businessSettings` para ler direto.

---

## 2026-08-04 — Adicionar businessSettings ao AppState sem incrementar APP_STATE_SCHEMA_VERSION

### Decisão
`AppState` ganhou o campo `businessSettings` (Fase 2-6) **sem** incrementar `APP_STATE_SCHEMA_VERSION` (continua `1`). A compatibilidade com dados salvos antes da Fase 2-6 (que não têm esse campo) é garantida pela reconstrução campo a campo que `normalizeStoredState()` já fazia desde a Fase 2-1: `businessSettings` ausente, de tipo errado, ou com campos internos inválidos vira `createEmptyBusinessSettings()`, sem descartar `ingredients`/`recipes`/`fixedCosts`/`customChannels` que já estivessem no mesmo estado salvo.

### Contexto
A tarefa da Fase 2-6 pedia explicitamente: "preservar compatibilidade com dados antigos do localStorage", "se o campo não existir, usar valor seguro", "não quebrar quem já tem ingredientes e receitas cadastradas" e "atualizar `schemaVersion` somente se necessário". Era preciso decidir se adicionar um campo novo ao `AppState` justificava um bump de versão.

### Motivo
O gate de versão em `normalizeStoredState()` (`raw.schemaVersion !== APP_STATE_SCHEMA_VERSION → devolve estado vazio`) existe para descartar dados de um schema **desconhecido** (ver decisão de 2026-08-04 sobre o `storageService`) — não para toda mudança de forma. Incrementar a versão para `2` teria o efeito oposto do pedido: qualquer estado gravado pelas Fases 2-1 a 2-5 (todas com `schemaVersion: 1`) deixaria de bater com a nova constante e seria **apagado inteiro** na primeira leitura após esta fase — exatamente o "quebrar quem já tem ingredientes e receitas cadastradas" que a tarefa pedia para evitar. Como a reconstrução campo a campo já cobre "campo novo ausente" (foi desenhada para isso desde o início, ver decisão da Fase 2-1), bastava estender essa mesma lógica para `businessSettings` — sem necessidade real de uma migração versionada.

### Impacto
Técnico: incrementar `APP_STATE_SCHEMA_VERSION` fica reservado para quando a forma de um campo **existente** mudar de um jeito que a reconstrução automática não resolva sozinha (ex.: renomear um campo, mudar o tipo de algo que já era obrigatório) — nesse caso sim será preciso escrever uma função de migração de verdade (risco já registrado desde a Fase 2-1: hoje o comportamento em schema desconhecido é sempre perda de dado, nunca migração). Adicionar um campo NOVO e opcional-por-padrão, como `businessSettings`, não exige isso. `services/storage-examples.ts` ganhou um teste dedicado (nº 12) que simula exatamente um estado salvo antes da Fase 2-6 e confirma que os dados antigos sobrevivem — é a prova viva desta decisão.

---

## 2026-08-04 — Todo componente que lê uma fatia do storage deve ler o store reativo dela; `subscribe` no-op só para dado imutável na sessão

### Decisão
Nenhum componente pode manter um cache próprio de dados que outra tela consegue alterar. Todo componente que lê uma fatia do `AppState` (`ingredients`, `recipes`, `fixedCosts`, `customChannels`, `businessSettings`) deve consumir o **store reativo dono daquela fatia** — nunca `loadAppState()`/`loadX()` direto de `@/services` dentro de um cache local. Um `subscribe` no-op só é aceitável para dado que comprovadamente **não muda durante a sessão** (hoje, só `isStorageAvailable()`).

### Contexto
Revisão da Fase 2. `Dashboard.tsx` (escrito na Fase 2-2, quando NENHUMA tela ainda escrevia dados) mantinha um cache de módulo próprio alimentado por `loadAppState()`, com `subscribe` no-op. Isso era correto naquele momento e o risco foi documentado no `REVIEW.md` da Fase 2-2 com a instrução "reavaliar quando a Fase 2-3 criar CRUD de verdade". As Fases 2-3 a 2-6 criaram quatro telas de escrita e a reavaliação nunca aconteceu — o risco virou um bug real: a usuária cadastrava ingredientes e, ao voltar ao Painel por navegação client-side, ainda via "Você ainda não cadastrou nada por aqui".

### Motivo
Caches de módulo sobrevivem à navegação client-side do Next (o módulo não é reavaliado ao trocar de rota), então um cache sem `subscribe` congela o valor da primeira leitura pelo resto da sessão. Como já existe exatamente um store reativo por fatia, com `subscribe`/`notify` corretos, reusá-los custa nada e elimina de vez essa classe de bug — além de remover a duplicação de responsabilidade de leitura (dois lugares lendo a mesma fatia por caminhos diferentes). A lição de processo importa tanto quanto a técnica: **um risco documentado com "reavaliar na fase X" precisa virar item de tarefa da fase X**, senão passa despercebido — cada fase validou sua própria tela isoladamente, e o bug só aparecia na transição entre telas, que nenhuma fase testou.

### Impacto
Técnico: `Dashboard.tsx` agora lê os quatro stores de CRUD. Qualquer tela futura de resumo/relatório (ex.: engenharia de cardápio, relatórios do Pro) deve fazer o mesmo, nunca reintroduzir um cache próprio de `loadAppState()`. Processo: ao registrar um risco com condição de reavaliação ("quando a Fase X fizer Y"), adicionar também um item correspondente no `TASKS.md` da fase X — a revisão de fim de fase deve incluir explicitamente o teste do fluxo ENTRE telas, não só de cada tela isolada. Limite conhecido que permanece: os stores não escutam o evento `storage`, então duas abas abertas continuam divergindo até um reload.

---

## 2026-08-04 — Edição reaproveita o formulário via `key`-remount; estado "em edição" é `useState` de UI, não um store

### Decisão
Toda tela de CRUD que ganhar edição (Fase 2-7: ingredientes, receitas, custos fixos, canais) segue o mesmo padrão: um componente novo `<Feature>Screen.tsx` guarda `editingId` (`useState<string | null>`, estado de UI puro) e renderiza `<XForm key={editingId ?? "new"} editingX={...} onDoneEditing={...} />` ao lado de `<XList editingId={editingId} onEdit={setEditingId} />`. Trocar a `key` do formulário força o React a desmontar/remontar o componente inteiro sempre que `editingId` muda — os `useState` internos do formulário reinicializam a partir das props (item sendo editado, ou vazio para "novo") sem precisar de `useEffect`. O `id` do registro nunca é decidido pelo formulário: em modo criação, `addX` gera um novo; em modo edição, `updateX(id, ...)` sempre sobrescreve o item daquele id, nunca duplica.

### Contexto
Fase 2-7 pedia edição básica reaproveitando o próprio formulário ("botão Editar → preenche o formulário → Salvar alterações → não duplicar"). O jeito mais direto de fazer um formulário "pré-preencher com dados existentes quando a prop mudar" costuma ser um `useEffect` sincronizando a prop para dentro do `useState` local — exatamente o padrão que a Revisão da Fase 2 já tinha identificado como fonte de bugs nesta base (`react-hooks/set-state-in-effect`, e o próprio bug do `Dashboard` corrigido na mesma revisão).

### Motivo
O truque de `key` é o padrão que o próprio React recomenda para "resetar o estado de um componente quando ele passa a representar outra coisa" — trocar a `key` é semanticamente "isto agora é um componente diferente", então a reinicialização dos `useState` a partir das props acontece de graça, sem `useEffect`, sem risco de re-render em cascata, e sem o `editingId` do wrapper precisar saber nada sobre os campos internos do formulário. Manter `editingId` como `useState` comum (não um store reativo) é proposital: é estado de UI local a uma sessão de tela (qual linha estou editando agora), não dado que precisa sobreviver entre navegações ou ser lido por outra feature — usar o padrão de store reativo (pensado para dados persistidos) aqui seria uma categoria errada de abstração.

### Impacto
Técnico: qualquer tela futura com edição (ex.: se a Fase 3 ou além criar edição de ingrediente com sub-receita, ou qualquer outro CRUD) deve seguir o mesmo padrão `Screen` + `key`-remount, não introduzir `useEffect` para sincronizar formulário com item selecionado. Os 4 stores (`ingredients-store.ts`, `recipes-store.ts`, `fixed-costs-store.ts`, `channels-store.ts`) ganharam `updateX(id, dado)` como uma quarta função ao lado de `subscribeX`/`getXSnapshot`/`addX`/`removeX` — o padrão "store reativo por feature" (decisão anterior) agora inclui update como parte do contrato esperado para qualquer fatia com CRUD completo.

---

## 2026-08-05 — Acesso e licenças é a Fase 4, precedida pela Fase 2-8 (backup export/import)

### Decisão
O trabalho de Supabase Auth, acesso e licenças é a **Fase 4 — Acesso e licenças**, conforme a numeração já existente no `TASKS.md` (a Fase 3 continua sendo "Modo avançado": fator de correção, sub-receitas, engenharia de cardápio). Antes de iniciar a Fase 4, será executada a **Fase 2-8 — backup export/import**, usando o `storageService` da Fase 2-1. O planejamento técnico completo da Fase 4 vive em `PLAN-FASE-4.md`.

### Contexto
A fase de acesso foi solicitada como "Fase 3", mas o `TASKS.md` já reservava esse número para o modo avançado — havia risco de duas coisas diferentes carregarem o mesmo rótulo no histórico do projeto. Separadamente, a Fase 2-8 (backup) seguia pendente, e a Fase 4 é a primeira que mexe na fronteira entre dado local e nuvem.

### Motivo
Manter a numeração do `TASKS.md` preserva a rastreabilidade de todo o histórico já registrado (commits, `REVIEW.md`, decisões anteriores) — renumerar retroativamente quebraria as referências cruzadas entre os documentos. Fazer o backup export/import antes do Auth dá à usuária uma rede de segurança sobre os próprios dados **antes** de qualquer mexida em acesso ou persistência: se algo der errado na introdução de login/licença, os dados locais são exportáveis e reimportáveis por conta própria, sem depender de suporte.

### Impacto
Processo: o `TASKS.md` mantém a Fase 3 como "Modo avançado" (agora executada depois da Fase 4, se assim for decidido) e a Fase 4 como "Acesso e licenças", detalhada em `PLAN-FASE-4.md` com 6 subfases (4-1 a 4-6). A Fase 2-8 vira pré-requisito explícito da Fase 4.

---

## 2026-08-05 — Essencial é local-first; nuvem e multidispositivo são exclusivos do Pro

### Decisão
O **Doce Margem Essencial permanece 100% em `localStorage`**, indefinidamente — a Fase 4 (Auth/licenças) **não migra dado nenhum**. Sincronização em nuvem e multidispositivo ficam reservadas ao **Pro Anual**, em fase própria e posterior. Quando a nuvem do Pro for implementada, o padrão previsto é: `localStorage` vira **cache síncrono** (preservando o `getSnapshot()` que `useSyncExternalStore` exige), com hidratação e write-through assíncronos por cima — nunca uma troca direta da implementação do `storageService`.

### Contexto
Ao planejar a Fase 4, a suposição de trabalho era que o `storageService` da Fase 2-1 poderia ter sua implementação trocada por Supabase "por baixo", sem tocar na UI. A revisão do plano mostrou que isso é falso: a API atual é **síncrona** (`loadIngredients(): Ingredient[]`) porque `useSyncExternalStore` exige um `getSnapshot()` síncrono, e Supabase é **assíncrono**. Trocar a implementação mudaria a assinatura de `T` para `Promise<T>` e quebraria os 5 stores e todas as telas. Ou seja: a decisão de 2026-08-04 sobre o `storageService` resolveu **acoplamento**, mas não resolve **sincronia** — este registro corrige esse ponto.

### Motivo
O `README.md` já classificava "Sincronização em nuvem / multi-dispositivo" como recurso **exclusivo do Pro**. Assumir isso explicitamente elimina quase todo o risco da Fase 4: sem migração de dados, login e licença entram *por cima* do app local intacto, e nada do que já funciona pode quebrar. Também é coerente com a decisão comercial de 2026-06-27 (compra única = "acesso vitalício à versão Essencial **atual**"): a nuvem é justamente o tipo de função futura que pertence ao plano anual, não à compra única. O problema sincronia × assincronia fica isolado numa fase futura, com escopo próprio, em vez de contaminar a introdução de Auth.

### Impacto
Técnico: a Fase 4 não toca em `services/storage-service.ts` nem nos 5 stores. A fase de nuvem do Pro (futura) terá que resolver explicitamente o padrão cache-síncrono + hidratação assíncrona, e terá o `backup export/import` (Fase 2-8) como rede de segurança para migração de dados. Produto: a UI do Essencial continua exibindo "seus dados ficam salvos neste navegador" — sem promessa de nuvem.

---

## 2026-08-05 — Feature flags em código, nunca em tabela

### Decisão
As feature flags (o que o Essencial inclui vs. o que é exclusivo do Pro) vivem em **código**, em `lib/features.ts`, com um `Record<FeatureKey, {...}>` tipado e uma única função `canAccessFeature(access, key)`. **Não** haverá tabela `feature_flags` no Supabase. O padrão é **fechado por omissão**: uma chave sem entrada no mapa retorna `false`, nunca `true`.

### Contexto
Uma tabela `feature_flags` foi explicitamente colocada em avaliação no planejamento da Fase 4, ao lado de `profiles`, `licenses` e `license_events`.

### Motivo
Flags aqui são **definição de produto**, não dado por usuária — o mesmo conjunto vale para todo mundo, e só muda quando o produto muda. Em tabela, custariam uma query extra em cada checagem, ficariam fora do controle de versão (mudança sem review nem histórico), perderiam type-safety (`FeatureKey` viraria `string` solta) e — o mais grave — criariam o risco real de alguém marcar um recurso Pro como aberto direto no banco, violando a regra de "não criar recursos Pro abertos por padrão". Em código, o TypeScript garante exaustividade do mapa e toda mudança passa por review e deploy. É o que o `README.md` já definia desde a Fase 0.

### Impacto
Técnico: `lib/features.ts` é um módulo puro (sem I/O), testável isoladamente, no mesmo espírito de `modules/pricing/`. Nenhuma condicional de plano (`if (plan === 'pro')`) deve aparecer espalhada pelo app — só `canAccessFeature`. Adicionar um recurso Pro é uma mudança de código revisada, nunca um `UPDATE` no banco.

---

## 2026-08-05 — Autorização real em DAL + RLS; `proxy.ts` é só checagem otimista

### Decisão
A autorização de verdade acontece em **duas camadas de backend**: um **Data Access Layer** (`lib/auth/dal.ts`, marcado `server-only`) chamado de Server Components / Server Actions / Route Handlers, e **RLS no Postgres** como última linha. O `proxy.ts` (raiz do projeto) faz **apenas checagem otimista** — lê o cookie e redireciona, para UX — e **nunca** é a única defesa. No servidor, usar sempre `supabase.auth.getUser()` (revalida o JWT com o servidor Auth) e **nunca** `getSession()` (só lê o cookie, é forjável).

### Contexto
Planejamento da Fase 4. Em **Next.js 16, `middleware.ts` foi renomeado para `proxy.ts`** — confirmado em `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`. O mesmo documento afirma explicitamente que Proxy _"should not be used as a full session management or authorization solution"_ e _"should not be your only line of defense in protecting your data. The majority of security checks should be performed as close as possible to your data source"_.

### Motivo
A documentação oficial do Next confirma, por conta própria, a regra que o `CLAUDE.md` já exigia desde a Fase 0 ("permissões validadas no backend, não só no frontend"). Proxy roda em toda rota, inclusive em rotas pré-carregadas (prefetch), então consultar banco ali degradaria a performance — daí ele ser otimista por natureza. O DAL com `cache()` do React memoiza a verificação dentro de um mesmo render (várias chamadas viram uma query só) e fica próximo do dado. A RLS cobre o caso em que ambas as camadas de aplicação falhem. Distinguir `getUser()` de `getSession()` é o que separa ter e não ter autenticação: `getSession()` confia num cookie que o cliente controla.

### Impacto
Técnico: o arquivo se chama `proxy.ts`, **não** `middleware.ts` — usar o nome antigo resultaria num arquivo simplesmente ignorado pelo framework, sem erro visível. Rotas protegidas precisam ser **dinâmicas**: hoje as 6 rotas do app são estáticas (`○ Static` no build), e conteúdo estático é gerado no build e compartilhado entre todas as usuárias. Toda revisão de fase deve incluir um grep por `getSession(` no código de servidor.

---

## 2026-08-05 — `licenses` sem policy de escrita para o cliente; revogação por status no backend

### Decisão
A tabela `licenses` **não terá nenhuma policy de INSERT/UPDATE/DELETE para o cliente** — nem para a própria dona da licença. O cliente só faz `SELECT` das próprias linhas. Toda escrita passa por `service_role` (webhooks da Fase 6, admin da Fase 7), que ignora RLS. Reembolso, chargeback e cancelamento revogam acesso alterando `licenses.status` no backend; o efeito é imediato porque o acesso é sempre **calculado na hora** a partir do status, sem cache com TTL. São três gatilhos independentes de revogação: `status ≠ 'active'`, `expires_at` no passado (só `annual_pro`), e `profiles.is_blocked = true` (bloqueio manual, mata tudo).

### Contexto
Planejamento da Fase 4, definição do modelo de licenças e das políticas de RLS.

### Motivo
Se a usuária pudesse dar `INSERT` em `licenses`, ela se concederia Pro vitalício com uma linha de SQL — esta política sustenta o modelo comercial inteiro. Calcular o acesso a cada verificação (em vez de persistir um campo tipo `has_pro`) garante que um reembolso tenha efeito imediato, sem precisar invalidar sessão nem esperar cache expirar; é o mesmo princípio de "nunca persistir valor derivado" já adotado para `fixedCostRate` e custo de receita (decisões de 2026-08-04). Ter três gatilhos separados evita misturar as regras de compra única e assinatura: `expires_at` só se aplica ao Pro, enquanto `status` e `is_blocked` valem para os dois.

### Impacto
Técnico: `has_essential_access(uid)` e `has_pro_access(uid)` existirão como funções `SECURITY DEFINER` em SQL (com `SET search_path = public`), para que as tabelas de dados do Pro na nuvem possam referenciá-las direto na policy. A mesma regra passa a existir em dois lugares — TypeScript (DAL) e SQL — com risco de divergirem; mitigação obrigatória é uma matriz de casos verificada contra as duas implementações. `profiles.is_blocked` também não pode ser editável pelo cliente (a policy de UPDATE do próprio perfil permitiria a usuária se desbloquear) — resolver com tabela separada só-service_role ou trigger de rejeição, decidir na Fase 4-1.

---

## 2026-08-05 — Compra única e Pro Anual coexistem; Pro é superset do Essencial; sem plano mensal

### Decisão
Uma mesma usuária pode ter as **duas licenças ativas ao mesmo tempo** (`one_time` + `annual_pro`). Portanto o acesso é **agregado sobre todas as licenças** da usuária, nunca derivado de "a licença". **Pro é superset do Essencial**: `hasPro ⟹ hasEssential`. Quando um Pro Anual vence, o Essencial permanece se houver uma `one_time` ativa. Reafirmado: **não existirá plano mensal** em código, copy ou banco.

### Contexto
Planejamento da Fase 4, modelagem de `UserAccess` e das funções de acesso. O `README.md` já descrevia as regras de licença, mas não deixava explícito o caso de as duas coexistirem.

### Motivo
É um cenário comercial real e desejável: quem comprou o Essencial pode assinar o Pro depois, sem perder a compra única (que é vitalícia por definição — decisão de 2026-06-27). Modelar acesso como agregação evita a armadilha de escolher "a licença principal" e ter que decidir desempate. Pro ser superset do Essencial é o que a tabela de recursos do `README.md` já indica (todos os itens do Essencial aparecem marcados também no Pro), e evita o absurdo de uma assinante Pro perder acesso a ingredientes por não ter comprado o Essencial separadamente. A proibição de plano mensal segue a decisão comercial de 2026-06-27.

### Impacto
Técnico: `UserAccess` expõe `hasEssential` e `hasPro` como booleanos independentes mais um `plan` (maior plano ativo), calculados varrendo todas as licenças. As funções SQL seguem a mesma lógica: `has_essential_access` retorna verdadeiro para `one_time` ativa **OU** `annual_pro` ativa. A matriz de teste do risco de divergência TS×SQL precisa incluir explicitamente o caso "one_time + annual_pro simultâneas" e o caso "pro vencido com one_time ativa".

---

## 2026-08-05 — Backup manual usa wrapper com metadados e restaura o AppState completo

### Decisão
A Fase 2-8 exporta um JSON com metadados (`appName: "Doce Margem"`, `backupVersion`, `exportedAt`, `schemaVersion`, `updatedAt`) e o `AppState` completo em `data`. A importação aceita apenas backups identificados como Doce Margem, valida formato e versão, normaliza o estado com a mesma função segura do `storageService` (`normalizeAppState`) e salva o `AppState` inteiro uma única vez. Depois do save, os stores reativos das cinco fatias (`ingredients`, `recipes`, `fixedCosts`, `customChannels`, `businessSettings`) são recarregados a partir do storage para atualizar a interface imediatamente.

### Contexto
Antes de iniciar Supabase/Auth, a usuária precisa de uma rede de segurança para dados locais. O app já tinha stores com cache de módulo; salvar diretamente no `storageService` sem avisar esses stores deixaria a tela aberta mostrando dados antigos até recarregar a página.

### Motivo
O wrapper evita importar um JSON qualquer como se fosse dado do app. Validar `schemaVersion` antes de normalizar impede que um backup de versão incompatível seja silenciosamente convertido para estado vazio. Usar `normalizeAppState` preserva a compatibilidade já existente com dados parciais ou antigos (arrays ausentes e `businessSettings` ausente viram padrões seguros) sem duplicar regra. Salvar o estado completo uma vez evita writes parciais por fatia e mantém a importação como operação de substituição explícita.

### Impacto
Técnico: `services/backup-service.ts` é a camada de serialização/validação de backup; a UI continua sem acessar `localStorage` diretamente. Os stores ganharam funções `reload*FromStorage()` para cenários de restauração completa. A Fase 2-8 não cria Supabase, Auth, webhooks ou admin, e não toca em `modules/pricing/`.

---

## 2026-08-05 — Campos que decidem acesso ficam fora de `profiles`; RLS não basta, precisa de privilégio por coluna

### Decisão
Nenhum campo que decide acesso mora numa tabela que a usuária pode editar. `is_blocked` **não** é coluna de `profiles`: vive em `public.user_access_flags`, tabela com RLS habilitado e **nenhuma policy de escrita** — só `service_role` grava. Em `profiles`, o acesso de escrita do cliente é restrito por **privilégio de coluna** (`revoke all` + `grant update (full_name)`), e um trigger `before update` rejeita alteração de `id`/`email` para quem não é `service_role`. As três funções da migration (`set_updated_at`, `profiles_guard_immutable_columns`, `handle_new_user`) fixam `set search_path = ''` com todo identificador qualificado.

### Contexto
Fase 4-1A. O `PLAN-FASE-4.md` tinha identificado o furo ao desenhar a RLS: a policy "a usuária edita o próprio perfil" (necessária, porque ela muda o próprio nome) abriria **todas** as colunas daquela linha. Se `is_blocked` estivesse em `profiles`, a usuária bloqueada se desbloquearia com um `update` no próprio registro — exatamente o que o bloqueio manual precisa impedir. O plano deixou duas saídas em aberto (trigger de rejeição × tabela separada) para decidir na implementação.

### Motivo
A raiz do problema é uma propriedade da RLS que é fácil esquecer: **policies controlam quais LINHAS, não quais COLUNAS**. `USING`/`WITH CHECK` respondem "esta linha é sua?", nunca "você pode mexer nesta coluna?". Então uma policy de update correta ainda deixa a usuária alterar qualquer campo da linha dela.

Escolhida a tabela separada (opção b do plano) porque transforma a regra em algo trivial de auditar e difícil de furar por acidente: "`user_access_flags` não tem policy de escrita, ponto" é verificável de relance, enquanto um trigger que inspeciona colunas exige ler a lógica toda para confiar. Some-se que a mesma forma será reusada em `licenses` na Fase 4-2 (também read-only para o cliente) — vira um padrão só, não dois.

O privilégio por coluna foi adicionado porque a tabela separada resolve `is_blocked`, mas não resolve `email`: sem `grant update (full_name)`, a usuária ainda poderia alterar `profiles.email` e dessincronizar do `auth.users`. E o trigger de imutabilidade entrou como terceira camada por um motivo específico: um `grant update on profiles to authenticated` amplo numa migration futura reabriria o furo **silenciosamente**; o trigger falha alto. Já o `search_path = ''` fecha o vetor clássico de `security definer` (sequestro de resolução de nome por schema malicioso).

### Impacto
Técnico: qualquer campo futuro que influencie acesso (flags de fraude, limites de uso, marcações de risco) vai para `user_access_flags` ou tabela equivalente sem policy de escrita — **nunca** para `profiles`. Toda tabela nova cuja escrita deva ser exclusiva do backend segue esta forma: RLS ligado + policy de `select` do próprio + ausência deliberada de policies de escrita. Ao adicionar colunas a `profiles`, lembrar que o `grant update` é **por coluna** — uma coluna nova nasce não-atualizável pelo cliente, que é o padrão seguro desejado. Limitação conhecida: trocar o e-mail via Supabase Auth não atualiza `profiles.email` (o trigger só roda no `insert`); se a UI oferecer troca de e-mail, será preciso um trigger de `update` em `auth.users`.

---

## 2026-08-05 — Auth roda inteiro em Server Actions; o cliente recebe só um booleano de sessão

### Decisão
Cadastro, login e logout são **Server Actions** (`app/auth/actions.ts`), não chamadas a partir do browser. A Fase 4-1B **não cria um client Supabase de browser** — só `services/supabase/server.ts`, marcado com `import "server-only"`. Quem resolve a sessão é o layout (Server Component), via `getUser()`, e ele passa ao `Header` **apenas um booleano** (`isAuthenticated`) — nunca o token, nunca o objeto de usuária. O tipo e o estado inicial do formulário moram em `components/auth/form-state.ts`, fora do módulo `"use server"`.

### Contexto
Fase 4-1B. A lista de arquivos sugerida incluía um `services/supabase/browser.ts`, e havia a opção de fazer login pelo browser client (`supabase.auth.signInWithPassword` no cliente), que é o caminho mais divulgado em tutoriais.

### Motivo
Com Server Actions, a senha viaja em `FormData` direto para o servidor e os cookies de sessão são gravados server-side pelo `@supabase/ssr` — nenhum código nosso de cliente toca credencial, e o token não fica exposto a JavaScript da página. Criar o browser client agora seria código morto: nenhum caminho desta fase o usaria. Ele entra quando houver leitura client-side de dados (fase de nuvem do Pro) ou necessidade de `onAuthStateChange`.

Passar só um booleano ao `Header` fecha uma porta silenciosa: se o componente de cliente recebesse o objeto de usuária, esse objeto iria inteiro para o payload de hidratação, no HTML. Um booleano não vaza nada, e a distinção fica explícita — o Header decide **o que exibir**, nunca **o que autorizar**; autorização continua no servidor, em cada rota.

O `form-state.ts` separado não é preferência de organização, é obrigação do framework: um arquivo `"use server"` **só pode exportar funções async**, e exportar o objeto `initialAuthFormState` de lá quebra o build com "A 'use server' file can only export async functions, found object". Erro que nem `typecheck` nem `lint` pegam — só o `build`.

### Impacto
Técnico: fases futuras que precisarem de dados de sessão em Client Components devem receber props derivadas do servidor, não o objeto de sessão. Ao criar o browser client (fase de nuvem do Pro), ele fica em arquivo próprio e **sem** `server-only`, e não substitui as Server Actions de auth. Todo módulo `"use server"` do projeto deve exportar exclusivamente funções async — constantes e tipos compartilhados vão para um módulo neutro ao lado. `npm run build` permanece obrigatório no gate de cada fase: foi o único dos três comandos que detectou esse erro.

---

## 2026-08-05 — Mensagem genérica no login, com uma exceção: e-mail não confirmado

### Decisão
Falha de login mostra a mensagem genérica **"E-mail ou senha inválidos."**, para não permitir enumeração de e-mail. **Uma única exceção:** quando o Supabase devolve `email_not_confirmed`, a tela diz explicitamente que falta confirmar o e-mail e orienta a procurar a mensagem enviada. Erro de limite de tentativas (429) também ganha mensagem própria ("espere alguns segundos"), em vez de cair no genérico.

### Contexto
Fase 4-1B. Testando contra o Supabase real do projeto, descobri que **a confirmação de e-mail está ligada** e que a API distingue `email_not_confirmed` de `invalid_credentials`. A primeira versão do código mapeava todos os erros de login para a mensagem genérica.

### Motivo
A regra "nunca revele se o e-mail existe" é boa por padrão, mas aplicada sem exceção produz um resultado ruim aqui: quem se cadastrou, não confirmou e tenta entrar recebe "senha inválida" e vai caçar um problema que não existe — provavelmente redefinindo a senha, o que também não resolve. Para um público de confeiteiras não-técnicas, isso vira chamado de suporte e possivelmente conta abandonada.

O vazamento dessa exceção é pequeno e delimitado: revela que existe um cadastro **pendente de confirmação** para aquele endereço — não confirma conta ativa, e só aparece para quem já digitou a senha certa daquele cadastro. É um trade-off consciente entre segurança e clareza, resolvido caso a caso em vez de por regra cega.

### Impacto
Produto: a copy do cadastro assume confirmação de e-mail **ligada**. Se essa configuração for desligada no painel do Supabase, a mensagem "Confira seu e-mail" fica errada e precisa ser revista junto — a decisão de manter ou não a confirmação está registrada como pendência na Fase 4-1C. Técnico: `isEmailNotConfirmedError` checa `error.code` **e**, como reserva, o texto da mensagem — o campo `code` foi adicionado ao `AuthError` do supabase-js depois, e depender só dele quebraria em versões mais antigas. Fluxos futuros de erro de auth (recuperação de senha, troca de e-mail) devem seguir o mesmo critério: genérico por padrão, específico só quando o silêncio prejudicar mais do que protege.

---

## 2026-08-05 — Auditoria de licenças sobrevive à exclusão de conta e é imutável a UPDATE

### Decisão
As chaves estrangeiras de `license_events` usam **`ON DELETE SET NULL`**, não `CASCADE`: apagar uma conta ou uma licença **não** apaga o histórico — o evento fica órfão e anonimizado. Um trigger bloqueia **`UPDATE` para todos**, inclusive `service_role`; corrigir um registro errado se faz **inserindo um evento corretivo**. `DELETE` fica liberado apenas para os papéis administrativos, para atender pedido de apagamento de dados (LGPD), já que `payload` pode conter dados pessoais vindos do provedor de pagamento. O `event_type` tem vocabulário **fechado por CHECK** (8 valores).

### Contexto
Fase 4-2A, criação de `licenses` e `license_events`. Minha primeira versão usava `ON DELETE CASCADE` nas FKs (por simetria com `profiles`/`user_access_flags`, onde cascade é correto) e deixava `event_type` como texto livre, argumentando que um evento novo não deveria exigir migration.

### Motivo
Cascade estava errado aqui, e a diferença é de propósito da tabela: `user_access_flags` é **estado atual** — sem a conta, não há estado a guardar. `license_events` é **evidência** — e é justamente quando a conta some que a evidência mais importa. Numa disputa de chargeback, meses depois, a pergunta é "esta pessoa realmente comprou, e quando foi reembolsada?"; se apagar a conta apagou o histórico, não há o que responder. `SET NULL` preserva o fato e descarta o vínculo pessoal, o que também ajuda em privacidade.

Bloquear `UPDATE` até para `service_role` é o que separa um log de auditoria de uma tabela comum: um histórico que o próprio sistema pode reescrever silenciosamente não prova nada. É a mesma regra que este projeto já segue em documentação ("nunca remova decisões antigas; registre uma nova entrada"). O `DELETE` administrativo permanece porque obrigação legal de apagamento se sobrepõe à conveniência de auditoria — e, diferente do `UPDATE`, é uma ação explícita e rastreável fora do banco.

O `CHECK` em `event_type` inverteu meu raciocínio inicial: numa tabela de auditoria, texto livre significa que um typo (`'refund'` em vez de `'refunded'`) cria um registro que nenhuma consulta encontra — o dado existe mas é invisível, que é o pior modo de falha para auditoria. Um vocabulário novo é uma extensão deliberada e merece passar por migration.

### Impacto
Técnico: `license_events.user_id` e `license_id` são **nullable** (exigência do `SET NULL`), então consultas precisam tratar eventos órfãos; a policy de RLS (`auth.uid() = user_id`) faz com que eventos órfãos não sejam visíveis a nenhum cliente — só via `service_role`. Adicionar um `event_type` novo na Fase 6/7 exige migration alterando o `CHECK`. Como não há trigger em `licenses` gerando eventos automaticamente, **a Fase 6 é responsável por registrar cada mudança de status** — se o webhook esquecer, a mudança acontece sem auditoria; avaliar lá se um trigger de log automático deve entrar.

---

## 2026-08-05 — Vencimento de licença é calculado por `expires_at`, nunca pelo status

### Decisão
As funções de acesso decidem vencimento comparando **`expires_at > now()`**. O valor `status = 'expired'` existe como conveniência de registro, mas **não** é o que revoga: uma licença `annual_pro` vencida que continue com `status = 'active'` (porque nenhum job rodou) **não** concede Pro. Constraints garantem coerência na origem: `annual_pro` exige `expires_at` preenchido, `one_time` exige `expires_at` nulo.

### Contexto
Fase 4-2A. O modelo tem dois jeitos de expressar "esta assinatura acabou": mudar `status` para `expired` ou deixar `expires_at` no passado. Ter os dois cria a pergunta de qual manda.

### Motivo
Depender de `status = 'expired'` exigiria que algo — job agendado, webhook, cron — rodasse na hora certa para marcar cada licença vencida. Todo esse maquinário é uma peça a mais que pode falhar silenciosamente, e o modo de falha é o pior possível: **acesso concedido a quem não pagou**. Comparar com `now()` não depende de nada rodar: a verdade é derivada do dado, sempre atual, e a falha é fechada. É o mesmo princípio já adotado para `fixedCostRate` e custo de receita (2026-08-04): não persistir valor derivado, para que ele não fique obsoleto.

Caso-limite coberto por constraint em vez de lógica: `annual_pro` com `expires_at` nulo é impossível (`licenses_annual_needs_expiry`). Se ainda assim ocorresse, `NULL > now()` avalia como desconhecido e a licença é excluída do resultado — falha fechada também aí.

### Impacto
Técnico: um job de expiração (se existir no futuro) é **cosmético** — serve para relatório e para a usuária ver "assinatura vencida" na tela, nunca para revogar acesso. O DAL da Fase 4-3 deve replicar exatamente esta regra em TypeScript, e a matriz de 10 casos registrada no `REVIEW.md` da 4-2A é o instrumento para provar que as duas implementações não divergem (risco #6 do `PLAN-FASE-4.md`). Comercial: quem tem compra única mantém o Essencial quando o Pro vence — os dois gatilhos são independentes.

---

## 2026-08-05 — Função exposta ao cliente não recebe identificador de usuária como parâmetro

### Decisão
Toda função SQL que responda sobre acesso existe em **duas camadas**. As **internas** recebem `uid uuid` e têm `EXECUTE` revogado de `public`, `anon` e `authenticated` — restam para `service_role` (admin, Fase 7) e para serem chamadas por dentro das expostas. As **expostas** não recebem parâmetro nenhum, resolvem `auth.uid()` internamente e devolvem `false` quando ele é nulo: `current_user_has_pro_access()` e `current_user_has_essential_access()`. Só as expostas recebem `EXECUTE` para `authenticated`; `anon` não recebe nenhuma. Policies de RLS de tabelas futuras devem usar as expostas.

### Contexto
Fase 4-2A. A primeira versão seguiu a assinatura `has_pro_access(uid uuid)` prevista no `PLAN-FASE-4.md` e concedia `EXECUTE` a `authenticated`, porque policies de RLS são avaliadas com os privilégios de quem faz a consulta. Ao revisar, levantei que isso permitia a qualquer usuária logada perguntar "o UUID fulano tem Pro?" — vazamento lateral de informação.

### Motivo
O risco prático era baixo: seria preciso conhecer o UUID de outra pessoa, e a RLS de `profiles` impede descobri-lo pelo app. Mas era uma superfície gratuita — a mesma regra de negócio é entregável sem ela. Uma função sem parâmetro **não tem como** responder sobre terceiros: a restrição passa a ser estrutural, não uma convenção de "sempre passe `auth.uid()`" que alguém esquece numa fase futura.

Manter as parametrizadas (em vez de deletá-las) preserva o que o admin da Fase 7 vai precisar — consultar o acesso de uma cliente específica ao investigar um chamado — sem reabrir a porta para o cliente comum. A cadeia funciona porque, dentro de uma função `SECURITY DEFINER`, o papel efetivo é o da dona da função, não o de quem chamou: revogar `EXECUTE` das internas não impede as expostas de chamá-las.

Dois detalhes que parecem pedantes e não são: (a) o `REVOKE` inclui `public`, porque o Postgres concede `EXECUTE` a `PUBLIC` por padrão em toda função nova — revogar só de `anon`/`authenticated` deixaria a porta aberta pelo default; (b) a checagem `auth.uid() is null → false` é explícita em vez de delegar para a função interna, para que o comportamento em sessão anônima seja uma decisão declarada e não uma consequência acidental de `EXISTS` com `NULL`.

### Impacto
Técnico: o exemplo de policy do `PLAN-FASE-4.md` (`using (... has_pro_access(auth.uid()))`) **deixou de funcionar** e foi corrigido nos dois pontos onde aparecia — a forma válida é `using (user_id = (select auth.uid()) and public.current_user_has_pro_access())`. O DAL da Fase 4-3 deve chamar as expostas. Qualquer função de acesso criada daqui em diante segue a mesma regra: se o cliente vai chamar, não recebe identificador por parâmetro. A validação da Fase 4-2B ganhou um caso: provar que `authenticated` **falha** ao chamar a parametrizada e **consegue** chamar a exposta.

---

## 2026-08-06 — O DAL não recebe identidade por parâmetro, e reaplica a regra de bloqueio que o SQL já faz

### Decisão
Nenhuma função de `lib/auth/dal.ts` recebe `userId` — a identidade vem sempre de `getAuthUser()` (que usa `supabase.auth.getUser()` e revalida o JWT). O DAL chama **apenas** as RPCs sem parâmetro (`current_user_has_*`) e **não filtra por `user_id`** nas consultas a tabela: quem restringe é a RLS. Além disso, o DAL **reaplica** a regra de bloqueio em TypeScript (`hasX && !isBlocked`), mesmo as funções SQL já a aplicando. Falhas de qualquer natureza devolvem `ANONYMOUS_ACCESS` — nunca lançam.

### Contexto
Fase 4-3A, criação da camada de acesso que a Fase 4-5 vai usar para gating. Havia três escolhas em aberto: aceitar `userId` como parâmetro (conveniente para reuso e para o admin da Fase 7), filtrar por `user_id` nas queries além da RLS (defesa em profundidade aparente), e confiar no SQL para o bloqueio (evitando duplicar regra).

### Motivo
**Sem parâmetro de identidade:** uma assinatura que aceita `userId` transfere para cada chamador a responsabilidade de passar o valor certo. Basta uma rota futura repassar um id vindo de query string para virar IDOR. Sem parâmetro, o erro não é possível — a restrição é estrutural, não uma convenção que alguém esquece. Quando o admin (Fase 7) precisar consultar terceiros, faz isso por um caminho próprio com `service_role`, explicitamente separado.

**Sem filtro redundante de `user_id`:** parece defesa em profundidade, mas é o contrário. Se a RLS estiver quebrada, o filtro no código esconde o problema — o app funciona e ninguém descobre até alguém consultar por outro caminho. Sem o filtro, uma RLS quebrada aparece imediatamente. A proteção deve morar em um lugar identificável, e esse lugar é o banco.

**Com bloqueio reaplicado:** aqui a duplicação vale, porque as duas implementações erram para o **mesmo lado**. Se alguém alterar a função SQL e esquecer do `is_blocked`, o TypeScript ainda nega o acesso; a falha é restritiva, não permissiva. É diferente do caso anterior: filtro de `user_id` duplicado mascara falha, checagem de bloqueio duplicada só endurece.

**Falha fechada por comparação estrita:** `resultado.data === true` em vez de truthiness. Erro de RPC devolve `data: null`, e `null === true` é `false` — o tratamento de erro vira consequência do tipo, sem `if (error)` que alguém possa esquecer.

### Impacto
Técnico: o gating da Fase 4-5 (`requireEssentialAccess`, `requireProAccess`) deve ser construído sobre `getCurrentUserAccess()` e herdar a mesma assinatura sem parâmetro. `getCurrentUserAccess` é memoizado com `cache()` do React: várias chamadas no mesmo render viram uma consulta, mas o cache **não** atravessa requisições — uma licença revogada aparece na requisição seguinte, preservando a decisão de 2026-08-05 de nunca persistir acesso calculado. Custo conhecido: são 5 consultas por render (perfil, flags, duas RPCs e a licença Pro para exibir vencimento); se virar gargalo, o caminho é uma única função SQL que devolva tudo, não cache mais longo. `ProductType`/`LicenseStatus` em `types/access.ts` duplicam o vocabulário dos `CHECK` da migration 0002 — mantê-los em sincronia é responsabilidade de quem alterar qualquer um dos dois.
