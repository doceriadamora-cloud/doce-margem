# CLAUDE — Memória de execução do Minha Fatia

> **Marca atual:** Minha Fatia. O projeto se chamava Doce Margem antes do rebrand de 2026-08-09; nomes técnicos legados permanecem quando necessários para compatibilidade.

Regras permanentes para qualquer trabalho neste projeto. Leia este arquivo antes de começar.

## Objetivo do produto
App de **precificação para confeiteiras**. Promessa: "Pare de vender doce no achismo. Descubra quanto custa produzir, quanto cobrar e qual margem sobra em cada venda." Calcula custo de ingredientes, ficha técnica, rendimento, CMV, custo unitário, preço sugerido, margem, markup, custos fixos, preço por canal e engenharia de cardápio.

## Stack principal
- Next.js 16 (App Router) + React 19
- TypeScript **estrito** (`strict: true`)
- Tailwind CSS v4
- ESLint
- Supabase (Auth, Postgres, RLS) — a partir da Fase 4
- Arquitetura modular, mobile first, PWA-ready

> ⚠️ Esta versão do Next.js tem breaking changes. Consulte `node_modules/next/dist/docs/` e o `AGENTS.md` antes de escrever código de Next.

## Como trabalhar (regras inegociáveis)

### Fases e aprovação
- Trabalhar **sempre por fases**, em tarefas pequenas. Nunca implementar o projeto inteiro de uma vez.
- **Nunca avançar de fase sem aprovação explícita** do responsável. Ao terminar uma fase: parar, resumir e aguardar.
- Antes de iniciar qualquer fase nova, **ler `README.md`, `TASKS.md`, `REVIEW.md` e `DECISIONS.md`**.

### Documentação viva
- Atualizar `TASKS.md` ao **concluir tarefas** (marcar `[x]` e adicionar novas tarefas quando surgirem).
- Atualizar `REVIEW.md` ao **concluir cada fase** (status, o que foi feito, problemas, riscos, pendências).
- Atualizar `DECISIONS.md` sempre que houver **decisão importante** (arquitetural, comercial ou de produto). Nunca remover decisões antigas — registrar nova entrada explicando a mudança.
- Atualizar o `README.md` quando uma decisão estrutural mudar (ele é a especificação viva).

### Regras comerciais
- **Não criar plano mensal** em hipótese alguma (código, copy ou banco).
- Manter apenas **compra única (Essencial)** + **Pro Anual**.
- Compra única = "acesso vitalício à versão Essencial **atual**" (não prometer funções futuras).
- Acesso sempre controlado por login/licença; reembolso, chargeback e bloqueio manual **revogam acesso**.

### Regras técnicas
- **Não misturar lógica de cálculo com interface.** A matemática de precificação vive em `modules/` (funções puras, sem UI/armazenamento).
- **Não alterar a matemática sem validação/testes.** Mudou cálculo → validar antes de seguir.
- Persistência **desacoplada** via `storageService` (localStorage no Essencial; Supabase/cloud no Pro). Nunca acoplar a UI direto ao `localStorage`.
- Permissões validadas **no backend**, não só no frontend. Feature flags centralizadas (`canAccessFeature`), sem espalhar condicionais de plano pelo app.
- Usar **TypeScript estrito**.
- Rodar `npm run typecheck` quando fizer sentido (e `npm run lint` / `npm run build` antes de deploy).

### Regras de produto / UX
- **Preservar a simplicidade para a usuária iniciante.** Modo simples é o padrão; modo avançado existe mas não aparece cedo demais nem assusta.
- Não remover a lógica avançada — apenas organizar a experiência.

## Comandos úteis
```powershell
npm run dev         # desenvolvimento (http://localhost:3000)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # build de produção
```

## Papéis conceituais
Ver `AGENTS.md` para os agentes conceituais (Produto, Arquitetura, Domínio, Front-end, QA).

@AGENTS.md
