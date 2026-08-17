# Minha Fatia

> **Organize seus custos e forme preços com mais clareza.** Uma ferramenta prática para apoiar as decisões do seu negócio artesanal.

App de **gestão de custos e precificação para pequenos negócios de produção artesanal**. Reúne ingredientes, receitas, embalagens e mão de obra, calcula custos e preços sugeridos e gera documentos internos e Orçamentos para cliente — sem prometer lucro ou substituir a decisão de quem conhece o próprio negócio.

> Este README é a **especificação viva** do projeto. Sempre que uma decisão estrutural importante for tomada, ele deve ser atualizado.

> **Rebrand (2026-08-09):** Minha Fatia é a marca pública atual do produto, antes chamado Doce Margem. Identificadores técnicos legados como `C:\dev\doce-margem`, o nome do pacote, chaves de armazenamento e marcadores de compatibilidade de backup permanecem inalterados para não quebrar instalações, dados ou integrações existentes. O domínio público da nova marca é [https://www.minhafatia.com.br](https://www.minhafatia.com.br).

---

## 1. Visão geral

Quem produz doces, salgados e encomendas artesanais frequentemente define preços sem reunir todos os custos. O **Minha Fatia** ajuda a organizar esses dados e transformá-los em números claros para apoiar a formação do preço.

- **Objetivo do produto:** dar clareza sobre custos, preço sugerido e margem a pequenos negócios de produção artesanal.
- **Público-alvo:** confeiteiras, doceiras, produtoras de salgados e pequenos negócios de encomendas e delivery artesanal.
- **Promessa principal:** "Organize seus custos e forme preços com mais clareza."
- **Limite da ferramenta:** o Minha Fatia apoia a gestão e a precificação; não garante lucro e não substitui orientação contábil. Impostos, regime tributário e obrigações fiscais variam conforme o negócio.

---

## 2. Modelo comercial

A oferta disponível hoje é o **Minha Fatia Essencial**. O Pro Anual é uma possibilidade futura para recursos avançados; não há data nem preço anunciados.

### Minha Fatia Essencial — compra única
- Pagamento único.
- **Sem mensalidade e sem renovação no Essencial.**
- **Acesso vitalício à versão Essencial atual** (não promete funções futuras).
- Acesso com login, controlado por licença.
- Sem arquivo baixável e sem link público aberto.
- Acesso vinculado ao status da compra: **reembolso, chargeback ou bloqueio manual removem o acesso.**

### Minha Fatia Pro Anual — futuro
- Ainda não está disponível para compra e não tem data ou preço anunciados.
- Poderá reunir recursos avançados, dados em nuvem, múltiplos dispositivos, automação, IA e relatórios.
- Quando existir, será um plano anual separado, sem opção mensal.

**Regra comercial importante:** a compra única é "acesso vitalício à versão Essencial **atual**". Recursos novos e avançados poderão pertencer ao Pro Anual futuro.

---

## 3. Recursos por plano (feature flags)

| Recurso | Essencial | Pro Anual futuro |
|---|:---:|:---:|
| Cadastro de ingredientes | ✅ | ✅ |
| Ficha técnica / receitas | ✅ | ✅ |
| Sub-receitas (receita dentro de receita) | ✅ | ✅ |
| Medidas caseiras (lata, caixinha, xícara, colher) | ✅ | ✅ |
| Impressão da ficha técnica da receita | ✅ | ✅ |
| CMV, custo unitário | ✅ | ✅ |
| Preço sugerido, margem, markup | ✅ | ✅ |
| Preço por canal (básico) | ✅ | ✅ |
| Custos fixos | ✅ | ✅ |
| Cadastro e custo de embalagens | ✅ | ✅ |
| Mão de obra / tempo de produção | ✅ | ✅ |
| Ficha interna de precificação | ✅ | ✅ |
| Orçamento simples para cliente | ✅ | ✅ |
| Clientes cadastradas | ✅ | ✅ |
| Histórico de orçamentos salvos | ✅ | ✅ |
| Compartilhar orçamento no WhatsApp | ✅ | ✅ |
| Identidade visual do orçamento | ✅ | ✅ |
| Backup export / import | ✅ | ✅ |
| Templates básicos de receitas | ✅ | ✅ |
| Modo simples + avançado básico | ✅ | ✅ |
| Modo avançado (fator de correção, perda, observações) | ✅ | ✅ |
| Histórico de preços dos ingredientes | — | ✅ |
| Alerta de aumento de custo | — | ✅ |
| Sincronização em nuvem / multi-dispositivo | — | ✅ |
| Scanner de nota/cupom com IA | — | ✅ |
| Relatórios avançados | — | ✅ |
| Exportação avançada em PDF | — | ✅ |
| Engenharia de cardápio avançada | — | ✅ |
| Biblioteca premium de canais | — | ✅ |
| Templates avançados | — | ✅ |
| Colaboração/comunidade (futuro) | — | ✅ |

As permissões são centralizadas em **feature flags** (`lib/features.ts` — Fase 4) e checadas por uma função única `canAccessFeature(userAccess, featureKey)`. **Nunca espalhar condicionais de plano pelo app.**

Os itens avançados da coluna Pro são planejamento, não uma oferta disponível. Os recursos do Essencial marcados como ainda em desenvolvimento permanecem identificados dessa forma na página pública de preços.

> ⚠️ **Decisão comercial em aberto (P0-10).** A linha "Sincronização em nuvem / multi-dispositivo" continua marcada como Pro nesta tabela e em `lib/features.ts`, mas a Fase P0-10 passou a **salvar automaticamente na nuvem para quem tem o Essencial** (ver §11-B). São coisas diferentes — cópia de segurança automática × sincronização com merge e tempo real —, e a distância entre elas é sutil demais para uma compradora. Enquanto a fronteira não for redecidida, `/precos` **não** anuncia salvamento em nuvem no Essencial. A classificação de `cloud_sync` não foi alterada nesta fase de propósito: é decisão comercial, não técnica.

---

## 4. Arquitetura planejada

Princípios:
- **Lógica de cálculo 100% separada da UI** (módulos puros e testáveis em `modules/`).
- **Persistência desacoplada** por trás de um `storageService` (localStorage é o cache de leitura; a cópia em nuvem entrou na Fase P0-10). Nunca acoplar a UI direto ao `localStorage`.
- **Permissões validadas no backend**, não só no frontend.
- **Mobile first / PWA-ready.**

Fluxo de acesso (Fase 4+):

```
login (Supabase Auth)
  → getCurrentUserAccess()   // lê licenses do usuário
    → hasEssentialAccess() / hasProAccess()
      → canAccessFeature(access, FEATURE)  // libera/bloqueia recurso
```

Webhooks (Fase 5) atualizam a tabela `licenses` a partir de eventos de Kiwify/Hotmart, com idempotência via `webhook_events`.

---

## 5. Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **ESLint**
- **Supabase** (Auth, Postgres, RLS) — preparado a partir da Fase 4
- Arquitetura modular, componentes reutilizáveis, validação de dados
- Foco **mobile first**, preparado para **PWA**

---

## 6. Estrutura de pastas

```
C:\dev\doce-margem
  app/            # rotas (App Router): públicas, /app/*, /admin/*, /api/webhooks/*
  components/     # componentes de UI reutilizáveis
  lib/            # utilitários, feature flags, helpers de acesso
  modules/        # LÓGICA DE NEGÓCIO PURA (cálculo de precificação) — sem UI
  services/       # camada de persistência/integração (storageService, supabase client)
  types/          # tipos TypeScript compartilhados
  hooks/          # React hooks reutilizáveis
  supabase/       # schema, migrations, policies (RLS)
  public/         # estáticos, manifest PWA, ícones
  README.md       # mapa e especificação viva
  TASKS.md        # controle de tarefas por fase
  REVIEW.md       # revisão técnica, riscos e pendências
  .env.example    # variáveis de ambiente (template)
```

---

## 7. Principais módulos (a implementar na Fase 1)

```
modules/pricing/
  units.ts            # conversões (kg→g, l→ml), custo por g/ml/unidade
  ingredients.ts      # custo de ingredientes, fator de correção, perda
  recipes.ts          # ficha técnica, rendimento, custo total e unitário
  channels.ts         # taxas %, taxa fixa, comissão marketplace, preço por canal
  fixed-costs.ts      # custos fixos e rateio
  packagings.ts       # custo unitário e custo de embalagens por venda/produto
  labor.ts            # tempo de produção, custo total e custo de mão de obra por unidade
  menu-engineering.ts # engenharia de cardápio
  pricing-engine.ts   # orquestra: CMV, preço sugerido, margem, markup
```

---

## 8. Regras de negócio (cálculo)

A lógica de cálculo deve cobrir:
- Conversão kg→g e litro→ml; custo por grama, por ml e por unidade.
- Fator de correção e perda de produção.
- Rendimento da receita, custo total e custo unitário.
- Custo fixo rateado por unidade.
- Embalagens: custo unitário = preço do pacote ÷ quantidade; custo da venda = custo unitário × quantidade usada.
- Mão de obra: custo total = valor/hora × tempo de produção; custo por unidade = custo total ÷ rendimento.
- Custo direto total = custo unitário da receita + custo de embalagens + custo de mão de obra por unidade.
- Embalagens e mão de obra são somadas ao custo direto antes de margem, custo fixo percentual e taxas do canal.
- Taxas percentuais, taxa fixa por pedido, comissão de marketplace.
- Lucro desejado → preço sugerido.
- Margem líquida e markup.
- Preço praticado vs. preço sugerido (margem/markup reais).
- Sub-receitas, medidas caseiras, engenharia de cardápio.

**Dados de exemplo previstos:** Brownie Ferrero, Cookie Kinder, Brigadeiro; canais Balcão/Pix, Cartão, iFood Básico, iFood Entrega, Rappi, Uber Eats.

---

## 9. Regras de acesso (licenças)

`licenses` controla o acesso. Resumo:
- `one_time` **ativa** → libera **Essencial**.
- `annual_pro` **ativa** e `expires_at` no futuro → libera **Pro**.
- `refunded` / `chargeback` / `blocked` → **removem acesso**.
- `annual_pro` vencida → remove recursos **Pro** (mas mantém Essencial se houver `one_time` ativa).

Funções de acesso (Fase 4): `getCurrentUserAccess()`, `hasEssentialAccess()`, `hasProAccess()`, `requireEssentialAccess()`, `requireProAccess()`. **Validar no backend.**

### Recuperação de senha (Fase P0-8A)

Quem compra define a senha pelo convite (`/auth/accept-invite`). Se ela se perder, o caminho é:

```
/login → "Esqueci minha senha"
  → /auth/esqueci-senha          // pede o link; resposta idêntica exista ou não a conta
    → e-mail do Supabase
      → /auth/nova-senha         // aceita fragment, ?code= (PKCE) ou sessão já ativa
        → /conta
```

`/conta` oferece "Trocar minha senha" pelo mesmo caminho. Nenhuma tabela, migration ou SQL foi criada: o fluxo usa `resetPasswordForEmail` e `updateUser` do Supabase Auth.

> ⚠️ **Configuração externa:** `https://<domínio>/auth/nova-senha` precisa estar nas **Redirect URLs** do painel do Supabase. Sem isso, o Supabase manda a usuária para o Site URL — `InviteHashRescue`, montado em `/login`, reconhece `type=recovery` e reencaminha, mas com um salto a mais.

### Suporte e páginas legais (Fase P0-8A)

O canal de suporte é uma constante única em `lib/support.ts`, consumida pelo componente `SupportLink`. Aparece em `/precos`, `/acesso-bloqueado`, `/conta`, `/login`, nas duas telas de senha, no convite com erro e no rodapé de todas as páginas.

O WhatsApp oficial de atendimento é **+55 21 95905-4988** (`wa.me/5521959054988`). Trocar o canal é editar apenas `lib/support.ts`.

As páginas `/termos`, `/privacidade` e `/reembolso` são públicas, compartilham a casca `components/legal/LegalPage.tsx` e uma única data de atualização. `/reembolso` remete às condições do checkout e **não cria garantia própria**.

---

## 10. Diferenças Essencial × Pro Anual

- **Essencial:** resolve a dor central (custo, preço, margem) com backup manual e dados locais. Compra única, vitalício na versão atual.
- **Pro Anual:** acompanhamento ao longo do tempo — histórico de preços, alertas de aumento de custo, nuvem/multi-dispositivo, IA, relatórios e exportação avançada em PDF, cardápio avançado. Assinatura anual.

---

## 11. UX: modo simples × modo avançado

- **Jornada principal do Essencial:** Ingredientes → Receitas → Embalagens → Precificação →
  Orçamento. O Painel apresenta essa sequência com links diretos, e os estados vazios explicam o
  pré-requisito ou a ação seguinte sem expor termos técnicos desnecessários.
- **Modo simples** responde 3 perguntas: *Quanto custa produzir? Por quanto vender? Quanto sobra de lucro?* Campos avançados ficam escondidos; valores neutros (fator de correção = 1, perda = 0%, sem multicanal avançado).
- **Modo avançado** expõe: fator de correção, perdas, medidas caseiras, sub-receitas, múltiplos canais, custos fixos, taxas (pagamento, fixa, comissão, anúncio, mensalidade do canal), preço praticado, margem/markup reais, engenharia de cardápio.

A lógica avançada **nunca** é removida — apenas a experiência é organizada.

### Modo avançado na interface (Fase P0-9A)

O componente `components/advanced/AdvancedSection.tsx` é a casca única dos ajustes finos: `<details>` nativo, **recolhido por padrão**, com selo "opcional" e um resumo do que já está preenchido. Ele abre sozinho quando o item em edição já tem ajuste aplicado — esconder um valor que mexe no custo seria pior do que mostrá-lo.

| Onde | Campo | Efeito no cálculo |
|---|---|---|
| Ingredientes | Fator de correção | `quantidade corrigida = quantidade × fator` (Fase 1A) |
| Receitas | Perda de produção (%) | `custo com perda = custo bruto / (1 − perda/100)` (Fase 1B-1) |
| Receitas | Observações técnicas | Nenhum — texto interno, só na Ficha técnica |

Os três campos já existiam em `types/pricing.ts` e no motor desde a Fase 1; a P0-9A entregou a **interface**, sem tocar em fórmula, schema ou `APP_STATE_STORAGE_KEY`. Antes dela, fator de correção e perda eram campos fixos com a dica "deixe 1/0 se não sabe o que é isso" — pedir para ignorar um campo é pior do que recolhê-lo.

Onde os ajustes aparecem depois de aplicados:

- **Ficha técnica da receita:** perda de produção, fator por item (quando ≠ 1) e observações técnicas.
- **Precificação e Ficha interna de precificação:** o percentual de perda considerado, já embutido no custo da receita.
- **Orçamento para cliente:** em lugar nenhum — nada disso atravessa para o documento comercial.

**Fora do escopo da P0-9A:** sub-receitas (entregues depois, na P0-9B) e medidas caseiras (P0-9C).

### Sub-receitas na interface (Fase P0-9B)

Uma receita pode entrar como componente de outra — recheio dentro de bolo, massa base dentro do produto final, brigadeiro base dentro de um cento de doces. O custo entra proporcionalmente à quantidade usada, pela conta que já existia desde a Fase 1B-2:

```
custo por unidade de rendimento = custo total com perda da sub-receita / rendimento dela
custo do item                   = quantidade usada (convertida) × custo por unidade de rendimento
```

No formulário de Receitas, "Adicionar componente" alterna entre **Ingrediente** e **Sub-receita**. O padrão continua sendo ingrediente.

**Duas regras que a interface aplica reaproveitando o domínio:**

1. **Nada de ciclo.** A receita em edição não aparece na própria lista, e cada inclusão passa por `validateRecipe`, que detecta auto-referência e ciclo indireto (`CIRCULAR_REFERENCE`, Fase 1B-2). O erro vira mensagem amigável antes de o item entrar na lista.
2. **Só receitas com rendimento em unidade conhecida** (g, kg, ml, l, un) podem virar componente. `SubRecipeItem.unit` é `PurchaseUnit`, e rendimento em texto livre ("porções", "fatias") não casa com nenhuma — o item seria recusado na validação. O seletor filtra e explica o motivo, em vez de deixar escolher para falhar depois.

> ⚠️ **Limitação conhecida:** para usar uma receita como componente, o rendimento dela precisa estar numa das cinco unidades. A P0-9C reduziu muito o impacto disso ao trocar o campo livre por seletor e normalizar as unidades antigas.

### Medidas caseiras, rendimento real e unidades seguras (Fase P0-9C)

**1. Unidade de rendimento virou seletor.** O campo era texto livre, e quem escrevia "gr" ficava com uma receita que não podia virar sub-receita — o app dizia não sem explicar. Agora só há g, kg, ml, l e un.

`lib/recipe-units.ts` normaliza o que já estava gravado: `gr/grama/gramas → g`, `quilo/kilo → kg`, `mililitro/mls → ml`, `litro/lt → l`, `unidade/und/unid → un`. A normalização acontece **na leitura do store**, não no `storageService`: o arquivo só muda quando a usuária salva algo.

Unidades sem equivalência segura — "porções", "fatias", "pedaços" — **não** são convertidas. Mapear para "un" apagaria a informação que ela quis registrar. Elas continuam legíveis, ficam selecionáveis como "unidade livre" na edição, e a tela explica que impedem o uso como sub-receita.

**2. Medidas caseiras.** `lib/household-input.ts` deriva as opções **do ingrediente escolhido**, nunca de uma lista fixa. Dois mecanismos diferentes:

| Tipo | Exemplos | Como funciona |
|---|---|---|
| Embalagem | lata de leite condensado (395 g), caixinha de creme de leite (200 g) | Peso de fábrica, não depende de densidade. Vira item de ingrediente comum já convertido |
| Medida caseira | xícara, meia xícara, colher de sopa, colher de chá | Depende de densidade. Vira `HouseholdMeasureRecipeItem`, com a tabela da Fase 1B-3 convertendo **dentro** do domínio |

A regra que governa o arquivo: **só oferecer conversão que dá para defender**. 1 xícara de farinha são 120 g e 1 xícara de açúcar são 180 g — num app de precificação, um número errado aqui vira preço errado na ponta, em silêncio. Quando não dá para inferir com segurança, a tela diz *"Ainda não temos uma conversão segura para esse ingrediente. Use g ou ml."*

Ingrediente contado em `un` nunca recebe medida caseira: o validador do domínio recusa, e uma xícara de ovos não significa nada.

**3. Assistente de rendimento real.** Dentro do Modo avançado: a usuária informa o que entrou e o que rendeu pronto, e o app calcula `perda = (1 − real / estimado) × 100`. Ela decide se aplica — **o campo não é preenchido sozinho**, porque isso mudaria o custo dela sem ela pedir.

Quando todos os itens compartilham a mesma dimensão física, o app oferece a soma como estimativa. Quando a receita mistura massa e volume, ele **não soma** e explica: sem densidade, 500 g e 200 ml não viram 700 de nada — o certo é pesar o resultado pronto.

**Fora do escopo, registrado:** upload de receita e tabela nutricional. A segunda tem implicação regulatória (RDC/ANVISA) e não deve sair sem decisão explícita.

**Correção que veio junto:** `RecipeForm` inicializava a lista de itens filtrando `kind: "ingredient"`, então salvar uma edição descartava qualquer outro tipo. Era inócuo enquanto a interface não criava sub-receitas e viraria destrutivo no instante em que passou a criar.

---

## 11-B. Salvamento em nuvem (Fase P0-10)

Enquanto a usuária está logada, o app guarda uma **cópia do estado na nuvem**, para os dados sobreviverem a trocar de navegador, de aparelho ou a limpar o cache.

### O modelo: localStorage é o cache, a nuvem é a cópia

O `localStorage` continua sendo a fonte que a interface lê, **de forma síncrona**. A nuvem é uma cópia, não a origem. É isso que permitiu entregar a fase sem reescrever os oito stores: `useSyncExternalStore` exige snapshot síncrono e o Supabase é assíncrono — a incompatibilidade registrada em `DECISIONS.md` desde 2026-08-05 continua de pé, e esta fase passa ao lado dela de propósito.

```
abre o app  ->  le localStorage (instantaneo)  ->  busca a copia na nuvem
                                                        |
                       decideInitialSync(local, nuvem)  ->  hidrata | envia | nada
                                                        |
              toda gravacao local  ->  espera 2 s  ->  envia para a nuvem
```

### Quem ganha quando os dois lados divergem

A decisão é uma função **pura e testada isolada**: `lib/cloud-sync-decision.ts`.

| Situação | Decisão |
|---|---|
| Nuvem ainda sem linha | Envia o local |
| **Navegador novo** (nunca gravou nada aqui) | **Aceita a nuvem, sem comparar data** |
| Data local ilegível | Aceita a nuvem |
| Comparação de datas | O mais recente vence |
| Empate | Não faz nada |

A regra do navegador novo é a que evita o pior defeito possível: um navegador que nunca gravou monta um estado vazio com `updatedAt` de *agora* — o instante mais recente possível. Comparar datas nesse caso faria o vazio ganhar de qualquer nuvem, sempre.

Ao hidratar, o app grava localmente **preservando o `updatedAt` da nuvem** (`saveAppState(state, { preserveUpdatedAt: true })`). Sem isso, o navegador ficaria "mais novo" que a origem do dado que acabou de receber e devolveria a mesma cópia no carregamento seguinte.

> ⚠️ **Limite assumido:** as duas datas vêm do **relógio do navegador**. Aparelho com relógio muito errado pode perder para a nuvem uma alteração mais nova. É o custo de "último a escrever vence" sem servidor autoritativo; merge por entidade é outra fase.

### Status de sincronização

`Salvando…` · `Salvo na nuvem` · `Salvo neste navegador` · `Erro ao salvar na nuvem`, com a data da última sincronização. Compacto no rodapé, detalhado em Configurações. Enquanto a fase for `idle` — visitante — não renderiza nada.

### Falha nunca derruba o app

`services/cloud-app-state.ts` nunca lança: todo caminho vira resultado tipado. Sem env, sem sessão, sem internet **ou com a migration 0005 ainda não aplicada**, o app segue salvando no navegador e o status diz o que está acontecendo.

### Banco

`supabase/migrations/0005_user_app_state.sql` — uma linha por usuária, `AppState` inteiro em JSONB, RLS por `auth.uid()` nas quatro operações. **Não aplicada automaticamente.**

---

## 11-C. Clientes e orçamentos salvos (Fase P0-11)

A jornada comercial deixou de terminar na impressão: a confeiteira guarda quem compra com ela e o que já orçou.

### Clientes

`/clientes` — nome e WhatsApp obrigatórios; e-mail, endereço/bairro e **observações internas** opcionais.

As observações internas ("prefere retirada pela manhã") são anotação da confeiteira para si mesma. Elas **nunca** chegam ao documento, e isso é garantido por construção, não por disciplina de tela: ver `QuoteClientSnapshot` abaixo.

### Orçamentos salvos

O rascunho da P0-4 continua sendo o que fica em edição. Ao salvar, ele vira um `SavedQuote` no histórico, com:

- número, data, validade, forma e condições de pagamento;
- itens, desconto e observações comerciais;
- `clientId` (quando veio de uma cliente cadastrada) e `clientSnapshot`;
- `status`: rascunho, enviado, aprovado ou recusado.

**O total não é gravado.** Ele é derivado de `items` e `discount` por `calculateCommercialQuoteTotals` na hora de exibir — o projeto não persiste valor calculado (DECISIONS.md, Fase 2-6), e um total gravado poderia divergir dos itens que o originaram.

### `QuoteClientSnapshot`: o que não é copiado não pode vazar

O snapshot tem **exatamente três campos** — nome, WhatsApp e e-mail. Endereço e observações internas não estão lá.

Isso é escolha de segurança, não economia. Não existe caminho — nem por descuido futuro numa tela nova — para o dado interno da cliente aparecer no orçamento entregue a ela. A verificação isolada confirma que até um payload adulterado com `notes` e `address` sai da normalização sem eles.

O snapshot também mantém o documento legível depois de a cliente ser editada ou excluída: um orçamento emitido não pode mudar sozinho.

### Excluir cliente não apaga orçamento

Excluir uma cliente **desvincula** os orçamentos dela e os mantém no histórico, legíveis pelo snapshot. A confirmação diz quantos serão afetados antes de a usuária decidir.

Apagar o histórico junto com o cadastro destruiria a prova do que foi combinado — e o cadastro é só a agenda, não o contrato.

### Persistência

`clients` e `savedQuotes` entraram no `AppState`, normalizados para `[]` quando ausentes. Como toda escrita passa por `saveAppState`, os dois entram automaticamente no backup manual e na cópia em nuvem da P0-10 — sem migration nova e sem uma linha a mais em nenhum dos dois.

`APP_STATE_SCHEMA_VERSION` continua em 1: a compatibilidade vem da reconstrução campo a campo, padrão estabelecido na Fase 2-6.

### Fora do escopo

WhatsApp (P0-12), link público de orçamento e PDF no servidor. A P0-11 só deixa os dados prontos: cliente com WhatsApp, orçamento salvo e vínculo entre os dois.

---

## 11-D. Compartilhar orçamento no WhatsApp (Fase P0-12)

O botão **"Compartilhar no WhatsApp →"** aparece em dois lugares: ao lado de Imprimir no editor, e em cada linha do histórico.

### O fluxo é assistido, e isso é honesto

O `wa.me` abre uma conversa com texto pronto e **não anexa arquivo**. Não existe forma confiável de o navegador entregar um PDF por ali. Em vez de prometer um envio que nunca aconteceria, o painel assume os três passos e os numera:

```
1. Salvar / imprimir PDF   →   2. Abrir WhatsApp   →   3. anexar o arquivo à mão
```

O painel se fecha antes de imprimir — para não sair no papel — e reabre sozinho depois, deixando a usuária direto no passo 2.

### Detalhe que evita mandar o documento errado

A impressão sempre imprime **o que está no editor**. Por isso compartilhar a partir do histórico **carrega o orçamento no editor antes** de abrir o painel. Sem esse passo, a usuária mandaria a mensagem de um orçamento e o PDF de outro — o erro mais caro que esta fase poderia introduzir.

### Normalização do telefone

`lib/whatsapp.ts`, função pura:

| Entrada | Saída |
|---|---|
| `(21) 95905-4988` | `5521959054988` |
| `21959054988` | `5521959054988` |
| `5521959054988` | `5521959054988` |
| `+55 21 95905-4988` | `5521959054988` |
| `123` | recusado |

A ordem das regras não é acidental: **10 ou 11 dígitos** recebem o `55` na frente, e só depois se checa se já veio com código de país. Existe **DDD 55** (Santa Maria, RS) — o número `55987654321` tem 11 dígitos e começa com "55", mas é DDD + celular, não país + número quebrado. Testar o comprimento antes do prefixo resolve sozinho; trocar a ordem faria esses números abrirem conversa com quem não existe.

### A mensagem

`Olá, {nome}! Aqui está o seu orçamento {número}.` — curta de propósito: quem recebe já vai ver o documento anexado, e o valor, os itens e as condições estão no PDF, onde devem estar.

Nada de custo, margem, markup, perda, fator de correção, sub-receita ou observação interna da cliente — esses dados **nem existem** nas entradas das funções que montam a mensagem.

### Status "enviado"

Marcar é uma **ação explícita** no painel, nunca automática. Clicar em compartilhar não muda o histórico sozinho: a usuária pode abrir o painel só para conferir a mensagem, e um status que muda por conta própria vira registro errado.

### Fora do escopo

PDF no servidor, upload de arquivo, link público de orçamento, Supabase Storage e WhatsApp Business API. Nenhum deles foi implementado, e o envio automático de anexo depende de um deles.

---

## 12. Rodar localmente

Pré-requisitos: Node 20+ e npm.

```powershell
cd C:\dev\doce-margem
npm install            # já executado no setup inicial
npm run dev            # http://localhost:3000
```

> O projeto vive em `C:\dev\doce-margem` e **não** deve ficar em OneDrive, Downloads, Desktop ou pasta sincronizada.

---

## 13. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. **Nunca commitar `.env.local`.**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

KIWIFY_WEBHOOK_SECRET=
HOTMART_WEBHOOK_SECRET=

ADMIN_EMAILS=

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPPORT_WHATSAPP=
NEXT_PUBLIC_BUY_ESSENTIAL_URL=
NEXT_PUBLIC_BUY_PRO_ANNUAL_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` é **apenas servidor** — nunca expor no frontend.

---

## 14. Comandos úteis

```powershell
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção
npm run start       # roda o build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit (sem emitir arquivos)
```

Antes de qualquer deploy: `npm run lint`, `npm run typecheck` e `npm run build` devem passar.

---

## 15. Rotas planejadas

**Públicas:** `/login`, `/cadastro`, `/precos`, `/acesso-bloqueado`, `/termos`, `/privacidade`, `/reembolso`, `/auth/esqueci-senha`, `/auth/nova-senha`, `/auth/accept-invite`
**App atual:** `/`, `/ingredientes`, `/receitas`, `/embalagens`, `/precificacao`, `/clientes`, `/orcamentos`, `/configuracoes`, `/conta`
**Pro (futuro/bloqueável):** `/app/historico-precos`, `/app/scanner`, `/app/relatorios`
**Admin:** `/admin`, `/admin/usuarios`, `/admin/licencas`, `/admin/webhooks`
**API:** `POST /api/webhooks/kiwify`, `POST /api/webhooks/hotmart`

---

## 16. Segurança (a aplicar a partir da Fase 4)

- RLS no Supabase: usuário só acessa os próprios dados.
- Admin restrito por `ADMIN_EMAILS`.
- Webhooks com validação de método e segredo (env).
- Licença validada no backend (middleware/server actions).
- Service role apenas no servidor; nenhuma chave sensível no frontend.

---

## 17. Deploy (futuro)

1. Projeto em `C:\dev\doce-margem` (sem OneDrive).
2. Configurar e-mail noreply do GitHub antes do primeiro commit.
3. Criar repositório vazio no GitHub → push para `main`.
4. Importar na Vercel (Framework Preset **Next.js**).
5. Cadastrar variáveis de ambiente na Vercel.
6. Desligar Vercel Authentication se o site público pedir login.
7. Associar e validar o domínio público `https://www.minhafatia.com.br`.

---

## 18. Status do projeto

Desenvolvimento **por fases**, com aprovação entre cada uma. Veja [TASKS.md](TASKS.md) para o backlog e [REVIEW.md](REVIEW.md) para riscos e revisão técnica.

- **Fase 0 — Setup e documentação:** ✅ concluída.
- **Fase P0-3 — Ficha interna de precificação:** implementada antes do lançamento para controle de custos, mão de obra, embalagens, margem e preço sugerido.
- **Fase P0-4 — Orçamento para cliente:** implementada com dados comerciais, itens manuais, totais, rascunho local e impressão pelo navegador, sem expor dados internos da precificação.
- **Fase P0-4A — Personalização visual do orçamento:** implementada em Configurações com nome da marca, logo otimizada localmente, contatos, condições padrão, sugestão de cores via canvas e paleta editável aplicada também à impressão.
- **Fase P0-5 — Imprimir receita:** implementada na área de Receitas com ficha técnica interna, ingredientes e sub-receitas, rendimento, perda, custos calculados e impressão/PDF pelo navegador.
- **Fase P0-6 — Polimento final pré-lançamento:** implementada com jornada principal ordenada no Painel, navegação móvel mais clara, nomenclatura consistente, CTAs objetivos e estados vazios orientativos, sem alterar cálculos ou persistência.
- **Fase P0-7 — Oferta e copy de lançamento:** implementada com o Essencial como oferta atual, preço e acesso explicados, Pro identificado como futuro, expectativas pós-compra e de armazenamento local claras e aviso contábil discreto.
- **Fase P0-8 — Auditoria final de lançamento:** revisão completa do produto com olhar de compradora nova. Veredito: pode vender com pequenos ajustes; três bloqueadores de pós-venda registrados em `REVIEW.md`.
- **Fase P0-8A — Pós-venda mínimo:** implementada com recuperação de senha, canal de suporte visível (WhatsApp oficial já configurado), páginas legais (`/termos`, `/privacidade`, `/reembolso`), aviso fiscal dentro da Precificação e total do parcelamento em `/precos`. Antes da venda pública, restam duas validações manuais em produção: o botão de compra em `/precos` e o e-mail de recuperação de senha.
- **Fase P0-9A — Modo avançado:** implementada como área opcional e recolhida em Ingredientes (fator de correção) e Receitas (perda de produção e observações técnicas), refletida na Ficha técnica e na Precificação. `advanced_mode` deixou de ser recurso planejado na página de planos.
- **Fase P0-9B — Sub-receitas:** implementada na tela de Receitas, com seletor de tipo de componente, bloqueio de ciclo reaproveitando `validateRecipe` e correção da edição que descartava itens não-ingrediente. `sub_recipes` deixou de ser recurso planejado.
- **Fase P0-9C — Medidas caseiras, rendimento real e unidades seguras:** implementada com seletor de unidade de rendimento, normalização de unidades antigas, entrada por lata/caixinha/xícara/colher quando há conversão confiável e assistente que calcula a perda a partir do rendimento real. **Nenhum recurso do Essencial continua anunciado como em desenvolvimento.**
- **P1 recomendado — Orçamentos avançados:** evolução da rota atual com clientes, histórico, status, duplicação de orçamento e reaproveitamento de cliente.
