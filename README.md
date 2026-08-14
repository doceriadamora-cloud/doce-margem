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
| Impressão da ficha técnica da receita | ✅ | ✅ |
| CMV, custo unitário | ✅ | ✅ |
| Preço sugerido, margem, markup | ✅ | ✅ |
| Preço por canal (básico) | ✅ | ✅ |
| Custos fixos | ✅ | ✅ |
| Cadastro e custo de embalagens | ✅ | ✅ |
| Mão de obra / tempo de produção | ✅ | ✅ |
| Ficha interna de precificação | ✅ | ✅ |
| Orçamento simples para cliente | ✅ | ✅ |
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

---

## 4. Arquitetura planejada

Princípios:
- **Lógica de cálculo 100% separada da UI** (módulos puros e testáveis em `modules/`).
- **Persistência desacoplada** por trás de um `storageService` (localStorage no Essencial; Supabase/cloud no Pro). Nunca acoplar a UI direto ao `localStorage`.
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

**Fora do escopo da P0-9A:** sub-receitas (P0-9B) e medidas caseiras (P0-9C) seguem com motor pronto e sem interface.

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
**App atual:** `/`, `/ingredientes`, `/receitas`, `/embalagens`, `/precificacao`, `/orcamentos`, `/configuracoes`, `/conta`
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
- **Fases P0-9B e P0-9C — Sub-receitas e Medidas caseiras:** ainda planejadas. O motor existe desde a Fase 1B; falta a interface.
- **P1 recomendado — Orçamentos avançados:** evolução da rota atual com clientes, histórico, status, duplicação de orçamento e reaproveitamento de cliente.
