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
