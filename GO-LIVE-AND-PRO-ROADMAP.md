# GO-LIVE & PRO ROADMAP — Minha Fatia

> **Marca atual:** Minha Fatia. Referências datadas a Doce Margem neste roadmap documentam o nome anterior usado durante as validações técnicas e comerciais. O domínio público planejado para a nova marca é [https://www.minhafatia.com.br](https://www.minhafatia.com.br); configurações externas e envs não foram alteradas pelo rebrand de código.

> Auditoria de 2026-08-07, feita **sem acesso à internet, sem service role e sem
> executar SQL**. Tudo abaixo sai de leitura do código, das migrations, do
> histórico do Git e da documentação viva do projeto.
>
> ⚠️ **O que eu não consigo enxergar daqui:** o painel da Vercel, o painel da
> Kiwify, a caixa de e-mail e o conteúdo atual do banco. Onde a conclusão depende
> disso, está marcado como **[não verificável daqui]** com a checagem que você
> pode fazer em cinco minutos.

## Atualização final de produção — 2026-08-08

> Esta atualização registra evidência observada em produção e substitui as
> marcações antigas de “compra real ainda não testada” ao longo deste documento.

### Ciclo comercial real validado

1. O botão **“Testar Webhook”** da Kiwify retornou HTTP 200 e foi ignorado com segurança.
2. A compra real do produto **Doce Margem Essencial** retornou HTTP 200.
3. O webhook `compra_aprovada` terminou como `processed`.
4. A usuária foi criada.
5. O convite foi entregue via Resend/Supabase SMTP.
6. A compradora criou a senha.
7. A licença Kiwify ficou `active`.
8. `license_events` registrou `granted`.
9. A usuária acessou `/conta`, `/ingredientes`, `/receitas`, `/precificacao` e `/configuracoes`.
10. O reembolso real feito na Kiwify disparou o webhook.
11. O webhook `compra_reembolsada` terminou como `processed`.
12. A licença mudou para `refunded`.
13. `license_events` registrou `refunded`.
14. A usuária perdeu o acesso e foi redirecionada para `/acesso-bloqueado`.
15. As licenças manuais de teste foram removidas.
16. Os webhooks antigos `failed`/`ignored` foram removidos.
17. O banco ficou, ao final, somente com os eventos `processed` de auditoria da compra e do reembolso reais.

### Pendências conhecidas antes da venda aberta

- O convite ainda pode cair em spam.
- Perfis antigos de teste permanecem, mas sem licença ativa.
- Chargeback não foi testado manualmente de ponta a ponta, embora use o mesmo mecanismo de revogação validado pelo reembolso.
- A venda oficial do app ainda não foi aberta.
- A copy do app foi revisada na P0-7; antes de abrir a venda, ainda é preciso validar o
  checkout publicado e o domínio.

## Atualização P0-8A — pós-venda mínimo (2026-08-12)

A auditoria P0-8 concluiu que o maior risco antes da venda pública estava no pós-venda,
não no produto. A Fase P0-8A fechou os três bloqueadores **em código**:

| # | Bloqueador P0-8 | Estado |
|---|---|---|
| B1 | Sem recuperação de senha | ✅ `/auth/esqueci-senha` + `/auth/nova-senha` + "Trocar minha senha" em `/conta`, usando `resetPasswordForEmail` e `updateUser` do Supabase Auth. Sem tabela, migration ou SQL. |
| B2 | Sem canal de suporte | ✅ `lib/support.ts` + `SupportLink` em `/precos`, `/acesso-bloqueado`, `/conta`, `/login`, nas duas telas de senha, no convite com erro e no rodapé. WhatsApp oficial configurado: **+55 21 95905-4988**. |
| B3 | Sem páginas legais | ✅ `/termos`, `/privacidade` e `/reembolso`, públicas. |

Também entraram o total aproximado do parcelamento em `/precos` e o aviso fiscal dentro
de `/precificacao` (informativo, sem CTA para contador).

### 🚨 Validações externas obrigatórias antes de abrir a venda

Nenhuma delas é resolvível em código, e a venda **não deve abrir** sem as três:

1. **Validar o botão de compra em produção.** Abrir `/precos`, clicar em "Comprar acesso
   ao Essencial" e confirmar que vai para o checkout correto da Kiwify. Se
   `NEXT_PUBLIC_BUY_ESSENTIAL_URL` faltar na Vercel, o botão aparece desabilitado, sem
   erro e sem log. **Não concluir nova compra de teste sem decisão do dono.**
2. **Cadastrar `https://<domínio>/auth/nova-senha` nas Redirect URLs do Supabase** e
   disparar um e-mail de recuperação real para uma conta de teste. O envio do e-mail não
   foi exercido na P0-8A. Sem o cadastro o fluxo ainda se conserta — o hash cai em
   `/login` e `InviteHashRescue` reencaminha —, mas com um salto a mais.
3. **Testar a chegada da mensagem de suporte.** Clicar em um dos CTAs do app e confirmar
   que a conversa abre no WhatsApp de atendimento certo, com a mensagem já preenchida.

> ✅ O WhatsApp oficial de suporte (**+55 21 95905-4988**) já está configurado em
> `lib/support.ts`; o placeholder da implementação saiu do projeto.

> ℹ️ Correção de registro: o item **I4** ("`Header` mostra 5 links que rebatem para
> `/login`") já estava resolvido antes da P0-8 — o cabeçalho só mostra a navegação
> completa para sessão autenticada. O item **I5** ("sem canal de suporte") foi resolvido
> pela P0-8A, ressalvada a troca do número.

---

## 1. Estado atual do produto

### 1.1 Pronto e validado

| Área | O que existe | Como foi validado |
|---|---|---|
| **Motor de cálculo** (Fase 1) | unidades e conversões, custo por unidade-base, ficha técnica, rendimento, perda, fator de correção, sub-receitas com proteção contra referência circular, medidas caseiras, canais e taxas, custos fixos e rateio, pricing engine completo (preço sugerido, margem, markup, comparação com preço praticado) | validações isoladas por fase + `typecheck`/`lint` |
| **Interface Essencial** (Fase 2) | `/`, `/ingredientes`, `/receitas`, `/precificacao`, `/configuracoes`, backup export/import | SSR real + validações isoladas |
| **Identidade e licença** (Fase 4) | 4 migrations aplicadas no Supabase real; Auth e-mail/senha; DAL sem `userId`; matriz de 15 recursos; guardas de rota; `/acesso-bloqueado`; `/precos` | SQL aplicado e conferido; 26+28 checagens isoladas; testes HTTP |
| **Webhook em modo captura** (4-7C) | `POST /api/webhooks/kiwify` valida token, recusa lixo e grava em `webhook_events` | **13/13 testes locais**, gravação e replay confirmados no banco |

**A parte difícil está feita.** A matemática de precificação — o núcleo do produto —
está completa e verificada. O modelo de licença é sólido: o cliente não consegue
se conceder licença nem se desbloquear, porque não há policy de escrita nem
privilégio, em duas barreiras independentes.

### 1.2 O que está em produção

O ciclo crítico está comprovadamente em produção: o endpoint recebeu o teste do
painel, a compra real e o reembolso real da Kiwify, respondendo HTTP 200 nos três
casos. A compra criou usuária e licença, o convite permitiu definir senha e as
rotas protegidas abriram; o reembolso revogou a licença e enviou a usuária para
`/acesso-bloqueado`.

A presença do deploy e a integração Kiwify → app → Supabase → Resend deixaram de
ser inferência. Isso **não significa venda aberta**: a copy do app foi concluída na
P0-7, mas checkout publicado, domínio, suporte e política de reembolso ainda precisam
da validação operacional final.

### 1.3 O que roda local

**Todos os dados da usuária.** Ingredientes, receitas, custos fixos e canais vivem
em `localStorage` e continuam assim indefinidamente no Essencial (decisão de
2026-08-05). A Fase 4 não migrou nada. Nuvem é recurso do Pro.

Consequência comercial que precisa estar na copy: **trocar de aparelho ou limpar o
navegador perde os dados**, e a rede de segurança é o backup manual em
`/configuracoes`.

### 1.4 Depende de ação manual sua

| Ação | Estado |
|---|---|
| Aplicar migrations 0001–0004 | ✅ feito |
| Validar autenticação do webhook da Kiwify | ✅ compra e reembolso reais retornaram 200 e foram processados |
| Definir e comunicar o preço do Essencial | ✅ R$ 97 à vista no crédito ou Pix, ou 12x de R$ 10,03; copy revisada na P0-7 |
| Cadastrar a URL e os eventos do webhook na Kiwify | ✅ compra e reembolso reais chegaram ao app |
| Configurar SMTP próprio no Supabase | ✅ Resend/Supabase SMTP entregou o convite; entregabilidade/spam ainda exige atenção |
| Conceder e revogar licença automaticamente | ✅ validado com compra e reembolso reais |
| Abrir a venda oficial | ❌ validar checkout publicado, domínio, suporte e política de reembolso antes |

### 1.5 Não implementado

- **Fase 3 — modo avançado na interface.** O motor tem sub-receitas, medidas
  caseiras, fator de correção e perda desde a Fase 1B; **nenhum aparece na tela.**
- **Fase 7 — admin.** Sem ela, todo problema de licença se resolve com SQL na mão.
- **Fase 4-5C** — `proxy.ts` e renovação de token de sessão.
- **Fase 4-6B** — gating dos recursos Pro.
- **Todo o Pro.** Nuvem, histórico, PDF, cardápio, IA: nada existe.
- **Hotmart.**

### 1.6 Pendências de validação que atravessaram várias fases

Estas não são "tarefas futuras" — são **coisas que ninguém nunca conseguiu
verificar**, e por isso pesam mais do que o tamanho delas sugere:

1. **Nenhuma tela foi testada por clique real de usuária.** Pendente desde a Fase
   2-2. Tudo foi validado por SSR, HTTP e lógica isolada. Formulário, foco,
   teclado numérico no celular, mensagem de erro — nada disso foi visto
   funcionando.
2. ~~**O caminho autenticado nunca rodou ponta a ponta.**~~ ✅ Validado em
   produção: convite → criação de senha → licença ativa → acesso às cinco rotas
   protegidas → reembolso → bloqueio.
3. **Perfis antigos de teste permanecem**, mas sem licença ativa.
4. **Invariantes de licença no banco** (Fase 4-2B) nunca foram exercitadas contra
   escrita real.

---

## 2. Bloqueadores para o lançamento

### 🔴 Críticos — vender sem isso gera cliente pagante sem produto

| # | Bloqueador | Por quê |
|---|---|---|
| C1 | ~~**Compra aprovada não libera licença**~~ | ✅ **Resolvido e validado em produção.** Compra real sem conta prévia criou usuária, entregou convite, ativou licença e liberou acesso. |
| C2 | ~~**Preço não definido**~~ | ✅ **Resolvido na P0-7.** `/precos` comunica R$ 97 à vista no crédito ou Pix, ou 12x de R$ 10,03, com compra única, ausência de mensalidade no Essencial e CTA dependente da URL de checkout já existente. |
| C3 | ~~**Webhook não confirmado em produção**~~ | ✅ **Resolvido.** Teste do painel, compra real e reembolso real retornaram 200; compra e reembolso ficaram `processed`. |
| C4 | ~~**Payload real da Kiwify não capturado**~~ | ✅ **Resolvido e confirmado.** Compra e reembolso reais foram normalizados e processados em produção. |
| C5 | ~~**Autenticação real do webhook não comprovada**~~ | ✅ **Resolvido.** Compra e reembolso reais da Kiwify foram autenticados e processados em produção. |
| C6 | ~~**Reembolso e chargeback não revogam**~~ | ✅ **Resolvido na Fase 4-7H.** `order_refunded` → `refunded`, `order_chargeback` → `chargeback`, ambos auditados, e o acesso cai na requisição seguinte (verificado: `has_essential_access` vai para `false`). Aprovação posterior ao reembolso **não reativa**. |
| C7 | ~~**Compra antes do cadastro sem decisão**~~ | ✅ **Resolvido pelo convite.** A compra real criou a usuária, entregou convite e permitiu criar senha antes do acesso. |
| C8 | ~~**Fluxo compra → cadastro → acesso nunca testado**~~ | ✅ **Resolvido em produção.** Compra → convite → senha → acesso → reembolso → bloqueio foi observado de ponta a ponta. |
| C9 | ~~**Confirmação de e-mail sem SMTP próprio**~~ | ✅ **Fechado.** Resend verificado, SMTP do Supabase configurado, convite entregue no Gmail, Redirect URL cadastrada e `NEXT_PUBLIC_APP_URL` correta. O app consome o token do fragment em `/auth/accept-invite`. Resta só entregabilidade (SPF/DKIM/DMARC) — o e-mail caiu em spam, o que custa vendas mas não bloqueia. |
| C10 | ~~**Redirect do convite não comprovado no domínio real**~~ | ✅ **Resolvido no fluxo real.** A compradora recebeu o convite, criou a senha e acessou o app. O domínio ainda deve passar por revisão comercial antes da venda aberta. |

### 🟡 Importantes — dá para lançar, mas dói rápido

| # | Item | Por quê |
|---|---|---|
| I1 | **Nenhum teste em navegador real** | Um bug de formulário no celular derruba a conversão inteira e não apareceria em nenhuma validação feita até aqui. |
| I2 | **Sem admin (Fase 7)** | Todo caso excepcional — e sempre há — vira SQL manual em produção, sob pressão. |
| I3 | **Sem renovação de token de sessão** (4-5C) | Sessão expirada pode empurrar a cliente para `/login` no meio do uso. |
| I4 | **`Header` mostra 5 links que rebatem para `/login`** | Visitante vê "Ingredientes, Receitas…" e todo clique volta ao login. Parece produto quebrado. |
| I5 | **Sem canal de suporte** | `NEXT_PUBLIC_SUPPORT_WHATSAPP` vazio. Quem pagou e não entrou precisa falar com alguém. |
| I6 | **Sem `?next=` no login** | Quem tenta abrir `/receitas` e faz login cai em `/conta`. Atrito pequeno, constante. |
| I7 | **Duas contas de teste no Auth** | Poluem a base e a checagem de e-mail duplicado. |

### 🟢 Desejáveis — depois do primeiro cliente

- Hotmart como segundo provedor.
- Padronizar entrada decimal (vírgula × ponto) entre formulários.
- Aviso de "este ingrediente é usado por 2 receitas" antes de excluir.
- `webhook_events` com retentativa automática.
- Corrigir os comentários falsos sobre `service_role` em 0002/0003.

---

## 3. Diagnóstico: "o teste do webhook na Kiwify não apareceu nos logs"

> ⚠️ **Antes de tudo — cuidado com a consulta que você rodou.**
> Deixei **5 linhas de teste** em `webhook_events` na Fase 4-7C. Um
> `order by created_at desc limit 1` provavelmente devolve **a minha linha**
> (`event_type = 'unknown'`, `status = 'ignored'`), não a da Kiwify. Distinga
> pelo marcador:
>
> ```sql
> -- Só o que NÃO é meu teste:
> select id, event_type, status, created_at, payload
> from public.webhook_events
> where payload ->> '_teste_claude_4_7c' is null
> order by created_at desc;
> ```
>
> Se isso vier vazio, a Kiwify realmente não chegou ao banco.

### Hipóteses, em ordem de probabilidade

---

#### H1 — A rota não existe no deploy que a Kiwify chamou · **probabilidade alta**

Cobre três casos: projeto nunca deployado, deploy anterior ao commit `c446993`
(que trouxe o handler), ou URL apontando para um deployment de *Preview* antigo.

**Como verificar:** abra `https://SEU-DOMINIO/api/webhooks/kiwify` no navegador.

**Evidência que confirma:** **404**. A rota só exporta `POST`, então um `GET` numa
rota existente devolve **405 Method Not Allowed** — nunca 404. Essa distinção é o
teste mais barato e mais decisivo que existe aqui.

**Ação:** confirmar na Vercel que o último deployment de *Production* aponta para
o commit `c446993` ou posterior. Se não, promover/redeployar.

**O que não fazer:** não mexer no código do handler. Ele responde certo aos 13
casos locais; um 404 é roteamento, não lógica.

---

#### H2 — Você está olhando o log errado, ou ele já expirou · **probabilidade alta**

**Como verificar:** na Vercel, **Runtime Logs** do deployment de *Production* (não
Build Logs, não o painel do projeto). Ajuste o intervalo de tempo para cobrir o
horário exato do teste e **remova qualquer filtro de texto**.

**Evidência que confirma:** aparece uma invocação de `/api/webhooks/kiwify` com
algum status — mesmo sem nenhuma linha `[webhook:kiwify]`.

**Ação:** ler o **status HTTP** da invocação antes de qualquer outra coisa. Ele
sozinho já separa as hipóteses seguintes: `401` → H4/H6; `400` → H3; `500` → H5;
`200` → chegou e gravou, e o problema é a consulta (veja o aviso acima).

**O que não fazer:** não concluir "não chegou" sem ter olhado Runtime Logs de
Production no intervalo certo. Em planos menores a retenção é curta — testar hoje
e olhar amanhã pode simplesmente não mostrar nada.

---

#### H3 — Chegou, deu 400, e **não gerou log nenhum** · **probabilidade média-alta**

Este é um achado do código, não especulação. Revendo os caminhos de saída do
handler:

| Caminho | Resposta | Escreve log? |
|---|:--:|:--:|
| segredo ausente | 500 | ✅ `console.error` |
| token inválido | 401 | ✅ `console.warn` |
| **corpo ilegível** | 400 | ❌ **nada** |
| **corpo vazio** | 400 | ❌ **nada** |
| **JSON inválido** | 400 | ❌ **nada** |
| falha ao gravar | 500 | ✅ `console.error` |
| sucesso | 200 | ✅ `console.info` |

Se o botão de teste da Kiwify manda **corpo vazio** ou
`application/x-www-form-urlencoded` em vez de JSON — e o token estiver certo — a
resposta é 400 **em silêncio total**. Quem procura por `[webhook:kiwify]` no log
não encontra nada e conclui, erradamente, que a requisição nunca chegou.

**Como verificar:** o status da invocação em Runtime Logs (H2). `400` confirma.

**Evidência que confirma:** invocação registrada, status 400, zero linhas
`[webhook:kiwify]`.

**Ação:** na Fase 4-7D, **fazer os três caminhos de 400 logarem** (sem imprimir o
corpo: só o motivo, o `content-type` e o tamanho). É correção de observabilidade,
não de segurança.

**O que não fazer:** não passar a aceitar corpo não-JSON "para o teste passar". O
400 está certo; o que falta é ele contar que aconteceu.

---

#### H4 — A Kiwify usa assinatura/HMAC, não token simples · **✅ CONFIRMADA**

> **Esta era a hipótese certa.** O teste real registrou
> `hasQuerySignature=true signatureLooksLikeHex=true` — digest, não token.
> A Fase 4-7E implementou a verificação HMAC do corpo cru (SHA-256, depois
> SHA-1, em hex) e **removeu** a leitura de `signature` como token simples.
> **Confirmação posterior:** compra e reembolso reais retornaram 200 e foram
> processados. Detalhes no `REVIEW.md` (validação final de 2026-08-08).

O texto original fica abaixo como registro do raciocínio:

Previsto desde o `PLAN-FASE-4.md` 13.8. O handler aceita `x-kiwify-token`,
`Authorization: Bearer` e `?token=`. Se a Kiwify assina o corpo e manda
`?signature=<hmac>`, nenhum dos três bate → **401**.

**Como verificar:** o log do 401 foi escrito exatamente para isso. Procure:

```
[webhook:kiwify] 401 — portadores presentes: ...
```

**Evidência que confirma:** `portadores presentes: ?signature(HMAC?)` — ou
`nenhum`, se ela usar um cabeçalho com outro nome.

**Ação:** implementar a verificação HMAC na 4-7D, sobre o **corpo cru**. O handler
já lê `request.text()` antes do `JSON.parse` justamente para isso — a peça está no
lugar, falta a função.

**O que não fazer:** **jamais** aceitar a requisição sem verificar assinatura "só
para capturar o payload". Um endpoint público que concede licença sem verificação
é o pior defeito possível neste projeto.

---

#### H5 — Envs ausentes na Vercel, ou deploy anterior a elas · **probabilidade média**

`KIWIFY_WEBHOOK_SECRET` está **vazia no `.env.local`**. Se também estiver na
Vercel, toda requisição volta 500. E variável de ambiente na Vercel **só passa a
valer no próximo deployment** — configurar sem redeployar não muda nada.

**Como verificar:** Vercel → Settings → Environment Variables, escopo
**Production**: `KIWIFY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.

**Evidência que confirma:** status 500 + `[webhook:kiwify] KIWIFY_WEBHOOK_SECRET
ausente — requisição recusada`.

**Ação:** preencher e **redeployar**. Confirme também que `NEXT_PUBLIC_APP_URL` é
o domínio real — se estiver `localhost:3000`, o link de confirmação de e-mail
está quebrado para todos os clientes (C10).

**O que não fazer:** não colocar a service role em variável com prefixo
`NEXT_PUBLIC_`. Ela vaza no bundle do navegador e dá a qualquer visitante o poder
de conceder licença.

---

#### H6 — O webhook não foi salvo, ou o botão de teste não dispara de verdade · **probabilidade média**

**Como verificar:** reabrir o cadastro do webhook na Kiwify e confirmar que a URL
persistiu. Muitos painéis exigem selecionar **quais eventos** e **qual produto**
antes de salvar.

**Evidência que confirma:** URL vazia ao reabrir, ou nenhum evento marcado.

**Ação:** salvar de novo e, em vez do botão de teste, **fazer uma compra real de
R$ 1,00** (ou usar o modo de teste da Kiwify, se houver). Compra real dispara o
evento real, com o payload real — que é exatamente o que a captura precisa.

**O que não fazer:** não confiar no botão de teste como prova. Em várias
plataformas ele envia um payload sintético, com formato diferente do evento de
produção — o que geraria uma captura enganosa.

---

#### H7 — URL com erro de digitação · **probabilidade baixa, custo zero de checar**

Caminho correto, exatamente: **`/api/webhooks/kiwify`** — `webhooks` no plural,
`kiwify` minúsculo, sem barra final.

**Como verificar:** comparar caractere a caractere com o cadastrado.

**Evidência que confirma:** 404 num caminho e 405 no correto.

---

#### H8 — Evento ou produto errado no cadastro · **probabilidade baixa**

O webhook pode estar amarrado a outro produto, ou marcado só para eventos que o
teste não dispara.

**Como verificar:** conferir que o webhook está ligado ao produto do checkout
`i5YqT17` e que `compra_aprovada` está marcado.

---

### Ordem recomendada para amanhã

1. `GET` na URL pública → **405 ou 404?** (separa H1 de todo o resto)
2. Se 405: Runtime Logs de Production, sem filtro, no horário do teste → **qual
   status?**
3. `400` → H3 · `401` → H4/H6 · `500` → H5 · `200` → a consulta é que enganou
4. Se não houver invocação nenhuma: H6, depois H7/H8
5. Com qualquer resposta em mãos, **fazer uma compra real de valor mínimo** — é a
   única prova que vale

---

## 4. Essencial × Pro — a fronteira comercial

A régua, decidida em 2026-08-06 e já implementada em `lib/features.ts`:

> **O Pro é reservado a recorrência, nuvem, automação, IA e relatórios.**
> Recurso que não cai em nenhum desses cinco eixos pertence ao Essencial.

Não é arbitrário: esses cinco eixos têm **custo marginal contínuo** — servidor,
armazenamento, chamada de modelo, sincronização. É o que justifica cobrança anual.
Tudo que roda no navegador da cliente, sem nos custar nada por uso, é Essencial.

### 4.1 Essencial — compra única, vitalícia

| Recurso | Justificativa comercial | Justificativa técnica |
|---|---|---|
| **Ingredientes** | é a porta de entrada; sem isso não há produto | `localStorage`, custo marginal zero |
| **Receitas / ficha técnica** | a promessa central ("quanto custa produzir") e apoia a produção diária | cálculo puro e impressão local com `window.print()`, custo marginal zero |
| **Custos fixos** | sem rateio, o preço sugerido mente | cálculo puro, `modules/pricing` |
| **Canais e taxas** | quem vende no iFood **precisa** disso para não vender no prejuízo | idem |
| **Precificação** | é o produto | idem |
| **Ficha interna de precificação** | dá à confeiteira um resumo dos custos, margem e preço sugerido para controle próprio | impressão local com `window.print()`, custo marginal zero |
| **Orçamento simples para cliente** | transforma o preço escolhido em uma proposta comercial sem expor os dados internos da confeiteira | rascunho e impressão locais com `window.print()`, custo marginal zero |
| **Identidade visual do orçamento** | permite enviar uma proposta coerente com a marca da confeiteira | logo, paleta e contatos processados no navegador e salvos no `AppState`, custo marginal zero |
| **Backup export/import** | é a rede de segurança dos dados dela; cobrar por isso seria cobrar para ela não perder o próprio trabalho | arquivo local, custo zero |
| **Modo avançado básico** | o README já promete "avançado básico" nas duas colunas — tirar seria retirar o anunciado | motor pronto desde a Fase 1B |
| **Sub-receitas** | recheio que entra em bolo é rotina de confeitaria, não recurso de luxo | `modules/pricing/recipes.ts`, já com proteção contra referência circular |
| **Medidas caseiras** | boa parte das confeiteiras não tem balança; sem isso o app exclui o público iniciante que ele diz servir | densidades já implementadas |

**Os três últimos ainda não aparecem na interface** (`status: "planned"`), mas
**pertencem ao Essencial**. Quem comprar hoje recebe quando a Fase 3 sair, sem
pagar de novo.

### 4.2 Pro Anual

| Recurso | Justificativa comercial | Justificativa técnica |
|---|---|---|
| **Sincronização em nuvem** | valor recorrente óbvio: os dados dela sobrevivem a trocar de celular | custo contínuo de banco; e exige resolver a incompatibilidade síncrono × assíncrono documentada em 2026-08-05 — é a peça mais cara do Pro |
| **Multi-dispositivo** | consequência da nuvem | idem |
| **Histórico de preços** | responde "meu custo subiu quanto este ano?", pergunta que só o tempo cria | exige série temporal persistida — não cabe em `localStorage` |
| **Alerta de aumento de custo** | valor que chega sem ela pedir; é o que faz renovar | precisa de execução agendada no servidor |
| **Exportação avançada em PDF** | relatórios e documentos profissionais além da ficha simples do Essencial | geração avançada pode consumir CPU no servidor por documento |
| **Engenharia de cardápio** | análise estratégica, não operação diária; público mais maduro | precisa de histórico de vendas, que depende da nuvem |
| **Scanner de nota com IA** | o recurso "uau" da renovação: fotografa a nota e atualiza tudo | **custo por chamada de modelo** — o caso mais claro de recorrência |
| **Relatórios avançados** | acompanhar evolução exige dado acumulado | idem histórico |
| **Automações futuras** | mantém o Pro vivo ano após ano | qualquer coisa agendada mora no servidor |

### 4.3 A pergunta que separa as duas colunas

> **"Se ninguém usar este recurso este mês, ele me custa alguma coisa?"**

Se a resposta é não, é Essencial. Se é sim, é Pro. Simples de aplicar em recurso
novo e — mais importante — **fácil de defender publicamente**, porque é honesta.

---

## 5. Como comunicar o Pro sem lesar quem compra o Essencial

### 5.1 Avaliação da regra de crédito de upgrade

> *"Quem comprar o Essencial poderá abater o valor pago no primeiro ano do Pro."*

**A regra é boa.** Ela resolve o medo real de quem compra cedo — "vou pagar e
depois vão criar uma versão melhor que eu terei que comprar de novo" — e
transforma cada comprador do Essencial em candidato natural ao Pro.

**Mas precisa de três limites escritos, ou vira problema:**

1. **Só no primeiro ano do Pro**, uma única vez, por conta. Sem isso, alguém
   invoca o crédito no terceiro ano de assinatura.
2. **É desconto, não devolução.** Não vira dinheiro, não é transferível e não é
   reembolsável em espécie. Se o crédito for maior que o Pro anual, o excedente
   se perde. Sem essa frase, você pode acabar devendo dinheiro a alguém.
3. **O Pro anual precisa custar confortavelmente mais que o Essencial.** Se o
   Essencial custa R$ 97 e o Pro R$ 127, o crédito faz o primeiro ano custar R$ 30
   — e você entrega um ano de nuvem e IA por isso. Sugestão de proporção segura:
   **Pro anual ≥ 2× o Essencial**.

**E um cuidado de linguagem:** não prometa data. "Quando o Pro for lançado" é
seguro; "no segundo semestre" é uma promessa que pode virar reclamação.

### 5.2 Aviso honesto para `/precos`

> **O Essencial é a oferta disponível hoje.**
>
> O Minha Fatia Essencial custa R$ 97 à vista no crédito ou Pix, ou 12x de
> R$ 10,03. É uma compra única, sem mensalidade ou renovação no Essencial, com
> acesso vitalício à versão Essencial atual.
>
> Recursos avançados de nuvem, automação, inteligência artificial e relatórios
> poderão fazer parte de um Pro Anual futuro. O Pro não está disponível hoje e
> não tem preço ou data anunciados.

### 5.3 "O que está incluso no Essencial"

> **Minha Fatia Essencial — pagamento único**
>
> - Cadastro de ingredientes com custo real por grama, ml ou unidade
> - Ficha técnica das suas receitas, com rendimento e custo por unidade
> - Ficha técnica da receita imprimível, com ingredientes, quantidades e custos
> - Custos fixos rateados no preço (aluguel, energia, gás, internet)
> - Canais de venda com as taxas certas — balcão, Pix, cartão, iFood, WhatsApp
> - Preço sugerido, margem, markup e comparação com o preço que você já cobra
> - Ficha interna de precificação para controle de custos, mão de obra, embalagens,
>   margem e preço sugerido, com opção de salvar em PDF pelo navegador
> - Orçamento simples para cliente, com itens e valores comerciais, sem mostrar
>   custos internos, margem ou lucro, personalizado com sua logo, cores e contatos
> - Backup dos seus dados em arquivo, para guardar uma cópia e levar os cadastros
>   a outro aparelho
> - Modo avançado: fator de correção, perda de produção, sub-receitas e medidas
>   caseiras *(em desenvolvimento — incluído no que você já comprou)*
>
> Seus dados ficam salvos **no seu navegador**. Nada é enviado para a nuvem no
> Essencial — e por isso vale fazer backup de vez em quando.

### 5.4 "O que será Pro"

> **Minha Fatia Pro Anual — em desenvolvimento**
>
> - Sincronização em nuvem: seus dados no celular e no computador, sempre iguais
> - Histórico de preços dos ingredientes e alerta quando algo subir
> - Exportação avançada em PDF de relatórios e documentos profissionais
> - Engenharia de cardápio: quais doces puxam seu lucro e quais só dão trabalho
> - Scanner de nota do mercado com inteligência artificial
> - Relatórios de evolução de custo e margem
>
> **Nenhum desses recursos existe ainda.** Estão listados aqui para você saber
> exatamente o que é e o que não é o Essencial — não para te vender uma promessa.

### 5.5 Compromisso de compra única

> **Compra única quer dizer compra única.**
>
> Você paga uma vez pelo Minha Fatia Essencial e tem acesso vitalício à versão
> Essencial atual. Não há mensalidade nem renovação no Essencial.
>
> A compra inclui o que está identificado na oferta atual. Recursos novos e
> avançados que dependam de serviços contínuos poderão pertencer ao Pro Anual
> futuro; não se promete que toda função criada depois fará parte do Essencial.

### 5.6 Proposta de crédito de upgrade — não publicada

> **Comprou o Essencial e depois quis o Pro? O valor volta para você.**
>
> Quando o Pro Anual for lançado, quem já comprou o Essencial pode abater o valor
> pago na primeira anuidade.
>
> Como funciona: o desconto é aplicado uma única vez, na primeira assinatura do
> Pro, dentro do primeiro ano de lançamento. É um desconto, não uma devolução —
> não vira dinheiro nem pode ser transferido para outra pessoa. Se você preferir
> continuar só no Essencial, ele segue seu, do mesmo jeito, para sempre.

> **Estado na P0-7:** esta proposta não foi levada à página de preços nem à copy
> de compra. Ela depende de aprovação comercial e mecanismo operacional antes de
> virar promessa pública.

### 5.7 P0-4 a P0-7 entregues; próximos passos

- **P0-4 — Orçamento para cliente:** entregue como visualização comercial separada,
  com itens manuais, rascunho local e impressão, sem expor custos, mão de obra,
  margem, markup ou lucro esperado da confeiteira.
- **P0-4A — Identidade do orçamento:** entregue com nome da marca, logo local
  otimizada, contatos, condições padrão e paleta sugerida via canvas/editável,
  aplicada à visualização e à impressão sem levar dados internos ao documento.
- **P0-5 — Ficha técnica da receita:** entregue na área de Receitas com seleção,
  detalhamento de ingredientes/sub-receitas, rendimento, perda, custos existentes
  e impressão local separada dos documentos de orçamento e precificação.
- **P0-6 — Polimento final pré-lançamento:** entregue nas páginas principais com
  jornada ordenada, CTAs claros, estados vazios orientativos, nomenclatura consistente
  e navegação móvel ajustada, sem alterar cálculos, dados ou controle de acesso.
- **P0-7 — Oferta, preços e copy de lançamento:** entregue com o Essencial como
  oferta atual, preço preservado, compra e acesso explicados, Pro identificado como
  futuro, expectativas sobre dados locais e backup e aviso contábil discreto.
- **P1 — Orçamentos avançados:** evolução da rota com clientes, histórico, status,
  duplicação de orçamento e reaproveitamento de cliente.

### 5.8 FAQ

**1. Tem mensalidade?**
Não. O Essencial é pagamento único e não tem mensalidade nem renovação. O Pro,
quando existir, será assinatura anual — nunca mensal.

**2. Meus dados ficam salvos onde?**
No seu próprio navegador, no seu aparelho. Nada vai para a nuvem no Essencial. Por
isso existe o backup em Configurações: exporte de vez em quando e guarde o
arquivo.

**3. Se eu trocar de celular, perco tudo?**
Se você não tiver feito backup, sim. Exporte o arquivo em Configurações antes de
trocar e importe no aparelho novo. Sincronização automática entre aparelhos será
um recurso do Pro.

**4. O que acontece com meu Essencial quando o Pro sair?**
O acesso vitalício à versão Essencial atual continua sendo uma compra separada.
O Pro, quando existir, será opcional e terá condições próprias. A proposta de
crédito de upgrade ainda não faz parte da oferta pública e não deve ser prometida.

**5. Sub-receitas e medidas caseiras são do Pro?**
Não, são do Essencial. Os cálculos já estão prontos e as telas estão em
desenvolvimento — quem comprou vai receber sem pagar nada a mais.

**6. Preciso de internet para usar?**
Você precisa de internet para entrar e abrir as áreas protegidas. Os cálculos e o
armazenamento dos dados do Essencial acontecem no navegador.

**7. E se eu pedir reembolso?**
O pedido segue a política apresentada no checkout. Quando o reembolso é aprovado,
o acesso é encerrado. Os dados continuam no navegador; enquanto ainda houver
acesso, é possível exportar o backup.

**8. Comprei com um e-mail e me cadastrei com outro. E agora?**
Fale com o suporte com o número do pedido. A liberação é feita pelo e-mail da
compra, então o jeito mais simples é usar o mesmo nos dois.

**9. Serve para quem está começando?**
Sim. O fluxo principal orienta Ingredientes → Receitas → Embalagens → Precificação
→ Orçamento, e os recursos avançados ainda em desenvolvimento aparecem separados.

**10. Posso usar em mais de um aparelho?**
Sua conta funciona em qualquer aparelho, mas os dados ficam salvos em cada um
separadamente. Para usar os mesmos dados nos dois, hoje é exportar e importar o
backup. Sincronização automática poderá fazer parte do Pro futuro.

**11. O Minha Fatia substitui contador?**
Não. É uma ferramenta de apoio à gestão e precificação. Impostos, regime tributário
e obrigações fiscais variam conforme o negócio e precisam de avaliação própria.
Um possível recurso “Fale com contador” fica apenas no backlog e não foi implementado
na P0-7.

---

## 6. Estimativa de prazo

Base: **34 commits em ~6 semanas**, em fases pequenas com validação e documentação
a cada passo. As estimativas abaixo **mantêm esse ritmo** — incluem escrever
documentação e validar, porque é assim que este projeto anda.

Considerando **~4 h úteis por dia**.

### 6.1 Essencial redondo no ar

| Fase | Trabalho | Horas | Depende de |
|---|---|:--:|---|
| A1 | Diagnóstico do webhook (seção 3) | **2–4** | — |
| A2 | Capturar payload real com compra de R$ 1 | **2–3** | A1, deploy |
| A3 | `compra_aprovada` → licença ativa + convite/identificação | **8–12** | A2, decisão C7 |
| A4 | Reembolso e chargeback revogando | **4–6** | A3 |
| A5 | SMTP próprio + `NEXT_PUBLIC_APP_URL` + confirmação de e-mail | **2–4** | — |
| A6 | Teste ponta a ponta: comprar → e-mail → cadastrar → entrar → usar | **4–6** | A3, A5 |
| A7 | Teste em navegador real (celular e desktop) — **dívida desde a Fase 2-2** | **4–8** | — |
| A8 | Correções do que A6/A7 revelarem | **6–12** | A6, A7 |
| A9 | Preço, copy final e `Header` ✅; suporte ainda pendente | **3–5** | — |
| | **Total** | **35–60 h** | |

> **≈ 9 a 15 dias úteis.** Chamar de **2 a 3 semanas** é honesto. A faixa é larga
> por causa de A8: ninguém nunca clicou neste app, e essa é a maior incerteza do
> cronograma.

### 6.2 Sub-receitas e medidas caseiras na interface (Fase 3 parcial)

| Fase | Trabalho | Horas |
|---|---|:--:|
| B1 | Modo simples × avançado (alternância que não assusta a iniciante) | **4–6** |
| B2 | Fator de correção e perda de produção na tela de receita | **4–6** |
| B3 | Sub-receitas na interface (a mais complexa: seleção, uso parcial, aviso de referência circular) | **8–12** |
| B4 | Medidas caseiras nos formulários | **4–6** |
| B5 | Validação e ajuste de UX | **3–5** |
| | **Total** | **23–35 h** |

> **≈ 6 a 9 dias úteis.** Pode sair **depois** do lançamento: já está anunciado
> como "em desenvolvimento" e incluído na compra.

### 6.3 Pro V1, sem IA

| Fase | Trabalho | Horas |
|---|---|:--:|
| C1 | Resolver síncrono × assíncrono no `storageService` — **a peça cara**; hoje `useSyncExternalStore` exige `getSnapshot()` síncrono e Supabase é assíncrono | **16–24** |
| C2 | Migrations das tabelas de dados na nuvem + RLS por usuária | **6–10** |
| C3 | Sincronização, resolução de conflito, estado offline | **16–24** |
| C4 | Histórico de preços + alerta de aumento | **8–12** |
| C5 | Exportação avançada em PDF | **6–10** |
| C6 | Engenharia de cardápio na interface | **8–12** |
| C7 | Gating do Pro (4-6B) + checkout do Pro + webhook anual com vencimento | **8–12** |
| C8 | Teste ponta a ponta do Pro | **6–10** |
| | **Total** | **74–114 h** |

> **≈ 19 a 29 dias úteis — 4 a 7 semanas.** C1 e C3 concentram o risco: são o
> problema técnico mais difícil que sobrou no projeto inteiro.

### 6.4 Pro completo, com IA/scanner

| Fase | Trabalho | Horas |
|---|---|:--:|
| D1 | Upload de imagem + armazenamento | **6–10** |
| D2 | Extração de itens da nota com modelo multimodal | **12–20** |
| D3 | Tela de conferência (a IA erra; a cliente confirma antes de gravar) | **8–12** |
| D4 | Casamento com ingredientes já cadastrados | **8–12** |
| D5 | Controle de custo por chamada, limite de uso, relatórios | **8–12** |
| | **Total** | **42–66 h** |

> **≈ 11 a 17 dias úteis.** Some ao Pro V1: **6 a 11 semanas** do zero ao Pro
> completo.

### 6.5 Resumo

| Marco | Horas | Dias úteis | Calendário |
|---|:--:|:--:|---|
| **Essencial no ar, vendendo** | 35–60 | 9–15 | **2–3 semanas** |
| + sub-receitas e medidas caseiras | +23–35 | +6–9 | +1,5–2 semanas |
| + Pro V1 sem IA | +74–114 | +19–29 | +4–7 semanas |
| + IA/scanner | +42–66 | +11–17 | +2,5–4 semanas |

---

## 7. Próximas fases recomendadas

### Fase 4-7D — Diagnóstico do webhook real

- **Objetivo:** descobrir por que o teste da Kiwify não apareceu, e qual é o
  mecanismo de autenticação real.
- **Permitido:** ler logs, testar URL pública, conferir envs, ajustar cadastro na
  Kiwify, redeployar.
- **Proibido:** alterar o handler; afrouxar a validação de token; aceitar corpo
  não-JSON.
- **Arquivos prováveis:** nenhum — é investigação. No máximo `.env` na Vercel.
- **Validação:** uma invocação registrada com status conhecido.
- **Risco principal:** "consertar" o código antes de saber o que quebrou.
- **Pronto quando:** você souber o status HTTP que a Kiwify recebeu.

### Fase 4-7E — Captura do payload real

- **Objetivo:** gravar em `webhook_events` pelo menos um `compra_aprovada`
  verdadeiro.
- **Permitido:** compra real de valor mínimo; implementar HMAC **se** a 4-7D
  provar que é necessário; fazer os caminhos de 400 logarem o motivo.
- **Proibido:** criar licença; alterar `licenses`; inferir formato de payload.
- **Arquivos prováveis:** `app/api/webhooks/kiwify/route.ts`,
  `lib/webhooks/kiwify-payload.ts`.
- **Validação:** linha em `webhook_events` com `event_type = 'compra_aprovada'`,
  `provider_event_id` **não nulo**, `payload` real.
- **Risco principal:** `provider_event_id` vir nulo — aí a idempotência não existe
  e o desenho precisa mudar antes da 4-7F.
- **Pronto quando:** o payload real estiver no banco e os extractores baterem com
  ele.

### Fase 4-7F — `compra_aprovada` → licença ativa

- **Objetivo:** compra aprovada libera acesso sozinha.
- **Permitido:** resolver a usuária pelo e-mail; convidar via Admin API se não
  existir; `INSERT` em `licenses` com `ON CONFLICT DO NOTHING`; `INSERT` em
  `license_events`; marcar `webhook_events.status = 'processed'`.
- **Proibido:** aceitar payload sem `provider_event_id`; criar licença sem evento
  de auditoria; expor service role fora do route handler; tratar reembolso aqui.
- **Arquivos prováveis:** `route.ts`, `services/supabase/admin.ts`, possivelmente
  uma migration para `pending_purchases`.
- **Validação:** compra real → licença `one_time` ativa → `/ingredientes` abre.
- **Risco principal:** compra antes do cadastro (C7). **Decidir antes de codar.**
- **Pronto quando:** uma compra de verdade liberar o acesso sem intervenção.

### Fase 4-7G — Reembolso e chargeback

- **Objetivo:** revogação automática.
- **Permitido:** `UPDATE licenses.status`; `INSERT` em `license_events`.
- **Proibido:** `DELETE` de licença; `UPDATE` em `license_events` (o trigger
  bloqueia); revogar licença de outro provedor.
- **Arquivos prováveis:** `route.ts`.
- **Validação:** reembolso real → `/ingredientes` redireciona para
  `/acesso-bloqueado` na requisição seguinte.
- **Risco principal:** reembolso parcial ou de outro produto revogando o que não
  devia.
- **Pronto quando:** reembolso derrubar o acesso sem cache para expirar.

### Validação final em produção — ciclo comercial real ✅

- **Resultado:** compra e reembolso reais do Doce Margem Essencial processados com HTTP 200.
- **Concessão:** `compra_aprovada` `processed`, usuária criada, convite entregue, senha criada, licença `active` e auditoria `granted`.
- **Uso:** acesso confirmado em `/conta`, `/ingredientes`, `/receitas`, `/precificacao` e `/configuracoes`.
- **Revogação:** `compra_reembolsada` `processed`, licença `refunded`, auditoria `refunded` e redirecionamento para `/acesso-bloqueado`.
- **Higiene final:** licenças manuais e webhooks antigos `failed`/`ignored` removidos; ficaram somente os eventos `processed` da compra e do reembolso reais.
- **Limite:** chargeback ainda não passou por teste manual ponta a ponta, embora compartilhe o mecanismo de revogação.

### Fase 4-8 — Teste ponta a ponta e navegador real

- **Objetivo:** pagar a dívida que atravessa o projeto desde a Fase 2-2.
- **Permitido:** clicar em tudo, celular e desktop; corrigir o que aparecer.
- **Proibido:** mudança estrutural de arquitetura; refatoração oportunista.
- **Arquivos prováveis:** componentes de formulário, `Header`.
- **Validação:** roteiro completo — comprar, receber e-mail, cadastrar, entrar,
  cadastrar ingrediente, montar receita, precificar, exportar backup.
- **Risco principal:** é aqui que aparece o bug que ninguém previu. Reserve folga.
- **Pronto quando:** o roteiro rodar inteiro num celular real sem travar.

### Fase 4-9 — Polimento comercial do Essencial

- **Objetivo:** deixar a oferta apresentável.
- **Estado do código:** a P0-6 concluiu a jornada e os estados de uso; a P0-7
  concluiu oferta, preço, CTAs e expectativas de compra no app. Checkout publicado,
  suporte e ajustes externos de lançamento continuam no checklist operacional.
- **Permitido:** preço, copy da seção 5, `Header` sem links que rebatem, canal de
  suporte, apagar as contas e linhas de teste.
- **Proibido:** recurso novo; mexer em `modules/pricing`.
- **Arquivos prováveis:** `app/precos/page.tsx`,
  `components/layout/Header.tsx`, `.env`.
- **Validação:** visitante entende em 30 segundos o que compra e o que não compra.
- **Risco principal:** prometer o Pro com data.
- **Pronto quando:** a página de preços passar no teste de honestidade da 5.2.

### Fase 5 — Modo avançado na interface (Fase 3 original)

- **Objetivo:** entregar o que o Essencial já promete.
- **Permitido:** UI para fator de correção, perda, sub-receitas, medidas caseiras;
  alternância simples/avançado.
- **Proibido:** **alterar `modules/pricing`** — a matemática está validada;
  colocar isso atrás de gating.
- **Arquivos prováveis:** `components/recipes/*`, `components/ingredients/*`.
- **Validação:** valores idênticos aos exemplos já verificados da Fase 1B.
- **Risco principal:** assustar a usuária iniciante. Simples continua padrão.
- **Pronto quando:** os quatro recursos aparecerem na tela e virarem `available`.

### Fase 6 — Pro V1

- **Objetivo:** primeira versão paga anual.
- **Permitido:** resolver síncrono × assíncrono, nuvem, histórico, PDF, cardápio,
  gating do Pro.
- **Proibido:** quebrar o Essencial local-first; migrar dados sem backup;
  transformar recurso do Essencial em Pro.
- **Arquivos prováveis:** `services/storage-service.ts`, stores, migrations novas.
- **Validação:** Essencial continua idêntico para quem não tem Pro.
- **Risco principal:** C1 (sincronia). É a peça mais difícil que sobrou.
- **Pronto quando:** dois aparelhos mostrarem os mesmos dados sem o Essencial
  regredir.

---

## 8. Checklist do dia do lançamento

### Vercel
- [x] **Identificação do produto configurada e validada com compra real** — manter `KIWIFY_ESSENTIAL_PRODUCT_ID` como opção principal
- [ ] Deployment de **Production** aponta para o commit mais recente de `main`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` preenchidas
- [ ] `SUPABASE_SERVICE_ROLE_KEY` preenchida — **sem** prefixo `NEXT_PUBLIC_`
- [x] `KIWIFY_WEBHOOK_SECRET` validada pelos webhooks reais processados
- [x] `NEXT_PUBLIC_APP_URL` = domínio real, validada pelo fluxo de convite
- [ ] No cutover, atualizar `NEXT_PUBLIC_APP_URL` para `https://www.minhafatia.com.br` e fazer redeploy
- [ ] `NEXT_PUBLIC_BUY_ESSENTIAL_URL` = `https://pay.kiwify.com.br/i5YqT17`
- [ ] `NEXT_PUBLIC_SUPPORT_WHATSAPP` preenchida
- [ ] **Redeploy feito depois** de mexer nas variáveis

### Supabase
- [x] **Redirect URLs inclui `https://docemargem.doceriadamora.com.br/auth/accept-invite`** ✅
- [ ] Adicionar `https://www.minhafatia.com.br/auth/accept-invite` às Redirect URLs antes do cutover do novo domínio
- [x] SMTP próprio (Resend) configurado e convite entregue ✅
- [ ] SPF, DKIM e DMARC do domínio configurados no Resend (o convite caiu em spam no teste)
- [ ] Migrations 0001–0004 aplicadas
- [ ] RLS habilitada em `profiles`, `user_access_flags`, `licenses`,
      `license_events`, `webhook_events`
- [ ] `anon` e `authenticated` **sem** `INSERT`/`UPDATE` em `licenses`
- [x] SMTP próprio configurado (Resend/Supabase SMTP)
- [ ] Redirect URLs do Auth incluem o domínio real + `/auth/callback`
- [ ] Perfis antigos de teste permanecem, mas sem licença ativa
- [x] Webhooks antigos `failed`/`ignored` removidos
- [ ] Nenhum perfil sem linha em `user_access_flags` (consulta 5.4 da 0004)

### Kiwify
- [ ] Preço definido e publicado
- [x] Webhook cadastrado e recebendo eventos no endpoint de produção
- [x] Eventos de compra aprovada e reembolso recebidos e processados
- [ ] Chargeback manual ainda não testado ponta a ponta
- [x] Autenticação entre o webhook da Kiwify e a Vercel validada
- [x] Produto do webhook = produto do checkout, confirmado pela compra real do Doce Margem Essencial
- [ ] E-mail de confirmação da Kiwify orienta a **usar o mesmo e-mail** no cadastro

### Domínio e Auth
- [ ] Domínio apontando, HTTPS válido
- [ ] `GET /api/webhooks/kiwify` devolve **405** (não 404)
- [ ] Cadastro envia e-mail de confirmação que **chega**
- [x] Link de convite leva ao domínio real e permite criar senha
- [x] Login/acesso autenticado funciona; logout ainda precisa entrar na revisão pré-venda
- [ ] `/precos` e `/acesso-bloqueado` abrem sem sessão
- [ ] `/`, `/ingredientes`, `/receitas`, `/precificacao`, `/configuracoes`
      redirecionam para `/login` sem sessão

### Teste de compra (com dinheiro real)
- [x] Comprar com um e-mail que **não** tem conta
- [x] Webhook `compra_aprovada` registrado como `processed`
- [x] Licença criada com `provider = 'kiwify'` e status `active`
- [x] `license_events` tem `granted`
- [x] Convite, criação de senha e acesso às cinco rotas protegidas validados
- [ ] Repetir com e-mail que **já** tem conta

### Teste de reembolso
- [x] Pedir reembolso da compra real
- [x] Webhook `compra_reembolsada` registrado como `processed`
- [x] `licenses.status` vira `refunded`
- [x] `license_events` registra `refunded`
- [x] Acesso cai e a usuária é redirecionada para `/acesso-bloqueado`
- [ ] Chargeback manual ponta a ponta (mesmo mecanismo de revogação; ainda não exercitado com evento real)

### Limpeza após o teste real
- [x] Licenças manuais de teste removidas
- [x] Webhooks antigos `failed`/`ignored` removidos
- [x] Banco mantido somente com os eventos `processed` da compra e do reembolso reais
- [ ] Perfis antigos de teste permanecem, sem licença ativa

### Suporte
- [ ] Canal ativo e monitorado no dia
- [ ] Resposta pronta para "paguei e não recebi"
- [ ] Resposta pronta para "comprei com outro e-mail"
- [ ] Você sabe conceder licença por SQL, caso o webhook falhe

### Rollback
- [ ] Deployment anterior identificado na Vercel (rollback é um clique)
- [ ] Checkout pode ser pausado na Kiwify sem apagar nada
- [ ] SQL de concessão manual testado **antes** de precisar dele
- [ ] Migrations não têm `down` — **rollback de banco é manual**, saiba disso
      antes e não depois

---

## 9. Riscos de segurança e compliance

| # | Risco | Estado | O que falta |
|---|---|---|---|
| S1 | **Service role vazar no bundle** | 🟢 controlado | lida por um arquivo só, com `server-only`. **Nunca** dar prefixo `NEXT_PUBLIC_` |
| S2 | **Cliente se conceder licença** | 🟢 fechado | zero policy de escrita **e** zero privilégio em `licenses` — duas barreiras |
| S3 | **Cliente se desbloquear** | 🟢 fechado | `user_access_flags` separada, sem escrita para cliente |
| S4 | **Webhook público aceitar payload forjado** | 🟢 fechado e confirmado | HMAC do corpo cru validado também pelo tráfego real: compra e reembolso da Kiwify foram autenticados e processados em produção |
| S5 | **Token da Kiwify vazar** | 🟡 atenção | se viajar em query string, entra em log de proxy. Prefira header quando houver escolha; nunca logue a URL completa |
| S6 | **Reembolso não revogar** | 🟢 fechado | Fase 4-7H. Reembolso e chargeback revogam e auditam; acesso cai na requisição seguinte. Revogação sem licença fica `failed` e retriável, para não deixar a aprovação atrasada liberar quem foi reembolsado |
| S7 | **Licença indevida por replay** | 🟢 fechado | índice único parcial testado — replay devolve 200 sem duplicar |
| S8 | **Idempotência sumir com `provider_event_id` nulo** | 🟢 fechado | Confirmado que a Kiwify não envia event_id. Fase 4-7F derivou a chave `evento:pedido`, testada: replay não duplica, e reembolso do mesmo pedido gera linha própria |
| S9 | **Compra com e-mail diferente** | 🔴 **aberto** | sem automação possível; precisa de admin + processo de suporte |
| S10 | **Comprador sem cadastro** | 🟢 fechado | compra real criou a usuária, entregou convite via Resend/Supabase SMTP e permitiu a criação de senha |
| S11 | **Open redirect no login** | 🟢 fechado | não há `?next=`. Se for implementado, validar caminho interno |
| S12 | **Open redirect no callback** | 🟢 fechado | `/auth/callback` já valida que `next` começa com `/` e não com `//` |
| S13 | **Enumeração de e-mail** | 🟢 tratado | mensagem genérica no login; webhook não conta se o e-mail existe |
| S14 | **Dado pessoal em `webhook_events.payload`** | 🟡 atenção | LGPD: `DELETE` permitido a papéis administrativos. Falta política escrita de retenção |
| S19 | **Licença concedida sem registro de auditoria** | 🟢 fechado | A 4-7G ignorava o erro do `insert` em `license_events`. Corrigido: falha vira `failed` + 500, o reenvio cura, e a auditoria é idempotente por estado (consulta antes de inserir). Janela entre licença e auditoria continua existindo — mas nunca se fecha em silêncio |
| S20 | **Venda de outro produto liberar o Minha Fatia** | 🟢 fechado | Webhook cadastrado como "todos os produtos que sou produtor" faria qualquer venda sua liberar licença aqui. Fase 4-7I valida `Product.product_id` contra `KIWIFY_ESSENTIAL_PRODUCT_ID`; produto diferente vira `ignored`, env ausente falha fechada |
| S21 | **Teste do painel da Kiwify liberar licença** | 🟢 fechado e confirmado | O botão "Testar Webhook" retornou 200 em produção e foi ignorado com segurança, sem conceder acesso |
| S18 | **Conta com evento de licença não pode ser excluída** | 🔴 **aberto** | Descoberto na 4-7G e isolado com teste A/B/C: `license_events.user_id` usa `ON DELETE SET NULL`, que é um UPDATE, e o trigger `license_events_immutable` bloqueia UPDATE para todos. **Pedido de exclusão (LGPD) não tem caminho automático.** Correção exige migration |
| S15 | **Perda de dados locais** | 🟡 produto | `localStorage` some com limpeza de navegador. Backup existe; **a comunicação precisa ser explícita** |
| S16 | **Rollback de banco é manual** | 🟡 operacional | migrations sem `down`. Aplicar direto em produção sem staging é o padrão atual |
| S17 | **`service_role` sem grant em tabela nova** | 🟡 recorrente | por decisão, não há `alter default privileges`. **Toda tabela nova precisa do grant explícito** |

O ciclo automático de compra e reembolso está fechado. Permanecem riscos
operacionais/comerciais, em especial compra com e-mail divergente, exclusão de
perfis com histórico, entregabilidade do convite e a revisão pré-venda.

---

## 10. Atualizações nos documentos existentes

- **`TASKS.md`** — ponteiro para este documento no cabeçalho.
- **`REVIEW.md`** — seção de auditoria pré-lançamento apontando para cá.
- **`DECISIONS.md`** — atualizado apenas com a validação posterior das decisões
  já tomadas sobre filtro do webhook, concessão e revogação. Nenhuma regra nova
  de produto foi criada. A regra de crédito de upgrade (5.1) continua pendente
  de aprovação.
- **`PLAN-FASE-4.md`** — não alterado; o capítulo 13 continua válido e a seção 7
  daqui é a continuação dele.
- **`README.md`** — não alterado. A tabela de planos continua batendo com
  `lib/features.ts`.
