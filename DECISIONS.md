# DECISIONS — Minha Fatia

> **Marca atual:** Minha Fatia. Entradas anteriores a 2026-08-09 podem citar Doce Margem, o nome anterior do projeto; esses registros históricos permanecem válidos e identificadores técnicos legados continuam preservados quando a troca poderia quebrar compatibilidade.

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

---

## 2026-08-06 — Tier comercial e disponibilidade são dimensões separadas na matriz de recursos

### Decisão
Cada recurso em `lib/features.ts` carrega **dois campos independentes**: `minimumPlan` (a que plano pertence — `authenticated` | `essential` | `pro_annual`) e `status` (`available` | `planned`, se já existe na interface). `canAccessFeature` decide **apenas** por `minimumPlan`; `status` é informativo. A matriz é um `Record<FeatureKey, FeatureDefinition>`, o que faz o TypeScript exigir exaustividade. Foi acrescentado o nível `"authenticated"`, fora da especificação original, exclusivamente para `account`.

### Contexto
Fase 4-4A. A especificação da fase listou "Recursos **Pro ou futuros**" num bloco único, incluindo modo avançado, sub-receitas e medidas caseiras — que o `README.md` (a especificação viva, por definição do `CLAUDE.md`) classifica como **Essencial** na tabela de planos ("Modo simples + avançado básico", ✅ nas duas colunas). Havia também o caso de `account`, que não cabia em nenhum dos dois planos previstos.

### Motivo
O conflito aparente se dissolve quando se percebe que a lista da especificação agrupava por **disponibilidade** ("ainda não dá para usar"), não por **tier comercial** — a própria especificação pedia `status: "planned"` para sub-receitas e medidas caseiras justamente porque o motor existe e a interface não. São perguntas diferentes: "de quem é este recurso?" e "ele já existe?". Misturá-las num campo só forçaria a mentir numa das duas — ou marcar como Pro algo que o README promete no Essencial, ou marcar como disponível algo que não existe.

Manter `status` fora do gating é o que permite a página de preços (Fase 4-6) sair desta mesma matriz sem duplicação: ela precisa dizer "o Pro terá engenharia de cardápio" — o recurso responde pelo plano dele mesmo antes de existir.

O nível `"authenticated"` resolve um erro que apareceria na Fase 4-5: `/conta` classificada como `essential` trancaria a tela para quem está logada sem licença — exatamente quem precisa chegar lá para ver "Sem licença ativa" e comprar. O custo é um membro a mais na união; o benefício é não construir uma armadilha para o próprio funil de venda.

O `Record` em vez de array não é estética: com ele, adicionar uma chave a `FeatureKey` sem classificar o recurso **quebra o build**. Nenhum recurso consegue nascer sem plano definido — que é a forma estrutural da regra "não criar recursos Pro abertos por padrão".

### Impacto
Técnico: a Fase 4-5 constrói o gating chamando `canAccessFeature`, sem reimplementar regra; a Fase 4-6 monta `/precos` a partir de `ALL_FEATURES`, usando `status` para os selos "em breve". Recurso novo exige tocar em `FeatureKey` **e** na matriz — o compilador cobra. Produto: a classificação de `advanced_mode`, `sub_recipes` e `household_measures` como Essencial foi levada à decisão e **confirmada em 2026-08-06** (entrada seguinte).

---

## 2026-08-06 — O "avançado básico" é Essencial; o Pro Anual é recorrência, nuvem, automação, IA e relatórios

### Decisão
`advanced_mode`, `sub_recipes` e `household_measures` ficam como **Essencial / planned** — não são recursos Pro. O Pro Anual fica reservado a cinco eixos: **recorrência, nuvem, automação, IA e relatórios**. Concretamente: `menu_engineering`, `price_history`, `cloud_sync`, `pdf_export` e `ai_scanner`.

Matriz aprovada, congelada em `MATRIZ_APROVADA` (`lib/features-examples.ts`):

| Plano / Status | Recursos |
|---|---|
| `essential` / `available` | ingredients, recipes, fixed_costs, custom_channels, pricing, backup_export_import |
| `authenticated` / `available` | account |
| `essential` / `planned` | advanced_mode, sub_recipes, household_measures |
| `pro_annual` / `planned` | menu_engineering, price_history, cloud_sync, pdf_export, ai_scanner |

### Contexto
A especificação da Fase 4-4A agrupou os três recursos sob "Pro ou futuros", enquanto a tabela de planos do `README.md` — a especificação viva — promete "Modo simples + avançado **básico**" nas duas colunas, e a linha 178 detalha que é dentro do modo avançado que vivem sub-receitas e medidas caseiras. A divergência foi apontada no fim da 4-4A e levada à decisão.

### Motivo
Esses três compõem o "avançado básico" do Essencial e **já existem no motor de cálculo desde a Fase 1B** — falta apenas a interface. Cobrar Pro por algo que a promessa pública já inclui, e que o produto já sabe calcular, seria retirar da oferta o que foi anunciado: exatamente o tipo de divergência que vira reclamação de quem comprou a licença vitalícia.

O critério do Pro passa a ser **estrutural, não caso a caso**: recorrência, nuvem, automação, IA e relatórios. Esses eixos têm custo marginal contínuo (servidor, chamada de modelo, sincronização) — é o que justifica cobrança anual, coerente com a decisão de 2026-06-27 de não existir plano mensal e de a compra única ser vitalícia sobre o Essencial **atual**. Recurso que não cai em nenhum dos cinco eixos pertence ao Essencial, e a régua está escrita no comentário da seção Pro em `lib/features.ts`.

Confirmar o README também evita ter que reescrever a tabela pública de planos, de onde a página `/precos` da Fase 4-6 será gerada: código e material comercial permanecem dizendo a mesma coisa.

### Impacto
Técnico: nenhuma mudança de classificação foi necessária — o código da 4-4A já estava assim. Acrescentou-se `MATRIZ_APROVADA` em `lib/features-examples.ts`, um `Record<FeatureKey, …>` congelado que faz **qualquer reclassificação futura quebrar a validação isolada**. Mover um recurso de plano deixa de ser edição silenciosa e passa a exigir alterar dois lugares e registrar nova decisão aqui — que é o comportamento desejado, já que classificação é decisão comercial, não detalhe de implementação.

Produto: a Fase 3 (modo avançado na interface) continua sendo entrega do Essencial, sem gating. O `README.md` **não precisa de alteração** — a decisão o confirma.

---

## 2026-08-06 — Bloqueio derruba licença, não a tela de conta

### Decisão
`requireAuthenticatedAccess()` exige **apenas sessão válida**: não barra conta bloqueada nem conta sem licença. O bloqueio é verificado em `requireEssentialAccess()` e `requireProAccess()`. `/conta` usa o primeiro, e por isso permanece acessível a quem está bloqueada ou sem licença.

Pelo mesmo princípio, `/acesso-bloqueado` **não tem guarda nenhum** e nunca redireciona: ela cobre os cinco estados possíveis e sempre renderiza.

### Contexto
Fase 4-5A. A especificação da fase dizia "`isBlocked === true` bloqueia tudo" e, ao mesmo tempo, "`requireAuthenticatedAccess()` exige apenas login". A implementação literal da primeira frase no guarda de autenticação criaria um beco sem saída.

### Motivo
Se o guarda de autenticação barrasse conta bloqueada, `/conta` mandaria a usuária para `/acesso-bloqueado`, cujo botão principal leva de volta a `/conta`. A pessoa bloqueada ficaria sem nenhuma tela onde ver o próprio status ou sair da conta — exatamente quem mais precisa dessas duas coisas. O mesmo vale para quem está logada sem licença: é em `/conta` que ela descobre que precisa comprar.

"Bloqueio derruba tudo" significa **derruba toda licença** — compra única e Pro, sem exceção, e isso continua valendo nos três níveis (SQL, DAL e guardas). Não significa derrubar a identidade: a sessão continua válida, e as telas de gestão da própria conta continuam sendo o destino de quem foi barrado. É a mesma leitura que produziu `minimumPlan: "authenticated"` para `account` na Fase 4-4A.

Uma página que existe para explicar uma negativa não pode ela mesma negar — daí `/acesso-bloqueado` não ter guarda. E o motivo exibido é recalculado pelo DAL, nunca lido da URL: um `?motivo=` é escrito por qualquer pessoa e mostraria à usuária um diagnóstico falso sobre a própria conta.

### Impacto
Técnico: telas de gestão de conta usam `requireAuthenticatedAccess()`; telas de produto usarão `requireEssentialAccess()` / `requireProAccess()` na Fase 4-5B. `/acesso-bloqueado` e `/login` nunca devem ganhar guarda de licença, sob pena de recriar o ciclo. O CTA "Voltar ao painel" da tela de bloqueio está condicionado a `hasEssential` pela mesma razão preventiva.

Segurança: nenhum afrouxamento. Os guardas de licença checam `isBlocked` de novo, além de o SQL e o DAL já descontarem — as três camadas erram para o mesmo lado. Nenhuma função de acesso recebe `userId`, e `require-access.ts` não importa `services/supabase/*`: o ponto único de consulta continua sendo o DAL.

### Pendência que esta decisão expõe
Os guardas falham fechado quando o Supabase não está configurado (`ANONYMOUS_ACCESS`). Aplicá-los às telas locais na Fase 4-5B tornaria o app inutilizável sem Supabase, contrariando a decisão de 2026-08-05 de o Essencial ser local-first. **Isso precisa de decisão de produto antes da 4-5B** (registrado no `REVIEW.md`); afrouxar o guarda para liberar quando falta configuração está descartado — transformaria variável de ambiente ausente em bypass de licença.

> ✅ **Resolvido na entrada seguinte, de 2026-08-06:** não existe bypass. O app falha fechado.

---

## 2026-08-06 — Não existe bypass por ausência de Supabase; "local-first" vale para os dados, não para a entrada

### Decisão
Se o Supabase estiver ausente, mal configurado ou fora do ar, o app **falha fechado**: as telas do Essencial redirecionam para `/login`. Não há, e não deve haver, nenhum caminho em que a falta de configuração libere acesso.

`requireEssentialAccess()` passa a valer em `/`, `/ingredientes`, `/receitas`, `/configuracoes` e `/precificacao`. Permanecem públicas `/login`, `/cadastro`, `/conta`, `/acesso-bloqueado` e `/auth/callback` — e as duas últimas **nunca podem ganhar guarda de licença**, sob pena de recriar o ciclo fechado na entrada anterior.

### Contexto
Fase 4-5B. A Fase 4-5A levantou a colisão: os guardas falham fechado, e a decisão de 2026-08-05 dizia que o Essencial é local-first e deve continuar funcionando sem Supabase. Aplicar o gating às telas locais tornaria o app inacessível num ambiente sem env configurada.

### Motivo
A alternativa — liberar quando falta configuração — transformaria **uma variável de ambiente esquecida na Vercel em licença grátis para todo mundo**, silenciosamente e sem erro visível. Um deploy com env faltando não avisa; ele simplesmente serve o app aberto. Nenhum ganho de conveniência em desenvolvimento paga esse risco em produção.

A colisão com 2026-08-05 é aparente, e desfaz-se separando **onde o dado mora** de **quem pode entrar**. "Local-first" continua valendo integralmente no sentido em que foi decidido: os dados da usuária seguem em `localStorage`, a Fase 4 não migra nada, o `storageService` não é tocado, e o app funciona offline depois de autenticado. O que muda é que **a porta passa a ser verificada** — e verificar licença é justamente o que a Fase 4 existe para fazer. Um app cuja licença só vale quando o servidor de licença está no ar não tem licença nenhuma.

### Impacto
Técnico: cinco páginas viraram `async` e chamam o guarda como primeira instrução. O guarda está **repetido em cinco arquivos** — explícito, mas com o custo de que tela nova nasce desprotegida por omissão, sem quebrar o build. Route Groups com o guarda no layout do grupo são a correção prevista (Fase 4-5C). O gating usa `requireEssentialAccess()`, nunca `canAccessFeature` — a matriz da Fase 4-4A descreve planos, os guardas aplicam; misturar os dois espalharia a decisão de acesso por dois lugares.

Produto: **`/` deixou de ser pública**, e com isso o app perdeu qualquer vitrine — quem abre o domínio cai em `/login`. Isso precisa ser endereçado no desenho da Fase 4-6: a `/precos` tem que nascer pública, e provavelmente `/` deveria voltar a ser landing com o painel movido para outra rota. O `Header` também passou a exibir para visitante cinco links que rebatem para `/login`; corrigir exige passar o acesso do layout para o componente, o que ficou fora do escopo desta fase.

Ambiente de desenvolvimento: rodar o app sem `.env.local` deixa de ser possível para as telas do Essencial. É consequência aceita — o custo recai sobre quem desenvolve, não sobre a proteção do produto.

---

## 2026-08-06 — `/precos` é a vitrine pública; `/` permanece protegida

### Decisão
`/precos` é pública e não usa nenhum guarda de licença. `/` continua sendo o painel protegido por `requireEssentialAccess()`; não será transformada em landing nem movida nesta etapa.

Visitantes veem no Header somente `Preços`, `Entrar` e `Criar conta`. Usuárias logadas mantêm a navegação do app e `Conta`, sem necessidade de exibir `Preços`.

Os CTAs de compra são configurados exclusivamente por `NEXT_PUBLIC_BUY_ESSENTIAL_URL` e `NEXT_PUBLIC_BUY_PRO_ANNUAL_URL`. Enquanto uma URL estiver vazia, o CTA correspondente fica desabilitado com o texto **“Em breve”**. Sem preço comercial definido, a página usa **“Preço de lançamento em breve”** e nunca inventa valor numérico.

**Atualização em 2026-08-12 (P0-7):** a regra de não inventar preço permanece,
mas o preço do Essencial já foi definido em R$ 97 à vista no crédito ou Pix, ou
12x de R$ 10,03. A página agora exibe esse valor e usa mensagens indisponíveis
específicas para cada oferta. As variáveis e seus destinos não foram alterados.

### Contexto
A Fase 4-5B protegeu `/` e as demais telas locais, deixando o domínio sem vitrine pública. A Fase 4-6A precisava apresentar Essencial e Pro Anual sem reabrir as telas protegidas, criar uma landing completa ou antecipar checkout, webhooks e admin.

### Motivo
Uma rota pública dedicada resolve o funil mínimo com escopo pequeno: explica os dois produtos e oferece os destinos de compra quando existirem. Manter `/` protegida evita mover o painel e alterar cinco fluxos já validados. Usar envs para os CTAs separa conteúdo comercial de deploy sem criar integração de pagamento antes da Fase 6.

### Impacto
Produto: `/precos` passa a ser o destino público de apresentação do Doce Margem. Não existe plano mensal, e os recursos planejados são identificados como tal. Técnico: a página consome `ALL_FEATURES` para não divergir da matriz de planos, não consulta Supabase, não importa DAL e não altera o gating existente. Como as envs têm prefixo `NEXT_PUBLIC_`, trocar as URLs exige novo build/deploy.

---

## 2026-08-06 — Webhook Kiwify: o segredo nomeia, o pedido identifica, e o schema decide o resto

### Decisão
O webhook da Kiwify será `POST /api/webhooks/kiwify`, Route Handler em runtime Node, com:

- **`KIWIFY_WEBHOOK_SECRET`** como nome da variável — não `KIWIFY_WEBHOOK_TOKEN`. Já existe no `.env.example` e é simétrico a `HOTMART_WEBHOOK_SECRET`. A Kiwify chama isso de "token" no painel dela; a diferença vira comentário no `.env.example`, não renomeação. **Aceitar os dois nomes está descartado.**
- **Service role isolada** em `services/supabase/admin.ts` (novo, `server-only`), nunca em `services/supabase/server.ts`.
- **Corpo lido como texto cru antes do parse** (`request.text()`, nunca `request.json()` primeiro).
- **Falha fechada:** segredo ausente ou vazio → 500, nada processado.
- **Payload sem `provider_order_id` legível → 400, nada gravado.**
- Códigos de resposta fixados: replay e evento não tratado → **200**; token inválido → 401; corpo ilegível → 400; falha transitória → **500**.

Eventos: `compra_aprovada` → licença `one_time` `active` com `expires_at = NULL` + evento `granted`; `compra_reembolsada` → `status = 'refunded'` + evento `refunded`; `chargeback` → `status = 'chargeback'` + evento `chargeback`. Qualquer outro evento: 200 sem ação.

### Contexto
Fase 4-7A, planejamento. O checkout do Essencial já existe e a `/precos` já aponta para ele; falta a liberação automática. O plano foi escrito lendo `0001_profiles.sql` e `0002_licenses.sql`, e três achados do schema mudaram o desenho.

### Motivo

**O nome da env.** Segredo com dois nomes aceitos é segredo com duas fontes de verdade — e é assim que um deles fica desatualizado em produção sem ninguém notar. Manter o nome já documentado custa um comentário; renomear custa uma edição em toda a documentação e quebra a simetria com Hotmart.

**O corpo cru antes do parse.** Se a validação for HMAC, ela é sobre os bytes originais da requisição. `await request.json()` consome o stream e destrói a única evidência que permite verificar a assinatura. Não é preferência de estilo: é a diferença entre conseguir e não conseguir validar.

**A falha fechada.** "Sem segredo configurado, aceita" seria a versão webhook do bypass por env ausente que a decisão de 2026-08-06 (gating) já recusou — e aqui é pior, porque um endpoint público que aceita qualquer payload concede licenças a quem pedir.

**A rejeição de payload sem order id.** `licenses_provider_order_unique` é `(provider, provider_order_id)` com a segunda coluna nullable, e em Postgres NULLs não conflitam entre si — comportamento desejado para licenças manuais coexistirem. O efeito colateral é que gravar `NULL` ali **desliga a idempotência sem emitir nenhum sinal**: cada reenvio da Kiwify viraria uma licença nova. Rejeitar com 400 transforma uma falha silenciosa numa falha visível.

**Os códigos de resposta.** É o provedor, não o app, que decide reenviar — e ele decide pelo código. Responder 4xx a um replay legítimo produz reenvio infinito; responder 200 a uma falha transitória de banco **perde a venda em silêncio**. Fixar a tabela agora evita que isso seja improvisado durante a implementação.

### Impacto
Técnico: a 4-7B precisa de `services/supabase/admin.ts` e de uma migration (ver pendências). `/api/webhooks/*` tem que ficar de fora do `matcher` do `proxy.ts` quando a Fase 4-5C o criar — um proxy que redirecione essa rota para `/login` quebra o faturamento em silêncio, porque a Kiwify recebe 307 e desiste.

Auditoria: um `license_events` por webhook **válido e processado**, com `source = 'webhook:kiwify'` e o corpo bruto em `payload`. Requisição com token inválido **não** gera evento — senão qualquer um na internet escreveria na tabela de auditoria, e uma auditoria que o atacante alimenta não serve para o que ela existe (disputa de chargeback).

Revogação não exige nada além do `UPDATE`: as funções de acesso filtram `status = 'active'` a cada chamada e o DAL não persiste acesso, então o reembolso vale na requisição seguinte. É o retorno concreto da decisão de 2026-08-05 de nunca persistir acesso calculado.

### Pendências que este plano expõe

**1. Compra antes do cadastro é bloqueio físico, não caso de borda.** `licenses.user_id → profiles.id → auth.users.id`: não existe licença para e-mail sem conta, nem com `service_role`, porque FK não é RLS. E `license_events` não pode servir de fila — vocabulário fechado por CHECK e append-only por trigger. **Guardar pendência exige migration de qualquer forma.** Três caminhos, com recomendação de convidar via Admin API (a compradora paga, recebe o e-mail, define a senha e já entra com licença ativa) e fila como rede. **Decisão pendente** — muda o conteúdo da migration.

**2. `webhook_events` foi prometida e não existe.** `README.md` linha 87 e a Fase 6 do `TASKS.md` citam a tabela; a 0002 resolveu idempotência pela UNIQUE de `licenses`. A UNIQUE cobre replay de concessão, mas não cobre replay de revogação (que é UPDATE, sem constraint) nem falha no meio do processamento. Decidir junto com a pendência 1, já que seriam quase a mesma tabela.

**3. `profiles.email` não tem índice nem UNIQUE.** A unicidade real mora em `auth.users`. Busca por e-mail hoje é varredura e é sensível a maiúsculas. A migration da 4-7B deve criar `unique index on public.profiles (lower(email))`, e todo e-mail deve ser normalizado com `lower(trim(...))`.

**4. Nada foi confirmado contra a Kiwify real.** Os nomes de campo do payload e o mecanismo de validação (token simples × HMAC em query string) são hipótese até uma requisição real ser capturada. É a primeira tarefa da 4-7B, antes de qualquer código. E a URL pública só existe depois do deploy — o teste de ponta a ponta com compra real é o único que prova a integração, e ele é pós-deploy.

---

## 2026-08-06 — `webhook_events` é log de processamento, não auditoria; e o cliente não o enxerga

### Decisão
`supabase/migrations/0003_webhook_support.sql` cria `public.webhook_events` com:

- **RLS habilitada e nenhuma policy — nem de leitura** — mais `revoke all` e **zero grants**. O cliente não vê a tabela de forma alguma.
- **Nenhum trigger de imutabilidade**, ao contrário de `license_events`. Esta tabela muda de estado (`received → processed | ignored | failed`).
- **Idempotência por índice único parcial** `(provider, provider_event_id) where provider_event_id is not null` — e o índice de pedido `(provider, provider_order_id)` **não** é único.
- **`provider` restrito a `'kiwify'`** por CHECK.
- **`profiles_email_lower_unique` parcial**, `where email <> ''`.

Duas constraints além das especificadas: coerência `status ↔ processed_at`, e `error_message` permitido só quando `status = 'failed'`.

### Contexto
Fase 4-7B, preparação de banco para o webhook da Kiwify. O plano da 4-7A (capítulo 13 do `PLAN-FASE-4.md`) apontou que guardar estado de webhook exigiria migration de qualquer forma, porque `license_events` tem vocabulário fechado por CHECK e é append-only por trigger.

### Motivo

**Por que o cliente não lê nada.** `payload` é o corpo bruto do provedor: contém campos que não controlamos e que nunca passaram por uma decisão de "isto pode aparecer na tela" — documento, endereço, dados de cobrança, o que a Kiwify resolver mandar. A usuária já tem transparência pelo caminho certo, `license_events`, com vocabulário nosso e sem payload de terceiro. `webhook_events` é log de infraestrutura; se a Fase 7 quiser expor algo, que seja pela área admin via service_role, não por policy de `authenticated`. Zero policy **e** zero grant são duas barreiras independentes: um `create policy` distraído no futuro não abre a tabela sozinho.

**Por que não é append-only.** `license_events` responde "por que esta pessoa perdeu acesso" e precisa ser inalterável até para o próprio sistema — é evidência em disputa de chargeback. `webhook_events` responde "esta requisição já foi tratada?", e essa resposta muda com o tempo. São propósitos diferentes na mesma família. Copiar o trigger da 0002 para cá quebraria o processamento no primeiro webhook, e por isso a diferença está escrita no cabeçalho da migration em vez de ficar implícita.

**Por que o índice de pedido não é único.** Um pedido produz `compra_aprovada` e, semanas depois, possivelmente `compra_reembolsada` ou `chargeback`. Unicidade ali impediria registrar o reembolso — o evento que mais importa auditar.

**Por que `provider` só aceita `'kiwify'`.** O CHECK de `event_type` usa o vocabulário **português** da Kiwify (`compra_aprovada`); a Hotmart usa outro. Um provedor novo teria que estender os dois CHECKs de qualquer forma, então travar `provider` não cria trabalho que já não existiria. É assimétrico em relação a `licenses.provider`, que deliberadamente **não** tem CHECK — e a assimetria é justificada: lá o valor é só procedência (inclui `'manual'`), aqui ele determina como o payload é lido.

**Por que o índice de e-mail é parcial.** `handle_new_user` (0001) grava `coalesce(new.email, '')`, então cadastro sem e-mail produz string vazia. **Duas linhas assim colidiriam num índice único total e a criação do índice falharia.** O app é só e-mail/senha hoje, mas a própria 0001 comenta que isso pode mudar; um índice que quebra o cadastro futuro é pior que índice nenhum. Excluir `''` não enfraquece nada — string vazia não é e-mail de compra nenhuma.

**Por que as duas constraints extras.** Sem a coerência `status ↔ processed_at`, cabia uma linha `processed` sem carimbo de quando, e a coluna deixaria de responder à única pergunta que existe para responder. Sem a restrição de `error_message`, mensagem de erro apareceria em linha bem-sucedida — ruído para quem for depurar sob pressão.

### Impacto
Técnico: a Fase 4-7C escreve na tabela só por `service_role`. O handler **precisa rejeitar payload sem `provider_event_id`** — NULL ali desliga a idempotência sem emitir sinal, o mesmo buraco de NULL já registrado para `licenses.provider_order_id`. O CHECK de coerência obriga a preencher `processed_at` quando a linha nasce já concluída.

Operacional: **a migration não foi aplicada nem validada por parser SQL** — não há Postgres nem `psql` no ambiente. A verificação foi estrutural. Erro de sintaxe só aparecerá no `db push`.

⚠️ **Checagem obrigatória antes de aplicar:** duplicatas de e-mail derrubam o `CREATE UNIQUE INDEX`. A consulta está na seção 4 da migration e no `REVIEW.md`. Se retornar linhas, resolver as duplicatas — **nunca remover o `unique` para fazer passar**, porque duas contas com o mesmo e-mail tornam a identificação ambígua, que é exatamente o que o webhook não pode ter. As duas contas de teste da Fase 4-1B, que nunca puderam ser apagadas, entram nessa contagem.

LGPD: `payload` guarda dado pessoal e, diferente de `license_events`, `DELETE` aqui não tem trigger impedindo — pedido de apagamento se atende por service_role.

---

## 2026-08-06 — `service_role` ignora RLS, mas NÃO dispensa GRANT

### Decisão
Registro de correção de uma premissa errada que atravessou três migrations.

`service_role` no Supabase tem o atributo `BYPASSRLS` — ignora *policies*. Isso **não** o torna superusuário: **privilégio de tabela (`GRANT`) continua valendo para ele**. Sem `grant`, ele recebe `42501 permission denied`, exatamente como qualquer outro papel.

As migrations `0001`, `0002` e `0003` foram escritas assumindo o contrário, e **nenhuma delas concede um único privilégio a `service_role`**. O comentário da `0002` (linha 366) chega a afirmar por escrito: *"Só service_role — que, sendo superusuário efetivo no Supabase, não depende de grant explícito."* A afirmação é falsa.

### Contexto
Fase 4-7C. O Route Handler do webhook foi o **primeiro código do projeto a usar a service role** — até então tudo passava pela chave anônima, sujeito à RLS. O `INSERT` em `webhook_events` falhou com `42501`, e o diagnóstico direto contra o Supabase real mostrou o mesmo erro em `licenses` e `user_access_flags`. O próprio Postgres devolveu a correção na dica: `GRANT INSERT ON public.webhook_events TO service_role;`.

Ou seja: não era a migration nova. O buraco existe desde a `0001` e ficou invisível por quatro subfases porque nada o exercitava.

### Motivo
A confusão tem raiz plausível: a documentação do Supabase descreve `service_role` como a chave que "bypasses Row Level Security", e a RLS é de fato a proteção que o projeto mais discutiu. Mas são dois mecanismos independentes e ortogonais — o mesmo par que a Fase 4-1A já tinha separado em outro contexto ("RLS decide *quais linhas*, GRANT decide *quais colunas*"). O projeto aplicou essa distinção corretamente a `authenticated` e a esqueceu para `service_role`.

Projetos Supabase normalmente têm `alter default privileges ... grant all on tables to service_role`, o que faz o problema não aparecer. Neste projeto ele apareceu — motivo a confirmar, mas irrelevante para a correção: **grant explícito funciona em qualquer configuração**, default privileges ou não.

### Impacto
**Bloqueante para o faturamento.** Sem correção, os webhooks da Fase 4-7D e o admin da Fase 7 falhariam por completo — e o modo de falha é o pior possível: a Kiwify recebe 500, reenvia algumas vezes, desiste, e a licença nunca é concedida. Do lado do app, nada aparece: nenhuma linha em `webhook_events`, nenhum erro na interface. Venda perdida em silêncio.

Correção pendente, em migration própria (não criada na 4-7C, que estava proibida de mexer em migrations):

```sql
grant select, insert, update on public.webhook_events    to service_role;
grant select, insert, update on public.licenses          to service_role;
grant select, insert         on public.license_events    to service_role;
grant select, insert, update on public.user_access_flags to service_role;
grant select                 on public.profiles          to service_role;
```

`license_events` sem `update` de propósito: o trigger da `0002` bloqueia `UPDATE` para todos, inclusive `service_role`, e conceder o privilégio daria a impressão de que a auditoria é editável.

Também vale verificar se o projeto tem `alter default privileges` para `service_role` — sem isso, **toda tabela nova nasce com o mesmo problema**, e o próximo a descobrir será o próximo a perder uma venda.

Documentação: os comentários da `0002` (linha 366) e da `0003` (linha 342) afirmam algo falso e devem ser corrigidos junto com a migration de grants — não por estética, mas porque são exatamente o tipo de comentário confiante que faz a próxima pessoa não checar.

---

## 2026-08-06 — Privilégio do backend é concedido verbo a verbo, sem rede automática

### Decisão
Complementa a entrada anterior (`service_role` ignora RLS mas não dispensa GRANT), que descreveu o problema. Esta registra **como** ele foi corrigido, em `supabase/migrations/0004_service_role_grants.sql`:

- **Nenhum `delete` para `service_role`, em nenhuma tabela.**
- **`license_events` sem `update`**, apesar de `insert`.
- **`grant execute` nas três funções internas** da 0002 (`is_user_blocked`, `has_pro_access`, `has_essential_access`) — e **não** nas versões `current_user_has_*`.
- **`alter default privileges` avaliado e recusado.** Toda tabela nova precisa trazer seu grant explícito.
- `user_access_flags` com `select, update` mas **sem `insert`**.
- Zero grants para `anon` e `authenticated`; nenhuma policy criada; nenhuma RLS removida.

### Contexto
Fase 4-7C-fix. A entrada anterior documentou a descoberta: nenhuma das três migrations concedia privilégio a `service_role`, e o webhook — primeiro código do projeto a usá-lo — falhou com `42501`. Esta fase implementou a correção, e cada escolha abaixo foi feita contra a alternativa mais permissiva.

### Motivo

**Sem `delete` em lugar nenhum.** Licença revogada vira `status = 'refunded'`; ela não some. Uma licença apagada destrói a resposta para "esta pessoa já teve acesso, e quando o perdeu?" — que é exatamente a pergunta de uma disputa de chargeback, o cenário em que o registro mais importa. O mesmo vale para `webhook_events`: apagar log é operação de exceção (LGPD) e deve exigir acesso administrativo direto ao banco, com intenção explícita, não uma chamada de aplicação que pode ser disparada por engano.

**`license_events` sem `update`.** O trigger `license_events_immutable` da 0002 já bloqueia UPDATE para todos, inclusive `service_role` — então conceder o privilégio não daria poder nenhum. Mas passaria a impressão de que a auditoria é editável, e quem lesse os grants tiraria a conclusão errada. O privilégio ausente e o trigger dizem a mesma coisa; é isso que se quer.

**Funções internas sim, `current_user_has_*` não.** As internas recebem `uid` e são o que o admin da Fase 7 precisa para responder "esta usuária tem acesso?" sem reimplementar a regra em TypeScript — que é justamente a duplicação que essas funções existem para evitar. As versões sem parâmetro resolvem `auth.uid()`, NULL fora de sessão autenticada: para `service_role` devolveriam sempre `false`. Conceder acesso a elas criaria uma armadilha silenciosa para quem chamasse a função errada.

**`alter default privileges` recusado.** Seria a correção automática para toda tabela futura, e é a saída óbvia — mas concede `ALL` em tudo que nascer, exatamente o "privilégio amplo demais" que este projeto recusa por princípio. O custo de não usar é ter que conceder explicitamente a cada tabela nova. **Esse custo é o benefício:** obriga a decidir, verbo por verbo, o que o backend realmente precisa, em vez de herdar tudo por omissão. Foi a mesma escolha feita na 0002 ao não dar policy de escrita em `licenses`.

**`user_access_flags` sem `insert`.** A linha nasce com a conta, pelo trigger `handle_new_user`. Conceder `insert` cobriria um caso que não deveria existir e esconderia o problema real quando existisse.

### Impacto
Técnico: **toda migration futura que criar tabela escrita pelo backend precisa trazer o `grant` a `service_role` junto.** Não há rede automática, por decisão — o lembrete está em caixa-alta na seção 4 da 0004, onde quem criar a próxima tabela vai passar. Sem isso, a falha se repete, e o modo de falha é silencioso do lado do provedor de pagamento.

⚠️ **Risco conhecido e aceito:** sem `insert` em `user_access_flags`, um perfil que exista sem a linha correspondente faria o `UPDATE` de bloqueio não afetar linha nenhuma — **sem erro**. O admin veria sucesso e a conta seguiria liberada. A consulta 5.4 da migration procura esses casos e deve ser rodada antes de confiar no bloqueio administrativo.

Segurança: `licenses` com `insert/update` é o poder de conceder e revogar licença. O grant não é a proteção — a proteção é **quem tem a `SUPABASE_SERVICE_ROLE_KEY`**. Ela nunca pode receber prefixo `NEXT_PUBLIC_`, e hoje é lida por um único arquivo, `services/supabase/admin.ts`, com `import "server-only"`.

Dívida documental: os comentários de `0002` (linha 366) e `0003` (linha 342) continuam afirmando que `service_role` não precisa de grant. Corrigi-los exige alterar migrations antigas; por ora a falsidade está registrada no cabeçalho da `0004`. É paliativo — quem ler a `0002` isolada continua sendo informado errado.

---

## 2026-08-07 — Um parâmetro, uma leitura: `signature` é assinatura, nunca token

### Decisão
`?signature=` no webhook da Kiwify é validado **exclusivamente como HMAC do corpo cru** — HMAC-SHA256 e, se falhar, HMAC-SHA1, ambos em hex, com prefixo `sha256=`/`sha1=` normalizado antes da comparação.

**A aceitação de `signature` como token simples, introduzida na Fase 4-7D, foi removida.**

Consequência de ordem: o handler passou a ler o corpo (`request.text()`) **antes** de autenticar.

### Contexto
Fase 4-7E. A 4-7D acrescentou `?signature=` aos portadores aceitos e o tratou como token simples, sobre a hipótese de que o painel da Kiwify mandava o próprio segredo ali. O teste real desmentiu: o log de produção registrou `signatureLooksLikeHex=true` — um digest.

O bit de diagnóstico acrescentado na própria 4-7D foi o que derrubou a hipótese da 4-7D.

### Motivo

**Por que remover a leitura como token, em vez de manter as duas.** Parece conservador manter a verificação antiga "por compatibilidade". Não é: a ordem de tentativa faz a verificação **fraca valer sempre que a forte falhar**. Um atacante que descobrisse o segredo por qualquer via — log de proxy, histórico de URL, captura de tela do painel — poderia autenticar sem saber assinar nada, e o caminho HMAC viraria decoração. Fallback silencioso de forte para fraca é como autenticação forte vira teatro.

Além disso, um parâmetro com duas leituras é um parâmetro sem significado definido. Quem for depurar isso em seis meses precisa poder ler `signature` e saber o que é.

**Por que tentar dois algoritmos.** SHA-256 e SHA-1 em hex são as duas convenções dominantes em webhooks. Tentar ambos custa dois HMACs por requisição — irrelevante — e evita um ciclo inteiro de deploy e teste caso a Kiwify use SHA-1. Não é chute disfarçado: se nenhum bater, o resultado é 401, e o `signatureFormat` no log diz qual formato veio.

**Por que a inversão de ordem é aceitável.** A Fase 4-7C autenticava antes de ler o corpo, e isso era bom. Com HMAC é impossível — a assinatura é sobre os bytes recebidos. A garantia que realmente importa continua intacta: **payload não autenticado nunca vira linha em `webhook_events`** (princípio 2 da migration 0003 — auditoria que o atacante alimenta não serve para disputa de chargeback). O que mudou é que o corpo existe em memória por alguns milissegundos antes de ser recusado.

**Por que comparar hashes em vez dos digests diretamente.** `timingSafeEqual` lança quando os buffers têm tamanhos diferentes, o que forçaria um `if` de comprimento antes — e esse `if` é o canal lateral que a função existe para fechar. Passando os dois lados por SHA-256, a comparação é sempre de 32 bytes: nunca lança, nada vaza.

### Impacto
Técnico: `authenticate()` devolve o método usado, e ele aparece no log de sucesso como `tokenCarrierUsed` — é assim que se descobre qual mecanismo a Kiwify realmente usa quando a compra real funcionar. Os três portadores de token simples continuam aceitos e são úteis para teste manual via `curl`/PowerShell.

Segurança: verificado que uma assinatura **legítima**, calculada com o segredo correto sobre **outro** corpo, é rejeitada com 401. Esse é o teste que separa verificação real de verificação aparente — sem ele, um bug que ignorasse o corpo passaria despercebido.

⚠️ **Nada foi confirmado contra compra real.** Se a Kiwify usar base64, corpo canonicalizado ou um segredo diferente do token do painel, o resultado continua sendo 401 — e o `signatureFormat` no log é o que apontará a correção. Liberação automática de licença continua não existindo: o handler grava o evento e para.

---

## 2026-08-07 — Idempotência determinística: a chave é `evento:pedido`, não o pedido

### Decisão
Quando o provedor de pagamento não envia identificador de evento, o
`provider_event_id` é **derivado** como `${event_type}:${order_id}`:

```
compra_aprovada:07271940-b573-41a6-9e6a-0e504bf45916
```

Identificador explícito do provedor, quando existir, tem prioridade — e o campo
`eventIdSource` (`provider` | `derived` | `none`) registra qual dos dois valeu.

Duas decisões acessórias, tomadas junto:

- **`order_status` saiu da lista de caminhos de nome de evento.** Sem
  `webhook_event_type` legível, o resultado é `unknown`, nunca um palpite.
- **`id` saiu dos candidatos a `order_id`.**

### Contexto
Fase 4-7F. O POST de teste da Kiwify chegou à produção, passou pela verificação
HMAC da 4-7E e foi gravado em `webhook_events`. A captura mostrou a estrutura
real — `webhook_event_type: "order_approved"`, `order_id`, `order_status: "paid"`,
`Product.*`, `Customer.*` — e **nenhum identificador de evento**.

`provider_event_id` gravou `NULL`. Em Postgres, NULLs não conflitam entre si numa
UNIQUE, então o índice `webhook_events_provider_event_unique` não protegia coisa
nenhuma: cada reenvio viraria uma linha nova, em silêncio. O risco estava previsto
no `PLAN-FASE-4.md` 13.1(C) desde o planejamento; a captura o confirmou com dado
real.

### Motivo

**Por que derivar, em vez de rejeitar.** O plano original mandava rejeitar payload
sem identificador. Isso fazia sentido enquanto "sem identificador" era hipótese de
payload malformado. Com a captura, virou outra coisa: **é o formato normal da
Kiwify**. Rejeitar seria recusar todo webhook legítimo do provedor — 400 em cada
compra, e nenhuma licença jamais liberada.

**Por que `evento:pedido` e não só o pedido.** Um pedido produz eventos diferentes
ao longo do tempo: aprovada hoje, reembolsada em duas semanas, chargeback em dois
meses. Chave só pelo pedido faria o **reembolso ser descartado como duplicata do
pagamento** — a licença nunca seria revogada, o dinheiro voltaria para a
compradora e o acesso continuaria valendo. É o pior erro possível nesta parte do
sistema, e seria silencioso.

**Por que `order_status` teve que sair.** O payload real traz `order_status:
"paid"`, e `paid` é apelido de `compra_aprovada` no mapa de eventos. Enquanto
`webhook_event_type` estiver presente, a prioridade resolve. Mas bastaria ele vir
vazio numa notificação de boleto ou de reembolso para um **status de pagamento
virar "compra aprovada"** e, na fase seguinte, liberar licença indevida. Um campo
que descreve o estado do pagamento não pode decidir que evento aconteceu. Sem
`webhook_event_type` legível, o certo é `unknown`: fica gravado, nada é liberado,
e alguém olha.

**Por que `id` saiu dos candidatos a pedido.** Num payload da Kiwify, `id` pode
ser do produto ou do cliente. Um `provider_order_id` errado corromperia o elo
entre a licença e a compra — e esse elo é o que sustenta o reembolso.

### Impacto
Técnico: `extractKiwifyWebhook` passou a devolver `eventIdSource`, `productId` e
`productType`. A fase de licença lê `provider_event_id` sem saber (nem precisar
saber) se ele veio derivado. O log de sucesso expõe `eventIdSource`, que é o sinal
de que `order_id` mudou de lugar caso o formato de produção difira do teste.

⚠️ **Limite conhecido e aceito:** dois eventos genuinamente distintos com o mesmo
tipo e o mesmo `order_id` colidem, e o segundo é tratado como replay. Para a
compra única do Essencial isso é o comportamento **correto** — um pedido tem uma
aprovação. Para a renovação do Pro anual, se a Kiwify reusar o `order_id` entre
ciclos, a renovação seria engolida. A fase de assinatura precisa reavaliar; está
anotado no `TASKS.md`.

⚠️ **O payload capturado é o do botão de teste.** O evento de produção pode diferir.
Os extractores toleram ausência de campo, e `eventIdSource=none` no log seria o
aviso de que a derivação não teve como acontecer.

---

## 2026-08-07 — Convidar, nunca criar conta silenciosa; e falhar visível em vez de improvisar

### Decisão
Quando chega uma compra aprovada de um e-mail sem conta, o sistema usa
**`inviteUserByEmail`** — e **só** ele. Se o convite falhar, a compra é marcada
como `failed` em `webhook_events`, o handler devolve 500 (para a Kiwify
reenviar) e **nenhuma conta é criada**.

`createUser` como alternativa está **descartado** enquanto o app não tiver tela
de recuperação de senha.

Decisões acessórias, tomadas junto:
- **Busca de perfil por e-mail escapa curingas de `LIKE`** antes do `ilike`.
- **`license_events.payload` guarda só referências**, nunca o corpo do webhook.
- **Auditoria só é inserida quando a licença nasce**, não a cada reprocessamento.

### Contexto
Fase 4-7G. O caminho da compradora já cadastrada funciona: 33/33 testes contra o
Supabase real. O caminho de quem ainda não tem conta esbarrou em erros reais do
`inviteUserByEmail`: `email_address_invalid` e `over_email_send_rate_limit`.

O segundo é o que importa: **o SMTP padrão do Supabase permite poucos envios por
hora**. Na terceira venda da mesma hora, o convite falha.

### Motivo

**Por que não cair para `createUser` quando o convite falha.** Seria o contorno
óbvio: cria a conta, prende a licença nela, e a compradora "depois resolve". Mas
o app não tem tela de recuperação de senha. Ela teria pago, teria uma conta
existindo em seu nome, e **nenhum caminho para entrar** — nem o cadastro, que
recusa e-mail já registrado. Trocaríamos uma falha visível (compra registrada
como `failed`, esperando ação) por uma armadilha silenciosa (compra "concluída",
cliente sem acesso e sem explicação). A primeira aparece num relatório; a segunda
aparece num pedido de reembolso.

**Por que 500 e não 200 no convite falhado.** O 500 faz a Kiwify reenviar, e o
reenvio é a recuperação real: assim que o SMTP voltar ao ar ou o limite zerar, a
mesma compra é processada e a licença sai. Um 200 daria a compra por encerrada.

**Por que escapar curingas na busca por e-mail.** `_` é caractere legítimo em
e-mail e curinga em `LIKE`: sem escapar, `maria_silva@x.com` casaria com
`mariaXsilva@x.com`. Numa rotina que decide de quem é a licença, casar o perfil
errado é o pior defeito possível — concede acesso a uma pessoa e nega a quem
pagou.

**Por que a auditoria não repete o payload.** Os dados pessoais já estão em
`webhook_events.payload`. Duplicá-los em `license_events` espalharia PII por duas
tabelas com políticas de retenção diferentes, e um pedido de exclusão passaria a
exigir varrer as duas. Referências bastam para reconstruir o contexto.

### Impacto
**Comercial, e é sério:** enquanto o SMTP não for configurado, **quem compra sem
ter conta não recebe acesso**. A compra não se perde — fica em `webhook_events`
com `status = 'failed'` e o código do erro — mas exige ação manual. Como o funil
manda a compradora do checkout direto para a compra, esse é provavelmente o caso
**mais comum**, não a exceção. Corrigir é configuração (Resend, SendGrid, SES),
não código.

Técnico: `lib/webhooks/kiwify-processor.ts` concentra a regra e o Route Handler
fica só com HTTP. Idempotência em duas camadas — índice único de `webhook_events`
antes de qualquer trabalho, e unicidade `(provider, provider_order_id)` de
`licenses` como rede. Linha que ficou `received` é reprocessada no reenvio, em
vez de descartada como duplicata.

### Achado colateral que precisa de correção própria
Ao tentar limpar os dados de teste, `deleteUser` falhou. Isolado com três casos
(sem eventos → ok; com licença → ok; **com `license_events` → falha**):

`license_events.user_id` usa `ON DELETE SET NULL`, e `SET NULL` é um **UPDATE**.
O trigger `license_events_immutable` da migration 0002 bloqueia UPDATE para
todos, inclusive `service_role`. A FK tenta anonimizar o registro e a própria
proteção o impede.

A intenção da 0002 estava certa — a evidência deve sobreviver à exclusão da conta
— mas a implementação transforma "anonimizar" em "impedir". **Consequência: um
pedido de exclusão de conta (LGPD) não tem caminho automático.** A correção é uma
migration que permita o UPDATE quando ele apenas anula `user_id`/`license_id`,
mantendo o bloqueio para alteração de conteúdo. Fora do escopo da 4-7G.

---

## 2026-08-07 — O fragment obriga um client de navegador; a senha continua no servidor

### Decisão
O aceite de convite ganhou rota própria, **`/auth/accept-invite`**, com um Client
Component que lê os tokens do fragment da URL. Junto:

- **`services/supabase/client.ts`** — primeiro client de navegador do projeto,
  com chave anônima e `detectSessionInUrl: false`.
- **O fragment é apagado antes do primeiro `await`.**
- **A senha é definida por Server Action**, nunca por `updateUser` no cliente, e
  a sessão é revalidada com `getUser()` antes da troca.
- **`/auth/accept-invite` nunca recebe guarda de acesso.**
- **`InviteHashRescue`** em `/login` reencaminha convites que caírem lá.
- `inviteUserByEmail` passou a enviar `redirectTo` apontando para a rota nova.

### Contexto
Com o SMTP do Resend configurado, o convite passou a ser entregue — resolvendo o
bloqueador nº 1 da Fase 4-7G. Mas o "Accept invitation" abria
`/login#access_token=…` e mostrava o formulário de login comum: sem senha para
digitar, com o token na URL. A compradora tinha pago e ficava presa.

### Motivo

**Por que um client de navegador, depois de o projeto inteiro ser server-side.**
Não houve escolha. O Supabase entrega os tokens do convite no **fragment**, e
fragment **nunca é enviado ao servidor** — é a definição do que ele é no HTTP.
Nenhum Server Component consegue lê-lo. Só JavaScript de navegador enxerga
aquilo. O client usa a chave anônima e grava a sessão em **cookie**, não em
`localStorage`: com o storage padrão do `supabase-js`, a sessão ficaria presa no
navegador e as rotas protegidas continuariam recusando a compradora.

**Por que apagar o fragment antes de qualquer `await`.** Enquanto o token está na
barra de endereço, ele viaja em `Referer` para qualquer recurso externo carregado
no meio, fica no histórico do navegador e aparece em print de tela ou
compartilhamento de link. A criação da sessão leva centenas de milissegundos —
tempo suficiente. Apagar primeiro custa uma linha e fecha os três.

**Por que a senha continua indo por Server Action.** Seria mais curto chamar
`updateUser` direto no cliente, já que a sessão está lá. Mas isso quebraria a
regra que o login já segue — senha vai por `FormData` direto ao servidor, sem
passar por estado de cliente — e perderia a revalidação com **`getUser()`**.
`getSession()` só lê o cookie e é forjável; sem revalidar, um cookie fabricado
permitiria trocar a senha de outra pessoa. Numa rotina de definição de senha,
esse é o defeito mais grave possível.

**Por que `detectSessionInUrl: false`.** A detecção automática do `supabase-js`
competiria com a leitura manual do hash. Duas rotinas disputando o mesmo fragment
produzem uma corrida cujo vencedor muda a cada carregamento — o tipo de bug que
funciona em teste e falha em produção. Leitura explícita é determinística.

**Por que a rota não pode ter guarda.** Quem chega ali ainda não tem sessão: é
justamente o que a página vai criar. Um `requireAuthenticatedAccess` trancaria a
porta na cara de quem acabou de comprar — o mesmo erro que a Fase 4-5A já tinha
evitado em `/acesso-bloqueado`, e pelo mesmo raciocínio.

### Impacto
Produto: **quem compra sem ter conta agora tem caminho completo** até o acesso —
compra, e-mail, senha, licença já vinculada.

Configuração obrigatória, e ambas falham em silêncio se esquecidas:
1. **`/auth/accept-invite` em Redirect URLs** no painel do Supabase. Sem isso o
   `redirectTo` é ignorado e o convite volta ao Site URL. O `InviteHashRescue`
   cobre, mas é rede de segurança, não o caminho desejado.
2. **`NEXT_PUBLIC_APP_URL` na Vercel** com o domínio real — o `redirectTo` é
   montado a partir dela; vazia, nenhum é enviado.

⚠️ **O convite chegou em spam** no teste real. SPF, DKIM e DMARC do domínio
precisam ser configurados no Resend — e-mail em spam é, na prática, quase tão
ruim quanto e-mail não entregue.

⚠️ **A compra real de ponta a ponta continua sem teste.** Comprar, receber,
criar senha e entrar é o único percurso que fecha o ciclo, e nenhuma validação
sintética substitui.

---

## 2026-08-07 — Dinheiro devolvido não volta a virar acesso sozinho

### Decisão
Reembolso e chargeback revogam a licença (`refunded` / `chargeback`), com auditoria obrigatória. Junto, três regras que não decorrem obviamente disso:

1. **Revogação sem licença correspondente vira `failed`, não `processed`** — e é retriável.
2. **Uma `compra_aprovada` que chegue depois de `refunded` ou `chargeback` NÃO reativa a licença.** O caso vira `failed` com `reativacao_bloqueada:<status>`, para decisão humana. `cancelled` e `expired` continuam reativáveis.
3. **Reembolso após chargeback não sobrescreve o chargeback.**

### Contexto
Fase 4-7H, na branch `feature/4-7g-license-grant`. A 4-7G já concedia licença; reembolso e chargeback eram registrados e não faziam nada. Quem pedisse reembolso recebia o dinheiro e mantinha acesso vitalício.

### Motivo

**Por que revogação sem licença não pode ser "processed".** É a decisão menos óbvia da fase. O caminho confortável seria: não há o que revogar, marca concluído, segue. O buraco: um reembolso sem licença correspondente costuma significar que **a aprovação ainda não foi processada** — webhook fora de ordem, ou uma concessão que falhou e ficou pendente em `failed`. Dar o reembolso por encerrado nesse estado faz a aprovação chegar depois, criar a licença, e **quem foi reembolsado ficar com acesso vitalício**. Um erro silencioso que só aparece na conta bancária.

Como `failed` é reprocessável (regra criada na correção de auditoria) e a resposta é 500, a Kiwify reenvia e a revogação acontece assim que a licença existir. Se nunca existir, a linha fica visível para alguém olhar — o que é correto, porque de fato não havia nada a revogar.

**Por que aprovação não reativa licença com dinheiro devolvido.** A 4-7G reativava qualquer licença não-`active` ao receber aprovação, sob a premissa de que "aprovação nova significa pagamento válido de novo". Com revogação implementada, essa premissa fica perigosa: `refunded` e `chargeback` significam que **o dinheiro já voltou para a compradora**. Reconceder acesso a partir de um webhook, sem ninguém olhar, é devolver o produto depois de devolver o pagamento. Também fecha o cenário de entrega fora de ordem — reembolso processado antes da aprovação — que de outro modo terminaria com a licença ativa.

`cancelled` e `expired` seguem reativáveis porque não envolvem devolução: ali uma aprovação nova é uma retomada legítima.

**Por que reembolso não sobrescreve chargeback.** Para o acesso dá no mesmo — qualquer um dos dois derruba. Mas chargeback é o fato mais grave e o registro precisa preservá-lo: é o que sustenta uma disputa com a operadora.

### Impacto
Técnico: a revogação é só um `UPDATE` de `status`. Não precisa de mais nada porque as funções SQL filtram `status = 'active'` a cada chamada e o DAL não persiste acesso — **o efeito é imediato na requisição seguinte, sem cache para invalidar**. É o retorno concreto da decisão de 2026-08-05 de nunca persistir acesso calculado: o desenho feito lá é o que torna esta fase quase trivial.

Auditoria: uma licença revogada acumula `granted` + `refunded` (ou `chargeback`) — exatamente a linha do tempo que uma disputa exige. `ensureAudited` serve os três eventos e continua consultando antes de inserir, então reprocessamento não duplica nem omite.

Comercial: **o ciclo fecha.** Compra libera, devolução revoga, tudo registrado. O que falta antes de abrir venda é o percurso real — comprar, receber, criar senha, acessar, reembolsar, confirmar a perda de acesso.

⚠️ **`cancelled` e `expired` não são tratados.** A Kiwify pode enviá-los; hoje caem em `ignored` e não revogam. Para compra única vitalícia raramente importa; vira relevante quando existir o Pro anual.

---

## 2026-08-07 — O produto é a única coisa que separa a nossa venda das outras

### Decisão
Antes de conceder licença, o webhook valida que o payload corresponde ao produto vendido por este app:

- **`KIWIFY_ESSENTIAL_PRODUCT_ID`** é o identificador principal; **`KIWIFY_ESSENTIAL_PRODUCT_NAME`** é reserva, usada só quando o payload não traz o id.
- **Nenhuma das duas configurada → compra aprovada falha fechada** (`product_config_missing`).
- **Produto de outra oferta → `ignored` + 200**, sem usuária, sem licença, sem auditoria.
- **Payload do botão "Testar Webhook" → `ignored` + 200**, detectado por sinais literais.
- **Revogação não exige produto identificado** — só é pulada quando o produto é *comprovadamente* outro.

Ordem das checagens: teste → produto → e-mail/pedido.

### Contexto
Fase 4-7I. O botão de teste da Kiwify disparou em produção, o handler tratou como compra real, tentou convidar `johndoe@example.com` e a linha ficou `failed`. O sintoma era chato; o risco atrás dele, não.

### Motivo

**Por que validar produto é sobre dinheiro, não sobre limpeza.** Se o webhook estiver cadastrado na Kiwify como *"todos os produtos que sou produtor"* — configuração comum e fácil de escolher sem pensar — a venda de **qualquer outra oferta** chega neste endpoint com `order_approved` legítimo, assinatura válida e e-mail real. Sem conferir o produto, cada uma dessas vendas libera uma licença do Doce Margem de graça. O identificador do produto é a única coisa no payload que distingue uma compra nossa das outras.

**Por que falhar fechado sem env.** Liberar quando não se sabe qual produto foi vendido é apostar que existe uma só oferta na conta da Kiwify. A aposta se perde exatamente no dia em que houver a segunda — e o prejuízo aparece antes do aviso. Falhar fechado custa uma variável de ambiente esquecida; falhar aberto custa licenças distribuídas sem venda.

**Por que os sinais de teste são literais, não heurísticos.** A direção do erro é assimétrica: classificar compra real como teste faz a compradora pagar e não receber nada. Por isso nada de "parece teste". `@example.com` é reservado pela RFC 2606 — **não existe caixa postal nesse domínio**, então nenhum cliente real pode ter esse e-mail; sozinho, é conclusivo. `"Example product"` é comparação exata, não "contém": um produto chamado "Exemplo de bolo" não pode cair ali.

A régua se mostrou estreita o suficiente para incomodar do jeito certo: **os fixtures de teste do próprio projeto usavam `@example.com` e passaram a ser ignorados**, obrigando a trocar o domínio das compradoras fictícias.

**Por que a revogação não exige produto identificado.** A instrução era validar em todos os eventos. Seguir literalmente inverteria a direção do erro: concessão incerta deve negar, mas **revogação incerta deve revogar**. Não revogar deixa acesso com quem tomou o dinheiro de volta. E a proteção já existe por outro caminho — a busca da licença é por `provider_order_id`, que limita o alcance ao que este app vendeu; um reembolso de outro produto simplesmente não acha licença. Para evitar ruído, `mismatch` (produto comprovadamente diferente) também pula a revogação; só `unknown` e `not_configured` seguem adiante.

**Por que teste vem antes de produto.** Sem a env configurada — o estado de hoje — checar produto primeiro faria o botão de teste virar `failed:product_config_missing` em vez de um `ignored` limpo. E "isso é uma venda nossa?" é logicamente anterior a "conseguimos processá-la?": reclamar de e-mail ausente num evento que nem é nosso é diagnóstico enganoso.

### Impacto
**Bloqueia a primeira venda até uma ação manual:** `KIWIFY_ESSENTIAL_PRODUCT_ID` precisa estar na Vercel. Sem ela, toda compra real vira `product_config_missing` e não libera. É o comportamento desejado, mas é uma armadilha se ninguém souber — daí o destaque no `.env.example`, no `TASKS.md` e no checklist de lançamento.

`KIWIFY_ESSENTIAL_PRODUCT_NAME` é frágil por natureza: renomear a oferta no painel sem atualizar a env quebra a liberação silenciosamente. Serve como reserva, nunca como escolha principal.

### Validação real posterior — 2026-08-08

Esta validação não cria uma regra nova; registra que as decisões desta seção e da
decisão **“Dinheiro devolvido não volta a virar acesso sozinho”** funcionaram no
ciclo comercial real em produção:

- O botão **“Testar Webhook”** retornou 200 e foi ignorado com segurança.
- Uma compra real do Doce Margem Essencial retornou 200; `compra_aprovada` ficou
  `processed`, a usuária foi criada, o convite chegou via Resend/Supabase SMTP e
  a compradora criou a senha.
- A licença Kiwify ficou `active`, `license_events` registrou `granted` e a
  usuária acessou `/conta`, `/ingredientes`, `/receitas`, `/precificacao` e
  `/configuracoes`.
- O reembolso real disparou o webhook; `compra_reembolsada` ficou `processed`, a
  licença mudou para `refunded`, `license_events` registrou `refunded` e a
  usuária perdeu o acesso, sendo redirecionada para `/acesso-bloqueado`.
- As licenças manuais e os webhooks antigos `failed`/`ignored` foram removidos. O
  estado final do banco manteve somente os eventos `processed` de auditoria da
  compra e do reembolso reais.

Limites que permanecem: o convite pode cair em spam; perfis antigos de teste
existem sem licença ativa; chargeback não foi exercitado manualmente de ponta a
ponta, embora use o mesmo mecanismo de revogação; a venda oficial ainda não foi
aberta; e copy, checkout, domínio, suporte e política de reembolso precisam ser
revistos antes da abertura.

---

## 2026-08-09 — A marca pública passa a ser Minha Fatia sem romper compatibilidade

### Decisão

O produto, os planos e o domínio público passam a ser apresentados como **Minha
Fatia**, **Minha Fatia Essencial**, **Minha Fatia Pro Anual** e
`https://www.minhafatia.com.br`.

O rebrand é deliberadamente apenas de apresentação e documentação. Permanecem
inalterados os endpoints, a rota `/api/webhooks/kiwify`, a autenticação, as
licenças, as migrations, o schema do Supabase, a validação Kiwify, as variáveis
de ambiente e o pricing engine.

Identificadores técnicos legados que poderiam invalidar dados ou integrações
também permanecem, entre eles o diretório e nome de pacote `doce-margem`, a chave
`doce-margem:app-state`, nomes de tipos/variáveis existentes e o marcador interno
`appName: "Doce Margem"` dos backups. Arquivos novos de backup passam a usar o
prefixo público `minha-fatia-backup-`, mas continuam importando o formato legado.

### Motivo

Renomear identificadores persistidos ou reconhecidos por sistemas externos junto
com a copy criaria um risco de perda de dados locais, rejeição de backups ou
falha na concessão de acesso. A marca muda para a usuária; os contratos técnicos
continuam estáveis até que exista uma migração própria, planejada e compatível.

### Impacto

Navbar, fluxos de login/cadastro/convite, páginas, cards de planos, metadata,
mensagens de backup e documentação passam a exibir Minha Fatia. Referências a
Doce Margem ficam restritas a registros históricos e identificadores técnicos
explicitamente preservados. A configuração externa do novo domínio continua
como etapa de go-live e não faz parte desta alteração de código.

---

## 2026-08-10 — Embalagens são custo direto calculado, não dado derivado persistido

### Decisão

A Fase P0-1 adiciona embalagens como cadastros locais (`name`,
`packageQuantity`, `purchasePrice`, `notes`) e calcula custo unitário e custo por
venda sempre a partir desses insumos. A seleção e a quantidade usada pertencem
à calculadora de Precificação e não são persistidas nesta fase.

No pricing engine, `packagingCost` é somado ao custo base da receita/CMV antes
dos percentuais de custo fixo e lucro e antes das taxas do canal. O resultado
preserva três valores explícitos: custo base, custo de embalagens e custo direto
total.

### Compatibilidade

`APP_STATE_STORAGE_KEY` e `APP_STATE_SCHEMA_VERSION` permanecem inalterados. O
novo array `packagings` é aditivo: estados e backups v1 anteriores, que não têm
esse campo, são normalizados para `[]` sem perder ingredientes, receitas, custos
fixos, canais ou configurações. `BACKUP_FORMAT_VERSION` também permanece em 1;
novos backups incluem embalagens automaticamente dentro do `AppState`, e os
anteriores continuam importáveis pelo mesmo caminho de normalização.

Nenhuma mudança foi feita em webhook/Kiwify, autenticação, licenças, variáveis
de ambiente, schema/migrations do Supabase ou SQL.

---

## 2026-08-10 — Valor/hora é configuração; tempo de produção pertence à simulação

### Decisão

A Fase P0-2 calcula mão de obra a partir do valor desejado da hora e do tempo de
produção informado em horas e minutos. O custo total é `valor/hora × tempo em
horas`; o custo por unidade é esse total dividido pelo rendimento da receita.

Somente `laborHourlyRate` é persistido em `BusinessSettings`, porque representa
uma configuração estável do negócio. Horas e minutos permanecem na simulação
atual da Precificação: nesta fase não há vínculo persistido entre uma receita e
seu tempo de produção, portanto salvar um tempo global poderia reaplicá-lo por
engano a outra receita.

No pricing engine, o custo unitário de mão de obra é somado ao custo unitário da
receita e às embalagens. Esse custo direto total entra antes dos percentuais de
custo fixo e lucro e antes das taxas do canal. Valor/hora ou tempo iguais a zero
são válidos e mantêm a calculadora funcionando.

### Compatibilidade

`APP_STATE_STORAGE_KEY`, `APP_STATE_SCHEMA_VERSION` e
`BACKUP_FORMAT_VERSION` permanecem inalterados. `laborHourlyRate` é um campo
aditivo em `BusinessSettings`: estados e backups v1 anteriores, sem o campo,
são normalizados para `null` sem perder os demais dados. O backup continua
exportando e importando o mesmo `AppState` v1.

Nenhuma mudança foi feita em webhook/Kiwify, autenticação, licenças, variáveis
de ambiente, schema/migrations do Supabase ou SQL.

---

## 2026-08-10 — P0-4 mantém um rascunho comercial local; histórico e clientes ficam no P1

### Decisão

A primeira versão de `/orcamentos` é um documento comercial independente da
ficha interna de precificação. Os itens, quantidades, valores unitários,
desconto e condições são informados manualmente. O documento destinado ao
cliente recebe somente esses dados comerciais e nunca recebe custo de receita,
embalagem, mão de obra, custo fixo, margem, markup, lucro esperado ou preço
sugerido interno.

Um único `quoteDraft` é salvo no `AppState` para que o trabalho atual sobreviva
ao recarregamento da página. Subtotal, desconto efetivo, totais por item e total
final são derivados por uma função pura e não são persistidos. A impressão usa
`window.print()` e CSS próprio para mostrar apenas o documento comercial.

### Compatibilidade e evolução

O campo `quoteDraft` é aditivo. `APP_STATE_STORAGE_KEY`,
`APP_STATE_SCHEMA_VERSION` e `BACKUP_FORMAT_VERSION` permanecem inalterados;
estados e backups v1 anteriores são normalizados com `quoteDraft: null` sem
perder os demais dados. O rascunho atual também participa do backup manual.

Cadastro e reaproveitamento de clientes, histórico, status e duplicação de
orçamentos ficam para a evolução P1. Um futuro botão “Imprimir receita” na área
de Receitas será um terceiro documento, separado tanto da ficha interna de
precificação quanto do orçamento para cliente.

Nenhuma mudança foi feita no pricing engine, webhook/Kiwify, autenticação,
licenças, variáveis de ambiente, Supabase, migrations ou SQL.

---

## 2026-08-11 — A identidade do orçamento é local, aditiva e separada da precificação

### Decisão

A personalização comercial fica em `quoteIdentity`, uma nova fatia do `AppState`
v1. Ela guarda nome da marca, logo como data URL, duas cores, contatos e condições
comerciais padrão. A seção de edição fica em `/configuracoes`; `/orcamentos`
consome a mesma fatia reativa e continua persistindo seu rascunho separadamente.

A logo aceita somente PNG, JPG/JPEG e WEBP de até 2 MB. Antes de salvar, o
navegador decodifica a imagem, limita suas dimensões, compacta em WEBP por canvas
e recusa o resultado se ele continuar grande demais para a cota local. O mesmo
canvas amostra pixels para sugerir duas cores, descartando transparência, branco
e preto puros quando há outras opções. A usuária pode substituir ambas por cores
hexadecimais; a renderização deriva contraste legível sem mudar a paleta salva.

O documento comercial recebe `QuoteDraft` e `QuoteIdentity`, mas não recebe
nenhuma estrutura ou resultado da precificação. Assim, logo, marca, contatos e
cores aparecem na tela e em `window.print()`, enquanto custos de receita,
embalagem e mão de obra, custo fixo, margem, markup e lucro seguem ausentes.

### Compatibilidade

`quoteIdentity` é aditivo. `APP_STATE_STORAGE_KEY`, `APP_STATE_SCHEMA_VERSION` e
`BACKUP_FORMAT_VERSION` permanecem inalterados; estado ou backup v1 antigo sem a
fatia recebe o fallback “Minha Fatia”, cores seguras e logo nula. Backups novos
incluem a identidade e a logo compactada automaticamente dentro do mesmo
`AppState`.

Nenhuma dependência foi adicionada. Não houve mudança em fórmulas de
precificação, webhook/Kiwify, autenticação, licenças, variáveis de ambiente,
Supabase, migrations ou SQL.

---

## 2026-08-11 — A ficha técnica imprimível apresenta o cálculo da receita sem criar outro cálculo

### Decisão

A Fase P0-5 adiciona um terceiro documento interno e independente: a ficha
técnica da receita. Cada receita válida em `/receitas` oferece “Imprimir receita”.
O clique seleciona o cadastro, calcula-o pela função pública `calculateRecipe`
com os mapas atuais de ingredientes e receitas e só então chama `window.print()`.

O novo `RecipePrintableSheet` recebe um `CalculatedRecipe` pronto. Ele não
converte unidades, não calcula perdas e não soma custos por conta própria: apenas
formata os itens calculados, o custo bruto, o custo total com perda e o custo por
unidade. Itens de ingrediente, medida caseira e sub-receita usam o detalhamento
da união `CalculatedRecipeItem`, mantendo inclusive o custo correspondente da
sub-receita. Observações aparecem somente quando já existem no modelo salvo.

CSS específico oculta navegação, formulário, listagem, botões e elementos
auxiliares na impressão. O resultado é separado tanto da ficha interna de
precificação — que inclui mão de obra, embalagens, margem e preço — quanto do
orçamento comercial para cliente.

### Compatibilidade

Nenhum dado novo é persistido. `Recipe`, `AppState`, `APP_STATE_STORAGE_KEY`,
`APP_STATE_SCHEMA_VERSION` e `BACKUP_FORMAT_VERSION` permanecem inalterados.
Também não houve mudança em fórmulas de receita, pricing engine, orçamento,
webhook/Kiwify, autenticação, licenças, variáveis de ambiente, Supabase,
migrations ou SQL, nem adição de dependência.

---

## 2026-08-11 — O fluxo pré-lançamento orienta sem criar estado ou regra de negócio

### Decisão

A Fase P0-6 apresenta a jornada principal do Essencial sempre na mesma ordem:
Ingredientes → Receitas → Embalagens → Precificação → Orçamento. O Painel funciona
como ponto de partida, com links e textos de ação para todas as etapas já disponíveis;
as próprias páginas repetem apenas a posição atual e o próximo pré-requisito relevante.

Estados vazios são tratados como orientação de uso. Eles explicam o que falta e levam
à tela correta, mas não criam progresso persistido nem inferem que uma precificação ou
um orçamento foi concluído. “Ficha interna de precificação”, “Ficha técnica da receita”
e “Orçamento” continuam sendo documentos distintos, e Embalagens e Mão de obra
continuam recursos do Essencial.

### Limites

O polimento altera somente navegação, hierarquia visual, CTAs e microcopy. Nenhum
cálculo, validação de domínio, fórmula, total comercial ou contrato de persistência é
alterado. `APP_STATE_STORAGE_KEY`, AppState, backups, dependências, webhook/Kiwify,
autenticação, licenças, variáveis de ambiente, Supabase, migrations e SQL permanecem
inalterados.

---

## 2026-08-12 — A oferta atual é o Essencial; o Pro é futuro e não compõe a promessa de compra

### Decisão

A comunicação comercial da Fase P0-7 apresenta o Minha Fatia como ferramenta de
apoio à gestão e precificação para pequenos negócios de produção artesanal. A promessa
é organizar custos e apoiar a formação do preço com os dados informados pela usuária;
não há promessa de lucro garantido ou substituição da decisão do negócio.

O Minha Fatia Essencial é a única oferta principal atual: R$ 97 à vista no crédito ou
Pix, ou 12x de R$ 10,03, em compra única, sem mensalidade no Essencial e com acesso
vitalício à versão Essencial atual. O Pro Anual é comunicado como possibilidade futura
para nuvem, automação, IA e relatórios, sem preço ou data anunciados. A página não
promete que toda evolução futura fará parte da compra atual.

### Expectativas de compra e uso

A copy explica que o e-mail usado no checkout recebe o convite de acesso e deve ser o
mesmo usado para entrar. Também torna explícito que os dados operacionais do Essencial
ficam neste navegador e exigem backup manual antes de trocar de aparelho ou limpar os
dados locais.

O aviso contábil é informativo: o Minha Fatia não substitui contador, e impostos,
regime tributário e obrigações fiscais precisam ser avaliados conforme o negócio. Não
foi criado CTA, integração ou fluxo “Fale com contador”; essa possibilidade fica apenas
no backlog para definição futura.

### Limites técnicos

Esta fase altera somente copy, CTAs internos e hierarquia visual. O endereço de checkout
já configurado continua sendo consumido pela mesma variável pública; nenhum env, product
ID, webhook/Kiwify, Supabase, autenticação, licença, banco, migration ou SQL foi alterado.
Fórmulas, pricing engine, `calculateRecipe`, persistência e dependências também permanecem
inalterados.

---

## 2026-08-12 — O pós-venda mínimo precede a venda pública

### Decisão

A Fase P0-8A entrega os quatro itens de pós-venda que a auditoria P0-8 apontou como o
maior risco antes de abrir a venda: **recuperação de senha**, **canal de suporte
visível**, **páginas legais mínimas** (`/termos`, `/privacidade`, `/reembolso`) e
**aviso fiscal dentro da Precificação**, além do total do parcelamento em `/precos`.

O critério que separa o que entrou do que ficou de fora: entra o que evita cliente
pagante sem produto ou sem interlocutor. Melhoria de experiência não entra.

### Recuperação de senha reaproveita o Supabase Auth existente

Nenhuma tabela, migration ou SQL foi criada. O fluxo usa `resetPasswordForEmail` e
`updateUser`, as mesmas APIs que o convite de compra já usa desde a Fase 4-7G-convite.

Duas decisões dentro dele:

1. **A resposta do pedido de link é sempre a mesma**, exista ou não a conta. A tela é
   pública; diferenciar as mensagens a transformaria num verificador de base de
   usuárias. A única exceção é o limite de tentativas, que não revela existência
   nenhuma.
2. **`setRecoveryPasswordAction` não compartilha código com `setInvitedPasswordAction`.**
   São os dois momentos em que uma senha nasce, e cada um tem a sua mensagem de
   expiração. Unificá-las economizaria dez linhas e criaria um ponto onde um ajuste na
   recuperação quebra, sem aviso, a entrega de quem acabou de comprar — o fluxo mais
   caro do produto. A duplicação é deliberada e está comentada nos dois lados.

`/auth/nova-senha` aceita as três formas em que a sessão de recuperação pode chegar
(fragment, `?code=` do PKCE e sessão já ativa), porque o formato depende de configuração
do painel do Supabase que o código não controla — e uma tela de recuperação que só
funciona num dos formatos trava exatamente quem já está travada. `InviteHashRescue`
passou a decidir o destino pelo `type` do fragment: `recovery` vai para a nova tela,
qualquer outro caso segue para o convite, como antes.

### Suporte como constante em código, não como env

O canal vive em `lib/support.ts`, ponto único que sabe como falar com o suporte. Não
virou env por duas razões: `.env` não podia ser alterado nesta fase, e uma env ausente
em produção deixaria todos os CTAs apontando para lugar nenhum, em silêncio — que é
exatamente o defeito que a fase veio corrigir. Migrar para env continua sendo uma troca
de uma linha, se um dia fizer sentido.

O WhatsApp oficial de atendimento é **+55 21 95905-4988** (`wa.me/5521959054988`),
configurado ao fechar a P0-8A. O placeholder usado durante a implementação saiu do
projeto com a edição de uma única constante — que era justamente o teste da decisão de
centralizar o canal.

### Aviso fiscal é informação, não encaminhamento

O aviso em `/precificacao` diz que impostos não entram automaticamente no cálculo e
sugere considerá-los no custo fixo. **Não** é um CTA: não leva a lugar nenhum, não
indica profissional e não promete encaminhamento. "Fale com contador" continua fora do
produto, apenas no backlog, como decidido na P0-7.

Ele fica na página, e não dentro de `PricingForm`, para não encostar em nada que
participe do cálculo, e carrega `pricing-print-hidden` para não sair impresso na Ficha
interna de precificação.

### Política de reembolso não cria garantia própria

`/reembolso` remete às condições apresentadas no checkout e cita o direito de
arrependimento de 7 dias do artigo 49 do CDC, que existe por lei e não por promessa
nossa. Prometer prazo próprio diferente do checkout é a divergência que vira reclamação.
A página afirma sobre acesso apenas o que o produto comprovadamente faz: reembolso e
chargeback processados encerram o acesso (Fase 4-7H, validada em produção).

### Limites técnicos

Nenhuma dependência nova. Nenhum env, product ID, webhook/Kiwify, migration, SQL,
licença ou regra de liberação/revogação de acesso foi alterado. Fórmulas, pricing
engine, `calculateRecipe` e a persistência local permanecem intocados — nenhum arquivo
de `modules/` foi editado.

---

## 2026-08-12 — Modo avançado é organização de experiência, não cálculo novo

### Decisão

A Fase P0-9A entrega o **Modo avançado** como uma área opcional e recolhida, reunindo
três ajustes que **já existiam no motor desde a Fase 1** e já afetavam o custo:

| Onde | Campo | Fórmula (inalterada) |
|---|---|---|
| Ingredientes | Fator de correção | `quantidade corrigida = quantidade × fator` (Fase 1A) |
| Receitas | Perda de produção (%) | `custo com perda = custo bruto / (1 − perda/100)` (Fase 1B-1) |
| Receitas | Observações técnicas | nenhuma — texto interno |

**Nenhuma fórmula foi criada, alterada ou reinterpretada.** Nenhum arquivo de
`modules/` ou `services/` foi tocado. A fase é de interface.

### O problema que ela resolve

Fator de correção e perda de produção já eram campos **fixos e sempre visíveis**, cada
um com uma dica que dizia, em resumo, "ignore isto": *"Deixe 1 se você não sabe o que é
isso"* e *"Deixe 0 se não sabe o que é isso"*.

Isso é o pior dos dois mundos. A iniciante encara dois campos técnicos logo na Etapa 1 e
é instruída a não entendê-los; a usuária avançada não recebe explicação nenhuma de como
usá-los. Recolher com explicação de verdade atende as duas: a primeira não esbarra no
campo, a segunda encontra o que procurava.

### Regras da área avançada

1. **Recolhida por padrão**, com selo "opcional". A jornada simples não muda.
2. **Abre sozinha quando já existe ajuste aplicado** no item em edição. Esconder um
   valor que mexe no custo seria pior do que mostrá-lo.
3. **O estado inicial de aberto é congelado no primeiro render.** Se dependesse do valor
   atual, apagar o campo para redigitar fecharia a seção no meio da edição.
4. **`<details>` nativo, não estado em React** — funciona sem JavaScript, já vem com
   teclado e leitor de tela resolvidos, e não precisa ser reinicializado no remount por
   `key` que os formulários usam ao entrar em edição.
5. **O efeito aparece antes de salvar**, calculado pelas próprias funções de domínio
   (`applyCorrectionFactor`, `calculateRecipe`) — a UI não repete a conta. Se a
   semântica mudar um dia, o texto muda junto.

### Ajuste que mexe no custo não pode ficar invisível

Onde o valor aparece depois de aplicado:

- **Ficha técnica da receita:** perda de produção, fator por item quando ≠ 1, e a nota de
  que o fator já está embutido nos custos da tabela.
- **Precificação e Ficha interna de precificação:** o percentual de perda considerado,
  identificado como já embutido no custo da receita. É exibição pura — `PricingResult` e
  `PricingPrintableSheet` receberam uma prop opcional; o pricing engine não sabe que ela
  existe.
- **Orçamento para cliente:** em lugar nenhum. Nada disso atravessa para o documento
  comercial.

### Observações técnicas: campo antigo, interface nova

`Recipe.notes` existia em `types/pricing.ts` desde a Fase 1B-1 e já era impresso na Ficha
técnica — só não havia onde escrevê-lo. A P0-9A criou o campo na interface.

Isso revelou um **defeito silencioso**: `RecipeForm` remontava o `Recipe` ao salvar sem
copiar `notes`, então editar uma receita apagaria a observação. Latente enquanto nada
gravava o campo, real a partir do momento em que a interface passou a gravá-lo. Corrigido
na mesma fase.

`notes` só é gravado quando tem conteúdo — receita sem observação continua sem a chave,
igual aos dados antigos. Nenhuma migração de dados locais foi necessária:
`normalizeAppState` guarda `recipes` como estão, e o campo sempre foi opcional.

### `advanced_mode` deixou de ser promessa

`lib/features.ts` reclassificou `advanced_mode` de `planned` para `available`, e a
`MATRIZ_APROVADA` congelada em `lib/features-examples.ts` foi atualizada junto — é
justamente esse o mecanismo: mudar o status sem confirmar na matriz quebra a validação em
vez de passar batido. A página de planos deixa de marcá-lo como "Em desenvolvimento"
automaticamente, porque a lista sai da matriz.

**Sub-receitas e medidas caseiras continuam `planned`**, e continuam anunciadas como em
desenvolvimento. São as Fases P0-9B e P0-9C, cada uma com interface própria. O critério
para reclassificar qualquer uma delas é o mesmo aplicado aqui: a tela existir.

⚠️ Registrado para a P0-9B/P0-9C: `RecipeForm` descarta itens que não sejam
`kind: "ingredient"` ao editar. Hoje é inócuo, porque a interface nunca cria outro tipo.
No dia em que criar, editar uma receita apagaria suas sub-receitas — resolver **junto**
com a interface, não depois.

---

## 2026-08-13 — Sub-receitas expõem o motor existente, com duas travas na interface

### Decisão

A Fase P0-9B liga sub-receitas na tela de Receitas. Como na P0-9A, **nenhuma fórmula foi
criada ou alterada**: o cálculo, a validação e a proteção contra referência circular
existem desde a Fase 1B-2. Nenhum arquivo de `modules/`, `services/` ou `types/` foi
tocado.

A conta que já existia:

```
custo por unidade de rendimento = custo total com perda da sub-receita / rendimento dela
custo do item                   = quantidade usada (convertida) × custo por unidade
```

### A correção veio antes do recurso

`RecipeForm` inicializava `items` com `editingRecipe.items.filter(kind === "ingredient")`.
Salvar uma edição, portanto, **descartava silenciosamente** qualquer item de outro tipo.

Isso estava documentado como inócuo — e era, enquanto a interface não criava outro tipo.
Ligar sub-receitas sem corrigir transformaria "editar o nome da receita" em "apagar o
recheio". A correção foi a primeira coisa feita nesta fase, não a última.

O ganho atravessa para a P0-9C: itens de medida caseira vindos de um backup importado
agora sobrevivem à edição, mesmo sem interface para editá-los.

### O `id` real no candidato não é detalhe

`validateRecipe` detecta ciclo comparando a receita com seus ancestrais. O formulário
montava o candidato com `id: ""`, então a receita **nunca se reconhecia** na própria
árvore: adicionar "Bolo de pote" dentro de "Bolo de pote" passava pela validação e só
quebrava depois, na leitura, com a receita já gravada e sem calcular.

Agora o candidato carrega o id real da receita em edição. `updateRecipe` preserva o id
original de qualquer forma, então a persistência não muda — o que muda é a validação
enxergar o que precisa enxergar. Uma verificação isolada confirma os dois lados: com id
real o ciclo é pego, com `id: ""` passa despercebido.

### Duas travas na interface, ambas reaproveitando o domínio

1. **Ciclo.** A receita em edição não aparece na própria lista, e cada inclusão monta a
   receita como ela ficaria e pergunta a `validateRecipe`, filtrando por
   `CIRCULAR_REFERENCE`. Os demais erros são ignorados de propósito: o formulário ainda
   pode estar incompleto, e o que se quer saber ali é só se há ciclo. A usuária vê
   *"Essa sub-receita criaria um ciclo"* **antes** de o item entrar na lista.

2. **Unidade do rendimento.** `SubRecipeItem.unit` é `PurchaseUnit`, e
   `isUnitCompatibleWithYield` compara com o rendimento da sub-receita. Rendimento em
   texto livre ("porções", "fatias") não casa com nenhuma unidade de compra — o item
   seria **sempre** recusado. Então o seletor só oferece receitas com rendimento em g,
   kg, ml, l ou un, e diz quantas ficaram de fora e por quê.

   ⚠️ **Limitação assumida.** Resolver de verdade exigiria mexer no domínio, o que esta
   fase não faz. Filtrar e explicar é honesto; deixar escolher para falhar depois, não.

### O que a fase deliberadamente não fez

- **Não transformou a ficha técnica em árvore.** A sub-receita aparece como um
  componente com nome, tipo, quantidade e custo, mais uma nota de que há componentes
  vindos de outras receitas. `CalculatedSubRecipeItem` carrega a sub-receita calculada
  inteira, e expandir isso é possível — mas seria outra fase, com outro objetivo.
- **Não mexeu na Precificação.** `PricingForm` já montava `recipesById` e passava para
  `calculateRecipe` desde a Fase 2-5: receitas com sub-receitas funcionam lá sem uma
  linha de mudança.
- **Não tocou no orçamento.** Nenhum componente interno atravessa para o documento do
  cliente.

### `sub_recipes` deixou de ser promessa

`lib/features.ts` foi para `available`, com a `MATRIZ_APROVADA` confirmada junto — o
guard existe para forçar essa confirmação. Uma asserção que usava `sub_recipes` como
exemplo de "recurso planejado do Essencial" passou a usar `household_measures`, senão o
rótulo do teste mentiria. **Medidas caseiras seguem `planned`** e continuam anunciadas
como em desenvolvimento; é a P0-9C, e o critério para reclassificar é o mesmo: a tela
existir.


---

## 2026-08-13 — Unidade livre foi o defeito; conversão sem lastro seria o próximo

### Decisão

A Fase P0-9C fecha a trinca do "avançado básico" com três entregas ligadas pelo mesmo
fio: **a usuária precisa conseguir informar quantidade e rendimento de um jeito que o
app entenda, sem precisar aprender o vocabulário do app.**

Nenhuma fórmula foi criada ou alterada. Nenhum arquivo de `modules/`, `services/` ou
`types/` foi tocado.

### 1. Unidade de rendimento: campo livre era uma armadilha

O rendimento era texto livre. Quem escreveu "gr" ficou com uma receita que **não podia
virar sub-receita** — `isUnitCompatibleWithYield` compara com as cinco unidades
canônicas, e "gr" não é nenhuma delas. A receita parecia certa, e o app dizia não sem
explicar por quê. Foi encontrado na prática, depois da P0-9B.

Agora é seletor. E `lib/recipe-units.ts` traduz o que já está gravado: `gr/grama/gramas`,
`quilo/kilo`, `mililitro/mls`, `litro/lt`, `unidade/und/unid`.

Três decisões dentro disso:

1. **A normalização mora em `lib/`, não em `modules/pricing/`.** O domínio conhece cinco
   unidades canônicas e nada mais; tolerar o que a usuária digitou é responsabilidade da
   camada de aplicação. Misturar as duas coisas faria o domínio carregar sinônimos de
   português para sempre.
2. **Normaliza na leitura do store, não no `storageService`.** O arquivo gravado só muda
   quando a usuária salva alguma coisa. Nada é reescrito por baixo dela.
3. **"Porções", "fatias" e "pedaços" NÃO são normalizadas.** Parecem contagem, e mapear
   para "un" seria fácil — mas apagaria a informação que ela quis registrar e mudaria o
   significado do número dela sem avisar. Continuam legíveis, continuam selecionáveis na
   edição como "unidade livre", e a tela explica o que isso impede.

### 2. Medidas caseiras: só conversão que dá para defender

`lib/household-input.ts` deriva as opções **do ingrediente escolhido**, nunca de uma
lista fixa. É a regra que governa o arquivo inteiro.

O motivo é aritmético e caro: 1 xícara de farinha são 120 g, 1 xícara de açúcar são
180 g. Num app de precificação, um número errado aqui vira **preço errado na ponta, em
silêncio**. Oferecer "xícara" para qualquer coisa seria transformar uma ajuda em risco.

Dois mecanismos, de propósito diferentes:

- **Embalagem** (lata de leite condensado, caixinha de creme de leite): peso de fábrica,
  independe de densidade. Vira item de ingrediente comum, já convertido — o domínio nem
  fica sabendo, e não precisa: 395 g são 395 g. Cada preset é preso ao **nome** do
  ingrediente: oferecer "lata" para cacau colocaria 395 g de cacau na receita.
- **Medida caseira** (xícara, meia xícara, colher de sopa, colher de chá): depende de
  densidade. Vira `HouseholdMeasureRecipeItem`, e a conversão acontece **dentro** do
  domínio, pela tabela da Fase 1B-3 — onde pode ser auditada, corrigida e reencontrada
  pela ficha técnica na impressão.

Quando não há referência confiável, a resposta é honesta: *"Ainda não temos uma conversão
segura para esse ingrediente. Use g ou ml."* É melhor a usuária pesar do que o app
chutar. Ingrediente contado em `un` nunca recebe medida caseira — o validador do domínio
recusa, e uma xícara de ovos não significa nada.

### 3. Assistente de rendimento real: calcula, mas não aplica sozinho

Ninguém sabe de cabeça que 1000 g virando 920 g são 8% de perda. A usuária informa os
dois números e o app mostra o percentual, com um botão para aplicar.

**O campo não é preenchido automaticamente.** Preencher sozinho mudaria o custo dela sem
ela pedir, e a fórmula da perda — validada desde a Fase 1B-1 — passaria a ser alimentada
por um palpite do app. O assistente calcula; a decisão continua sendo dela.

A sugestão do "quanto entrou" só aparece quando **todos** os itens compartilham a mesma
dimensão física. Misturar 500 g de chocolate com 200 ml de creme daria 700 de nada: sem
densidade, massa e volume não se somam. Nesse caso o app não soma e explica que o certo é
pesar o resultado pronto.

### O Essencial não promete mais nada em desenvolvimento

Com `household_measures` em `available`, **nenhum recurso do Essencial continua marcado
como "Em desenvolvimento"** na página de planos. Isso fecha, em produto, o risco que a
auditoria P0-8 levantou: a distância entre o que a página promete e o que a compradora
encontra no primeiro acesso.

A asserção da matriz que dependia de existir um recurso planejado no Essencial foi
substituída pela invariante que passou a valer — *nenhum recurso do Essencial está
planejado* —, que é a que interessa vigiar daqui em diante.

### O que ficou de fora, e por quê

- **Upload de receita:** exige decidir formato, mapeamento de ingredientes e o que fazer
  com o que não casar. Fase própria.
- **Tabela nutricional:** ⚠️ tem implicação **regulatória** (rotulagem de alimentos,
  RDC/ANVISA). Um número errado num rótulo vira problema legal da usuária, não só do app.
  Não deve sair sem decisão explícita, fonte de dados confiável e ressalva de
  responsabilidade — candidato a P1/Pro, nunca ao Essencial sem essa conversa.


---

## 2026-08-14 — A nuvem é cópia, não origem

### Decisão

A Fase P0-10 guarda o estado da usuária em `public.user_app_state` (uma linha por
conta, `AppState` inteiro em JSONB) enquanto ela estiver logada. O `localStorage`
**continua sendo a fonte que a interface lê**, de forma síncrona; a nuvem é uma cópia.

Essa inversão é o que torna a fase viável agora. A incompatibilidade registrada em
2026-08-05 — `useSyncExternalStore` exige `getSnapshot()` síncrono e o Supabase é
assíncrono — continua de pé, e foi estimada em 16 a 24 horas no roadmap. Tratando a
nuvem como cópia, os oito stores não mudam uma linha: eles continuam lendo o
`localStorage`, e a hidratação escreve lá antes de mandá-los recarregar.

### JSONB, não oito tabelas

O `AppState` já é um documento único, versionado, que o app grava e lê inteiro.
Normalizar ingredientes, receitas, embalagens, custos fixos, canais, configurações,
identidade e rascunho de orçamento exigiria oito migrations, oito conjuntos de policies
e uma camada de mapeamento — para entregar, hoje, exatamente a mesma coisa: não perder
os dados ao trocar de navegador.

Normalizar é o passo certo quando houver **consulta por entidade** (relatórios,
histórico de preços, alertas de aumento de custo). Não é este passo.

### A regra de conflito mora fora do componente

`lib/cloud-sync-decision.ts` é uma função pura. É a única linha do projeto que pode
apagar o trabalho da usuária, então não convive com `useEffect`, cliente Supabase e
timer: recebe fatos, devolve decisão, e é exercitada isolada (19 verificações).

**A regra que justifica o arquivo inteiro:** um navegador que nunca gravou nada monta um
estado vazio com `updatedAt` de *agora* — o instante mais recente possível. Comparar
datas nesse caso faria o vazio ganhar de qualquer nuvem, **sempre**, e trocar de aparelho
apagaria tudo. Daí `hasStoredAppState()` existir no `storageService`: ele separa "nunca
gravou" de "gravou e está vazio", distinção que `loadAppState()` não consegue fazer.

Ao hidratar, o app grava preservando o `updatedAt` da nuvem. Sem isso o navegador ficaria
"mais novo" que a origem do dado que acabou de receber, e devolveria a mesma cópia no
carregamento seguinte — tráfego inútil e, pior, um navegador parado ganhando disputas com
dado que ele só recebeu.

⚠️ **Limite assumido:** as duas datas vêm do relógio do navegador. Aparelho com relógio
muito errado pode perder uma alteração mais nova. É o custo de "último a escrever vence"
sem servidor autoritativo. Merge por entidade é outra fase, e só vale a pena com relato
real de conflito.

### Falhar em silêncio é requisito, não descuido

`services/cloud-app-state.ts` nunca lança: todo caminho vira resultado tipado. Em
particular, `missing-table` é distinguido de erro genérico **de propósito** — enquanto a
migration 0005 não for aplicada, o app precisa dizer "salvo neste navegador", não "erro
ao salvar". Falha de rede também é separada de erro de banco: uma se resolve sozinha (e o
ouvinte de `online` reenvia), a outra não.

O aviso de gravação no `storageService` engole exceção de assinante pelo mesmo motivo:
falha de sincronização não pode virar falha de salvar.

### Fronteira comercial: em aberto, de propósito

`cloud_sync` continua classificado como **Pro** em `lib/features.ts`, e `/precos`
continua sem anunciar nuvem no Essencial. Isso é deliberado: a P0-10 entregou
salvamento em nuvem para quem tem o Essencial, o que **erode** a proposta de valor
registrada em 2026-08-06 ("Pro Anual reservado a recorrência, nuvem, automação, IA e
relatórios") e detalhada no roadmap ("Sincronização em nuvem: seus dados no celular e no
computador, sempre iguais").

Há uma distinção real — cópia de segurança automática com último-a-escrever-vence ×
sincronização com merge, tempo real e resolução de conflito —, mas ela é sutil demais
para sustentar sozinha a diferença de preço, e uma compradora não vai enxergá-la.

**Não é decisão técnica.** Quem define a oferta precisa escolher entre: (a) posicionar a
cópia em nuvem como parte do Essencial e reconstruir o valor do Pro sobre os outros
quatro eixos; (b) mantê-la discreta, sem virar argumento de venda; ou (c) restringi-la
ao Pro. Enquanto não houver decisão, o código entrega e a página não promete.
