# TASKS — Minha Fatia

> **Marca atual:** Minha Fatia. Referências datadas a Doce Margem abaixo registram o nome anterior do projeto; identificadores técnicos legados foram preservados por compatibilidade.

> Desenvolvimento por fases e em tarefas pequenas. **Não executar tudo de uma vez.**
> Marcar `[x]` ao concluir. Adicionar novas tarefas quando surgirem.
> Antes de iniciar uma nova fase: parar, resumir o que foi feito e aguardar aprovação.

**Fase atual:** P0-9C — Medidas caseiras, rendimento real e unidades seguras (2026-08-13): seletor de unidade de rendimento, normalização de unidades antigas, entrada por lata/caixinha/xícara/colher com conversão defensável e assistente de perda pelo rendimento real. **Nenhum recurso do Essencial continua anunciado como em desenvolvimento.**
**Próximo passo recomendado:** validações manuais em produção pendentes da P0-8A (botão de compra e e-mail de recuperação) e abertura da venda; P1 permanece como evolução dos Orçamentos.

> 🚨 **Antes da venda pública — validações externas, não resolvíveis em código:**
> 1. Abrir `/precos` em produção, clicar em "Comprar acesso ao Essencial" e confirmar que vai para o checkout correto da Kiwify. **Não concluir nova compra de teste sem decisão do dono.**
> 2. Cadastrar `https://<domínio>/auth/nova-senha` nas Redirect URLs do painel do Supabase e enviar um link de recuperação real para uma conta de teste.
> 3. Mandar uma mensagem de teste para o WhatsApp de suporte (`wa.me/5521959054988`) por um dos CTAs do app e confirmar que ela chega ao aparelho certo.

> 📋 **Auditoria pré-lançamento (2026-08-07): `GO-LIVE-AND-PRO-ROADMAP.md`** —
> estado do produto, 10 bloqueadores críticos, diagnóstico do webhook, fronteira
> Essencial × Pro, copy pública, prazos e checklist de lançamento.
> **Estado atual:** o ciclo compra → acesso → reembolso → bloqueio está validado em produção. A venda oficial ainda não foi aberta.

### Rebrand controlado — Minha Fatia ✅
- [x] Atualizar navbar, login, cadastro, preços, conta, acesso bloqueado e fluxo visual de convite
- [x] Atualizar metadata, títulos, descrições e nomes comerciais dos planos
- [x] Atualizar documentação viva e registrar a preservação dos identificadores legados
- [x] Adotar `https://www.minhafatia.com.br` como domínio público documentado
- [x] Preservar rotas, auth, licenças, migrations, webhook, validação Kiwify, envs e pricing engine
- [x] Rodar `typecheck`, `lint` e `build` com sucesso após o rebrand
- [ ] **Cutover externo, fora deste rebrand de código:** configurar o novo domínio na Vercel, Supabase, Resend e variáveis de ambiente antes da abertura oficial

### Fase P0-1 — Módulo de Embalagens ✅
- [x] Criar tipos, validações e funções puras de custo unitário, custo por uso e custo total de embalagens
- [x] Persistir embalagens no `AppState` v1 sem mudar `APP_STATE_STORAGE_KEY` nem descartar dados antigos
- [x] Manter backups anteriores compatíveis: `packagings` ausente é normalizado para `[]`; formato continua v1
- [x] Criar rota `/embalagens` com cadastro, custo unitário, listagem e remoção
- [x] Adicionar Embalagens à navegação e ao resumo do Painel
- [x] Permitir múltiplas embalagens e quantidade usada por venda/produto na Precificação
- [x] Somar embalagens ao custo direto antes de custo fixo percentual, margem e taxas do canal
- [x] Exibir “Custo de embalagens” separado no resultado
- [x] Preservar webhook/Kiwify, autenticação, licenças, envs, Supabase schema/migrations e SQL
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-2 — Mão de obra / tempo de produção ✅
- [x] Criar tipos, validações e funções puras para tempo em horas/minutos, custo total e custo por unidade
- [x] Permitir valor/hora e tempo de produção na Precificação, com zero como entrada válida
- [x] Persistir somente o valor/hora em `BusinessSettings`; manter o tempo específico da simulação sem persistência
- [x] Somar mão de obra ao custo direto antes de custo fixo percentual, margem e taxas do canal
- [x] Exibir custo da receita, embalagens, mão de obra, custo direto total e custo fixo separadamente
- [x] Manter backups v1 anteriores compatíveis: `laborHourlyRate` ausente é normalizado para `null`
- [x] Atualizar as listas do Essencial e a documentação sem marcar o recurso como planejado
- [x] Preservar webhook/Kiwify, autenticação, licenças, envs, Supabase schema/migrations e SQL
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-3 — Ficha interna de precificação ✅
- [x] Exibir uma ficha visual após o cálculo, com marca, receita, rendimento, custos, canal, lucro/margem e preços
- [x] Reaproveitar exclusivamente o resultado do pricing engine, sem alterar as fórmulas atuais
- [x] Adicionar o botão “Imprimir / salvar PDF” usando `window.print()`, sem biblioteca nova
- [x] Criar estilos de impressão em fundo claro que mostram apenas a ficha e ocultam navegação, formulário, botões e cartões auxiliares
- [x] Deixar explícito que a ficha é para controle interno e expõe custos, mão de obra, embalagens, margem e preço sugerido
- [x] Listar “Ficha interna de precificação” no Essencial e diferenciar a futura “Exportação avançada em PDF” do Pro Anual
- [x] Preservar webhook/Kiwify, autenticação, licenças, envs, Supabase schema/migrations, SQL e `APP_STATE_STORAGE_KEY`
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-4 — Orçamento para cliente ✅
- [x] Criar a rota `/orcamentos` com visualização comercial separada da ficha interna de precificação
- [x] Permitir preencher cliente, contato, data, validade, forma e condições de pagamento
- [x] Gerar um número simples e permitir adicionar ou remover itens com quantidade, valor unitário e total
- [x] Calcular subtotal, desconto opcional e total final somente a partir dos valores comerciais informados
- [x] Exibir somente informações apropriadas ao cliente, sem custos internos, mão de obra, margem, markup ou lucro esperado
- [x] Permitir imprimir ou salvar o orçamento pelo navegador com `window.print()`, sem biblioteca nova
- [x] Persistir um único rascunho atual no `AppState` v1, mantendo dados e backups anteriores compatíveis
- [x] Adicionar Orçamentos à navegação, ao Painel e às listas do Essencial
- [x] Não incluir ainda cadastro avançado de clientes, histórico ou status — esses itens ficam no P1 recomendado
- [x] Preservar pricing engine, webhook/Kiwify, autenticação, licenças, envs, Supabase, migrations, SQL e `APP_STATE_STORAGE_KEY`
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-4A — Personalização visual do orçamento ✅
- [x] Criar a seção “Identidade do orçamento” em `/configuracoes`
- [x] Permitir nome da marca, WhatsApp, Instagram, e-mail, endereço e condições comerciais padrão
- [x] Aceitar logo PNG, JPG/JPEG ou WEBP de até 2 MB e redimensionar/compactar no navegador antes de persistir
- [x] Salvar a logo somente no `AppState`/`localStorage`, com remoção e fallback “Minha Fatia”
- [x] Sugerir cores principal e secundária via canvas, ignorando transparência, branco e preto puros quando possível
- [x] Permitir edição manual da paleta e preservar contraste dos elementos comerciais
- [x] Aplicar logo, marca, contatos e cores à visualização e à impressão/PDF do orçamento
- [x] Manter o documento sem custos internos, mão de obra, embalagem, margem, markup ou lucro
- [x] Manter `AppState` e backups v1 anteriores compatíveis, sem mudar `APP_STATE_STORAGE_KEY`
- [x] Preservar pricing engine, webhook/Kiwify, autenticação, licenças, envs, Supabase, migrations e SQL
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-5 — Imprimir receita / ficha técnica ✅
- [x] Adicionar “Imprimir receita” a cada receita válida cadastrada
- [x] Abrir `window.print()` somente após renderizar a receita selecionada
- [x] Mostrar marca, nome, data de geração, rendimento e perda de produção
- [x] Listar ingredientes, medidas caseiras e sub-receitas com quantidade e custo calculado
- [x] Mostrar custo dos itens, custo total com perda e custo por unidade de rendimento
- [x] Exibir observações quando já existirem no modelo da receita
- [x] Criar CSS de impressão em fundo claro que oculta navegação, formulário, lista e botões
- [x] Reutilizar exclusivamente `calculateRecipe`/`CalculatedRecipe`, sem alterar fórmulas ou pricing engine
- [x] Manter cadastro, edição, remoção, AppState e backups existentes inalterados
- [x] Preservar orçamento, ficha de precificação, webhook/Kiwify, auth, licenças, envs, Supabase, migrations, SQL e `APP_STATE_STORAGE_KEY`
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-6 — Polimento final pré-lançamento ✅
- [x] Ordenar a jornada do Painel: Ingredientes → Receitas → Embalagens → Precificação → Orçamento
- [x] Substituir selos antigos de “Em breve” por links e CTAs claros para as telas já disponíveis
- [x] Identificar as cinco etapas nas páginas principais e simplificar suas orientações
- [x] Melhorar estados vazios de Ingredientes, Receitas, Embalagens, Precificação e Orçamento
- [x] Tornar a marca clicável e melhorar a navegação horizontal em telas pequenas
- [x] Padronizar “Ficha interna de precificação”, “Ficha técnica da receita”, “Orçamento”, “Mão de obra” e “Embalagens”
- [x] Atualizar Conta, Planos e Acesso bloqueado com informações e próximos passos atuais
- [x] Preservar fórmulas, pricing engine, `calculateRecipe`, persistência e `APP_STATE_STORAGE_KEY`
- [x] Preservar Supabase, webhook/Kiwify, autenticação, licenças, envs, migrations e SQL
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-7 — Oferta, preços, checkout e copy de lançamento ✅
- [x] Posicionar o Minha Fatia como ferramenta prática de apoio à gestão e precificação de pequenos negócios artesanais
- [x] Evitar promessa de lucro garantido e explicar que o preço final continua sendo decisão do negócio
- [x] Apresentar o Minha Fatia Essencial como a oferta atual, por R$ 97 à vista ou 12x de R$ 10,03
- [x] Destacar compra única, ausência de mensalidade no Essencial e acesso vitalício à versão Essencial atual
- [x] Explicar convite, uso do e-mail da compra e entrada no app sem alterar o checkout
- [x] Informar que os dados do Essencial ficam no navegador e orientar o backup manual
- [x] Identificar o Pro Anual como futuro, sem preço ou data prometidos, e separar seus recursos avançados
- [x] Padronizar “Ver planos”, “Entrar”, “Comprar acesso ao Essencial” e “Acessar Minha Fatia”
- [x] Simplificar as mensagens de `/acesso-bloqueado` e o status mostrado em `/conta`
- [x] Exibir aviso discreto de que o app não substitui contador nem cobre particularidades fiscais
- [x] Não implementar o recurso ou CTA “Fale com contador” nesta fase
- [x] Preservar Kiwify, webhook, product ID, envs, Supabase, auth, licenças, banco, migrations e SQL
- [x] Preservar fórmulas, pricing engine, `calculateRecipe`, persistência e `APP_STATE_STORAGE_KEY`
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-8 — Auditoria final de lançamento ✅ (somente revisão)
- [x] Revisar `/`, `/precos`, `/acesso-bloqueado`, `/conta`, `/login`, `/cadastro`, `/auth/accept-invite` e as seis telas do Essencial
- [x] Percorrer a jornada de compra → convite → senha → acesso → cadastro → precificação → impressão → orçamento → backup
- [x] Confirmar que o Orçamento não expõe custo, mão de obra, embalagem, margem, markup ou lucro
- [x] Confirmar que Ficha interna de precificação e Ficha técnica da receita se identificam como documentos internos
- [x] Confirmar que a impressão esconde navegação, formulários, listas e botões
- [x] Corrigir a descrição padrão do site, que ainda usava a promessa anterior ao reposicionamento da P0-7
- [x] Corrigir o rodapé do convite, que prometia troca de senha inexistente em `/conta`
- [x] Preservar fórmulas, pricing engine, `calculateRecipe`, Supabase, auth, licenças, Kiwify, webhook, product ID e envs
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`
- [ ] 🔴 **Bloqueador:** criar recuperação de senha (`/login` sem "Esqueci minha senha"; `/conta` sem troca de senha)
- [ ] 🔴 **Bloqueador:** publicar um canal de suporte visível — quatro mensagens mandam "falar com o suporte" e `NEXT_PUBLIC_SUPPORT_WHATSAPP` não é lida por nenhum arquivo
- [ ] 🔴 **Bloqueador:** publicar política de reembolso, termos de uso e política de privacidade
- [ ] Informar o total do parcelamento em `/precos` (12x de R$ 10,03 = R$ 120,36)
- [ ] Decidir a vitrine pública: `/` é protegida e leva visitante ao login
- [ ] Reforçar em `/precos` que os três recursos "em desenvolvimento" do Essencial não viram Pro
- [ ] Padronizar entrada decimal em Ingredientes e Receitas (`type="number"` × texto com vírgula)
- [ ] Acrescentar data de geração e rodapé "documento interno" à Ficha interna de precificação
- [ ] Avisar, no formulário de Orçamento, que "Observações" aparece no documento do cliente
- [ ] Permitir editar embalagem (hoje é a única entidade sem "Editar")
- [ ] Registrar as fases P0-1 a P0-7 em `REVIEW.md`, que só tem entradas até o rebrand

### Fase P0-8A — Pós-venda mínimo antes da venda pública ✅
- [x] Criar `/auth/esqueci-senha` com pedido de link por e-mail e mensagem idêntica para conta existente e inexistente
- [x] Criar `/auth/nova-senha` aceitando fragment, `?code=` do PKCE e sessão já ativa
- [x] Adicionar "Esqueci minha senha" na tela de login, junto do campo de senha
- [x] Adicionar `requestPasswordResetAction` e `setRecoveryPasswordAction` sem compartilhar código com o convite de compra
- [x] Ensinar `InviteHashRescue` a distinguir `type=recovery` de convite, para o link que cair em `/login` chegar à tela certa
- [x] Oferecer troca de senha em `/conta`, reaproveitando o mesmo link por e-mail
- [x] Centralizar o canal de suporte em `lib/support.ts` e criar `SupportLink`
- [x] Exibir suporte em `/precos`, `/acesso-bloqueado`, `/conta`, `/login`, `/auth/esqueci-senha`, `/auth/nova-senha`, no convite com erro e no rodapé
- [x] Criar `/termos`, `/privacidade` e `/reembolso` com casca compartilhada e data única
- [x] Criar rodapé global com links legais e suporte, escondido na impressão por `body > footer`
- [x] Informar o total aproximado do parcelamento em `/precos`, sem alterar preço nem link de compra
- [x] Adicionar aviso fiscal discreto em `/precificacao`, fora do `PricingForm` e fora da impressão
- [x] Conferir no código a leitura de `NEXT_PUBLIC_BUY_ESSENTIAL_URL` e o comportamento quando ela falta
- [x] Não implementar "Fale com contador", CTA para contador ou indicação de profissional
- [x] Preservar Kiwify, webhook, product ID, envs, Supabase, banco, migrations, SQL, licenças e regras de acesso
- [x] Preservar fórmulas, pricing engine, `calculateRecipe` e persistência — nenhum arquivo de `modules/` alterado
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`
- [x] Testar por HTTP: as 5 rotas novas devolvem 200 e as protegidas continuam em 307 para `/login`
- [x] Configurar o WhatsApp oficial de suporte em `lib/support.ts` (`wa.me/5521959054988`)
- [ ] 🚨 Validar em produção o botão de compra de `/precos` (sem concluir compra de teste sem decisão do dono)
- [ ] 🚨 Cadastrar `/auth/nova-senha` nas Redirect URLs do Supabase e testar um e-mail de recuperação real
- [ ] 🚨 Mandar uma mensagem de teste por um CTA do app e confirmar que chega ao WhatsApp de atendimento
- [ ] Revisar as páginas legais com apoio jurídico quando o volume de vendas justificar

### Fase P0-9A — Modo avançado ✅
- [x] Criar `components/advanced/AdvancedSection.tsx` — `<details>` nativo, recolhido por padrão, com selo "opcional" e resumo do que já está preenchido
- [x] Abrir a seção automaticamente quando o item em edição já tem ajuste aplicado, congelando esse estado no primeiro render para não fechar no meio da digitação
- [x] Mover o fator de correção do Ingrediente para dentro do Modo avançado, com explicação de verdade no lugar de "deixe 1 se não sabe o que é isso"
- [x] Mostrar o efeito do fator antes de salvar, calculado por `applyCorrectionFactor`, sem repetir a multiplicação na UI
- [x] Mover a perda de produção da Receita para dentro do Modo avançado, com microcopy sobre forno, corte, manuseio e acabamento
- [x] Mostrar o efeito da perda no custo (bruto → com perda), lido de `calculateRecipe`
- [x] Adicionar "Observações técnicas (uso interno)" à receita, gravando o campo `notes` que já existia no tipo desde a Fase 1B-1
- [x] Corrigir perda silenciosa: `RecipeForm` não preservava `notes` ao editar uma receita
- [x] Exibir na Ficha técnica o fator por item (quando ≠ 1), a nota explicando que ele já está no custo, e renomear a seção para "Observações técnicas"
- [x] Exibir a perda considerada na Precificação e na Ficha interna de precificação, sem alterar o pricing engine
- [x] Reclassificar `advanced_mode` para `available` em `lib/features.ts` e confirmar na `MATRIZ_APROVADA`
- [x] Manter Sub-receitas e Medidas caseiras como planejadas na página de planos
- [x] Preservar fórmulas, pricing engine, `calculateRecipe`, `APP_STATE_STORAGE_KEY` e compatibilidade com dados antigos — nenhum arquivo de `modules/` ou `services/` alterado
- [x] Preservar Supabase, auth, licenças, Kiwify, webhook, product ID e envs
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`

### Fase P0-9B — Sub-receitas ✅
- [x] **Corrigir primeiro:** `RecipeForm` inicializava `items` filtrando `kind: "ingredient"`, então salvar uma edição descartava sub-receitas e medidas caseiras
- [x] Carregar e devolver a receita inteira na edição, preservando também perda de produção e observações técnicas da P0-9A
- [x] Criar o seletor "Adicionar componente: Ingrediente × Sub-receita", com ingrediente como padrão
- [x] Listar só receitas elegíveis: nunca a própria receita em edição, e só as com rendimento em g, kg, ml, l ou un
- [x] Explicar na tela quantas receitas ficaram de fora e por quê, em vez de escondê-las em silêncio
- [x] Limitar as unidades oferecidas às compatíveis com o rendimento da sub-receita escolhida
- [x] Bloquear ciclo no momento de adicionar, reaproveitando `validateRecipe` e filtrando por `CIRCULAR_REFERENCE`
- [x] Usar o id real da receita em edição no candidato — com `id: ""`, a receita nunca se reconheceria na própria árvore
- [x] Passar `recipesById` para `validateRecipe` e `calculateRecipe` no formulário; com `{}` toda sub-receita seria "não encontrada"
- [x] Marcar sub-receita com selo próprio na lista de itens do formulário e na listagem de receitas
- [x] Acrescentar à Ficha técnica a nota de que há componentes vindos de outras receitas
- [x] Liberar o cadastro de receita composta só por sub-receitas
- [x] Reclassificar `sub_recipes` para `available` e confirmar na `MATRIZ_APROVADA`
- [x] Manter Medidas caseiras como planejada
- [x] Preservar fórmulas, pricing engine, `calculateRecipe`, `APP_STATE_STORAGE_KEY` e dados antigos — nenhum arquivo de `modules/`, `services/` ou `types/` alterado
- [x] Validar o cenário do teste manual com o domínio real: **13/13 checagens** (custo da base, custo da final com sub-receita, perda da P0-9A, auto-referência, ciclo indireto, unidade livre)
- [x] Rodar as validações da matriz de recursos: **30/30**
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`
- [ ] **Limitação conhecida:** receita com rendimento em unidade livre ("porções", "fatias") não pode virar componente. Resolver exigiria mexer no domínio — avaliar em fase própria

### Fase P0-9C — Medidas caseiras, rendimento real e unidades seguras ✅
- [x] Trocar o campo livre "Unidade do rendimento" por seletor com g, kg, ml, l e un
- [x] Criar `lib/recipe-units.ts` com normalização de unidades antigas (`gr`, `gramas`, `quilo`, `mls`, `litro`, `unidade`…)
- [x] Normalizar na leitura do store, **sem** tocar em `services/storage-service.ts` nem reescrever o arquivo gravado
- [x] Preservar unidade livre sem equivalência segura ("porções", "fatias") como opção selecionável na edição, com aviso
- [x] Mostrar na tela se a receita pode ou não ser usada como sub-receita, no momento em que a unidade é escolhida
- [x] Criar `lib/household-input.ts` derivando as opções **do ingrediente escolhido**, nunca de lista fixa
- [x] Embalagens: lata de leite condensado (395 g) e caixinha de creme de leite (200 g), presas ao nome do ingrediente
- [x] Medidas caseiras: xícara, meia xícara, colher de sopa e colher de chá, pela tabela da Fase 1B-3
- [x] Recusar medida caseira para ingrediente contado em `un` (o validador do domínio já recusa)
- [x] Mostrar "Ainda não temos uma conversão segura para esse ingrediente. Use g ou ml." quando não houver referência
- [x] Mostrar a prévia da conversão antes de adicionar, incluindo a referência usada
- [x] Criar o assistente de rendimento real: estimado + real → perda calculada, aplicada só se a usuária clicar
- [x] Sugerir o total de entrada só quando todos os itens compartilham a mesma dimensão; explicar quando houver mistura
- [x] Exibir a conversão da medida caseira na Ficha técnica (`1 xícara` → `= 120 g`)
- [x] Marcar medida caseira com selo na lista de itens e na listagem de receitas
- [x] Reclassificar `household_measures` para `available` e confirmar na `MATRIZ_APROVADA`
- [x] Trocar a asserção da matriz que dependia de existir recurso planejado no Essencial
- [x] Preservar fórmulas, pricing engine, `calculateRecipe`, `APP_STATE_STORAGE_KEY` e dados antigos — nenhum arquivo de `modules/`, `services/` ou `types/` alterado
- [x] Verificação isolada contra o domínio real: **46/46**; matriz de recursos: **31/31**; regressão da P0-9B: **13/13**
- [x] Rodar `typecheck`, `lint`, `build` e `git diff --check`
- [ ] **Limitação conhecida:** rendimento em unidade livre continua impedindo o uso como sub-receita — agora com aviso claro e caminho de correção
- [ ] **Fora do escopo, registrado:** upload de receita e tabela nutricional (esta com implicação regulatória RDC/ANVISA)

### Futuro — upload de receita e tabela nutricional (não implementados)
- [ ] **Upload de receita:** importar uma receita pronta de arquivo ou texto. Fora do escopo da P0-9C; exige decidir formato, mapeamento de ingredientes e o que fazer com o que não casar
- [ ] **Tabela nutricional:** ⚠️ tem implicação **regulatória** (rotulagem de alimentos, RDC/ANVISA). Um número errado num rótulo é problema legal da usuária, não só do app. Não sair sem decisão explícita, fonte de dados confiável e ressalva de responsabilidade — candidato natural a P1/Pro, nunca ao Essencial sem essa conversa

### Futuro — orientação contábil contextual
- [ ] Avaliar um recurso “Fale com contador” ou conteúdo contextual, com escopo, responsabilidade e encaminhamento definidos antes de implementar

### P1 recomendado — Orçamentos avançados
- [ ] Evoluir a rota `/orcamentos` sem remover o orçamento simples do Essencial
- [ ] Adicionar cadastro, vínculo e reaproveitamento de clientes
- [ ] Manter histórico dos orçamentos emitidos
- [ ] Acompanhar status de cada orçamento
- [ ] Permitir duplicar um orçamento existente

## Fase 0 — Setup e documentação ✅
- [x] Criar projeto em C:\dev\doce-margem
- [x] Criar README.md
- [x] Criar TASKS.md
- [x] Criar REVIEW.md
- [x] Configurar Next.js, TypeScript e Tailwind
- [x] Criar estrutura base de pastas
- [x] Adicionar script `typecheck`
- [x] Criar `.env.example`
- [x] Ajustar `.gitignore` para versionar `.env.example`

### Fase 0 — Etapa complementar (organização da documentação) ✅
- [x] Criar `DECISIONS.md` (histórico oficial de decisões) com as 6 decisões iniciais
- [x] Atualizar `CLAUDE.md` como memória permanente de execução
- [x] Revisar/criar `AGENTS.md` com os papéis conceituais (preservando regras do Next.js)

## Fase 1 — Núcleo de cálculo (dividida em subfases)

### Fase 1A — Tipos base, unidades e ingredientes ✅
- [x] Criar tipos base (`types/pricing.ts`)
- [x] Criar módulo de unidades + conversões (`modules/pricing/units.ts`)
- [x] Criar módulo de ingredientes (custo por unidade-base) (`modules/pricing/ingredients.ts`)
- [x] Criar validações de domínio (`modules/pricing/validators.ts`)
- [x] Criar dados de exemplo de ingredientes + validação dos cálculos (`modules/pricing/examples.ts`)
- [x] Criar barrel de exportação (`modules/pricing/index.ts`)
- [x] Validar cálculos (custos, conversões, bloqueios e entrada inválida) e rodar `typecheck` + `lint`

### Fase 1B-1 — Receitas simples e rendimento ✅
- [x] Criar tipos de receita (`RecipeItem`, `Recipe`, `CalculatedRecipeItem`, `CalculatedRecipe`)
- [x] Criar módulo de receitas (ficha técnica) (`modules/pricing/recipes.ts`)
- [x] Implementar rendimento, custo total bruto, custo com perda e custo unitário
- [x] Aplicar fator de correção (vindo do ingrediente) nos itens
- [x] Implementar perda de produção simples (0 a <100%)
- [x] Criar validações de receita (`modules/pricing/recipe-validators.ts`)
- [x] Criar exemplo do brigadeiro + validação (`modules/pricing/examples.ts`)
- [x] Rodar `typecheck` + `lint` e validar o exemplo

### Fase 1B-2 — Sub-receitas ✅
- [x] Item de receita como união discriminada (ingrediente × sub-receita)
- [x] Tipos de sub-receita (`SubRecipeItem`, `CalculatedSubRecipeItem`, etc.)
- [x] Cálculo recursivo de sub-receita (custo por unidade de rendimento)
- [x] Uso parcial de sub-receita dentro de outra receita
- [x] Proteção contra referência circular (direta e indireta) — código `CIRCULAR_REFERENCE`
- [x] Validações de sub-receita (inexistente, inválida, unidade, rendimento)
- [x] Exemplo Recheio de brigadeiro + Brownie com recheio + validação
- [x] Rodar `typecheck` + `lint`

### Fase 1B-3 — Medidas caseiras e mais exemplos ✅
- [x] Medidas caseiras (xícara, colher de sopa/chá/café) + densidades
- [x] Dados de exemplo de receitas adicionais (Brownie Ferrero, Cookie Kinder)

### Fase 1C-1 — Canais e taxas ✅
- [x] Tipos de canal e taxas (`SalesChannel`, `ChannelPriceBreakdown`)
- [x] Cálculo de preço necessário por canal (cobre taxas % + taxa fixa)
- [x] Detalhamento das taxas (comissão, pagamento, anúncio, taxa fixa, total, líquido)
- [x] Biblioteca inicial de canais (`defaultSalesChannels`) — Balcão/Pix, Cartão, WhatsApp, iFood Básico/Entrega, 99Food, Rappi, Uber Eats
- [x] Validações de canal (`channel-validators.ts`)
- [x] Exemplos manuais + validação (`runChannelValidations`)
- [x] Rodar `typecheck` + `lint`

### Fase 1C-2 — Custos fixos e rateio ✅
- [x] Tipos de custos fixos (`FixedCost`, `FixedCostCategory`, `FixedCostSummary`, `FixedCostCalculationInput`)
- [x] Total mensal de custos fixos ativos (inativos excluídos)
- [x] Inclusão opcional das mensalidades dos canais (`monthlyFee` da Fase 1C-1)
- [x] Percentual de custo fixo sobre faturamento estimado (`fixedCostRate`)
- [x] Custo fixo médio por unidade quando há volume estimado (`fixedCostPerUnit`)
- [x] Validações (`fixed-cost-validators.ts`)
- [x] Exemplos manuais + validação (`runFixedCostValidations`)
- [x] Rodar `typecheck` + `lint`

### Fase 1C-3 — Pricing engine ✅
- [x] Tipos do pricing engine (`PricingEngineInput`, `PricingEngineResult`, `ChannelSuggestedPriceBreakdown`, `PracticedPriceComparison`, `PriceComparisonStatus`)
- [x] Preço sugerido sem canal (`custo direto / (1 − fixedCostRate − desiredProfitRate)`)
- [x] Custo fixo rateado, custo total unitário e lucro esperado em R$
- [x] Preço sugerido com canal (percentuais do canal no denominador + taxa fixa)
- [x] Detalhamento das taxas do canal (comissão, pagamento, anúncio, taxa fixa, líquido final)
- [x] Margem esperada e markup esperado (+ markup %)
- [x] Comparação preço praticado × sugerido (diferença R$/%, margem/markup reais, status)
- [x] Validações (`pricing-validators.ts`)
- [x] Integração receita + custos fixos + canal validada (brigadeiro + fixedCostRate + iFood)
- [x] Exemplos manuais + validação (`runPricingEngineValidations`)
- [x] Rodar `typecheck` + `lint`

### Engenharia de cardápio (pendente — fase própria)
- [ ] Classificação de itens (estrela, vaca leiteira, quebra-cabeça, abacaxi)
- [ ] Popularidade × margem; recomendações

## Fase 2 — Interface Essencial (dividida em subfases)

### Fase 2-1 — storageService local ✅
- [x] Tipos do estado local (`types/app-state.ts`)
- [x] storageService desacoplado, só client-side (`services/storage-service.ts`)
- [x] Funções salvar/carregar ingredientes, receitas, custos fixos e canais customizados
- [x] Função para limpar dados locais (`clearAppState`)
- [x] Versionamento simples do schema local (`schemaVersion`)
- [x] Validações contra JSON inválido, schema ausente/desconhecido e campos ausentes/corrompidos (fallback seguro, nunca lança)
- [x] Exemplos/validações manuais (`services/storage-examples.ts`)
- [x] Barrel de exportação (`services/index.ts`)
- [x] Rodar `typecheck` + `lint`

### Fase 2-2 — Layout base e dashboard inicial ✅
- [x] Layout base (`app/layout.tsx`) — metadata, `lang="pt-BR"`, cabeçalho fixo
- [x] Navegação principal (`components/layout/Header.tsx`) — marca + seções (Ingredientes/Receitas/Precificação marcadas "em breve", sem linkar rota inexistente)
- [x] Dashboard inicial (`components/dashboard/Dashboard.tsx`) — cards de resumo, próximos passos, estado vazio, aviso de storage local
- [x] Card reutilizável de estatística (`components/dashboard/StatCard.tsx`)
- [x] Leitura do storageService da Fase 2-1 via `useSyncExternalStore` (sem hydration mismatch, sem `useEffect`+`setState`)
- [x] Estado vazio amigável quando não há nenhum dado cadastrado
- [x] Aviso quando `localStorage` está indisponível (`isStorageAvailable`)
- [x] Responsividade básica (grid 1→2→4 colunas)
- [x] Testado com o servidor de dev real (SSR sem erros, conteúdo esperado no HTML)
- [x] Rodar `typecheck` + `lint`

### Fase 2-3 — Tela simples de ingredientes ✅
- [x] Rota `/ingredientes` (`app/ingredientes/page.tsx`)
- [x] Link real para Ingredientes no Header (`components/layout/Header.tsx`) — e correção do estado ativo (`usePathname`, antes fixo em "Painel")
- [x] Formulário de cadastro (`components/ingredients/IngredientForm.tsx`) — nome, quantidade comprada, unidade de compra, preço pago, unidade-base, fator de correção (padrão 1)
- [x] Listagem dos ingredientes cadastrados (`components/ingredients/IngredientList.tsx`) — mostra custo por unidade-base
- [x] Botão para excluir ingrediente
- [x] Estado vazio amigável
- [x] Persistência via `storageService` (`saveIngredients`/`loadIngredients`, através de `@/services`)
- [x] Store reativo (`components/ingredients/ingredients-store.ts`) — resolve a pendência registrada em `DECISIONS.md` sobre invalidar o cache do `useSyncExternalStore` ao escrever
- [x] Validação com `validateIngredient` (Fase 1A) — nenhuma regra de validação reimplementada na UI
- [x] Custo calculado com `calculateIngredient` (Fase 1A) — prévia no formulário e valor na listagem
- [x] Testado com o servidor de dev real + validação isolada do store (16 checagens)
- [x] Rodar `typecheck` + `lint`

### Fase 2-4 — Tela simples de receitas ✅
- [x] Rota `/receitas` (`app/receitas/page.tsx`)
- [x] Link real para Receitas no Header (`components/layout/Header.tsx`)
- [x] Formulário de cadastro (`components/recipes/RecipeForm.tsx`) — nome, seleção de ingredientes já cadastrados, quantidade usada, unidade, rendimento, unidade do rendimento, perda de produção (padrão 0)
- [x] Seleção de ingrediente lê o mesmo store da Fase 2-3 (`components/ingredients/ingredients-store.ts`) — reativo, sem duplicar leitura de storage
- [x] Listagem das receitas cadastradas (`components/recipes/RecipeList.tsx`) — mostra custo total e custo unitário
- [x] Botão para excluir receita
- [x] Estado vazio amigável (+ aviso quando não há nenhum ingrediente cadastrado ainda)
- [x] Persistência via `storageService` (`saveRecipes`/`loadRecipes`, através de `@/services`)
- [x] Store reativo (`components/recipes/recipes-store.ts`) — mesmo padrão do store de ingredientes (`DECISIONS.md`)
- [x] Validação com `validateRecipe` e cálculo com `calculateRecipe` (Fase 1B) — nenhuma regra reimplementada na UI
- [x] Não criou sub-receitas nem medidas caseiras na interface (só itens de ingrediente)
- [x] Testado com o servidor de dev real + validação isolada do store (18 checagens, incluindo o exemplo exato da tarefa: Brownie simples → custo total R$ 3,80, custo unitário R$ 0,38/un)
- [x] Rodar `typecheck` + `lint`

### Fase 2-5 — Tela simples de precificação ✅
- [x] Rota `/precificacao` (`app/precificacao/page.tsx`)
- [x] Link real para Precificação no Header (`components/layout/Header.tsx`) — todas as 4 seções principais agora têm tela própria; removido o bloco de rótulos "em breve" (ficaria sempre vazio)
- [x] Seleção de receita cadastrada + custo calculado com `calculateRecipe` (custo total, rendimento, custo unitário)
- [x] Campo de custo fixo sobre faturamento (%) — convertido para decimal antes de ir ao pricing engine, não persistido
- [x] Campo de lucro desejado (%) — convertido para decimal
- [x] Seleção de canal (biblioteca padrão da Fase 1C-1 + canais customizados do storage, sem CRUD de canais)
- [x] Campo opcional de preço praticado + comparação com o sugerido (status abaixo/no ideal/acima)
- [x] Resultado completo com `calculatePricing` — custo direto, custo fixo, lucro esperado, preço sem canal, preço com canal, taxas do canal, margem, markup, praticado, diferença, status
- [x] Store de leitura para canais customizados (`components/channels/channels-store.ts`) — só leitura, sem CRUD ainda
- [x] Reaproveita os stores de ingredientes (Fase 2-3) e receitas (Fase 2-4) já existentes, sem duplicar leitura de storage
- [x] Calculadora ao vivo (sem botão "calcular"): resultado aparece assim que os campos fazem sentido
- [x] Validado com o cenário exato da tarefa (Brownie simples, custo fixo 23,1%, lucro 20%): preço sugerido sem canal ≈ R$ 0,6678; com iFood Básico, preço maior
- [x] Testado com o servidor de dev real + validação isolada do cálculo (11 checagens)
- [x] Rodar `typecheck` + `lint`

### Fase 2-6 — Configurações financeiras básicas ✅
- [x] Rota `/configuracoes` (`app/configuracoes/page.tsx`)
- [x] Link real para Configurações no Header (`components/layout/Header.tsx`)
- [x] `BusinessSettings` novo em `types/app-state.ts` (`estimatedMonthlyRevenue`, `estimatedMonthlyUnits`, `updatedAt`) — guarda só insumos, nunca o percentual calculado
- [x] `storageService` (`services/storage-service.ts`): `createEmptyBusinessSettings`, `normalizeBusinessSettings`, `saveBusinessSettings`/`loadBusinessSettings` — `APP_STATE_SCHEMA_VERSION` **não** foi incrementada (compatibilidade via reconstrução campo a campo, já estabelecida na Fase 2-1)
- [x] `services/storage-examples.ts` ampliado: 16 checagens agora (era 13), incluindo o teste explícito de dado antigo pré-Fase 2-6 sem `businessSettings`
- [x] **Parte 1 — Custos fixos:** `components/fixed-costs/fixed-costs-store.ts` (novo store reativo), `FixedCostForm.tsx` (nome, categoria, valor mensal, ativo/inativo, observação), `FixedCostList.tsx` (lista + excluir) — usa `validateFixedCost` (Fase 1C-2), nenhuma regra reimplementada
- [x] **Parte 2 — Configurações:** `components/settings/business-settings-store.ts` (novo, objeto único — `updateBusinessSettings`, não uma lista), `BusinessSettingsForm.tsx` (faturamento + volume estimado, resumo ao vivo com `calculateFixedCostSummary`)
- [x] **Parte 3 — Canais customizados:** `components/channels/channels-store.ts` **estendido** (ganhou `addCustomChannel`/`removeCustomChannel`, exatamente como o `DECISIONS.md` da Fase 2-5 já previa), `CustomChannelForm.tsx`, `CustomChannelList.tsx` — usa `validateChannel` (Fase 1C-1), sem edição (só criar/listar/excluir)
- [x] **Parte 4 — Integração com precificação:** `PricingForm.tsx` calcula o percentual via `calculateFixedCostSummary` (custos fixos + faturamento salvos) e pré-preenche o campo "Custo fixo sobre faturamento (%)" — edição manual continua livre; sem configuração salva, comportamento idêntico ao da Fase 2-5
- [x] Validado com o cenário clássico (custos fixos R$ 2.310, faturamento R$ 10.000) → 23,1%, batendo com o texto exato que o campo de precificação recebe ("23,1")
- [x] Testado com o servidor de dev real (5 rotas) + validação isolada (12 checagens de integração + 16 do storageService, incluindo compatibilidade retroativa)
- [x] Rodar `typecheck` + `lint`

### Revisão da Fase 2 — fluxo completo ✅
- [x] Revisar navegação principal, 5 rotas, 5 stores, storage-service, app-state e documentação
- [x] **Bug real corrigido:** Painel mostrava contagens desatualizadas após cadastro em outra tela (`Dashboard.tsx` tinha cache próprio com `subscribe` no-op) — agora lê os stores reativos das telas de CRUD
- [x] Validar app com localStorage vazio, com dados antigos sem `businessSettings`, e com ingrediente excluído em uso por receita
- [x] Confirmar ausência de hydration bug (todas as rotas estáticas + `useSyncExternalStore` com snapshots estáveis)
- [x] Corrigir documentação desatualizada em `PricingForm.tsx` e `ingredients-store.ts`
- [x] Rodar `typecheck` + `lint` + `build`
- [x] Registrar 8 pendências de UX/futuro no `REVIEW.md` (não implementadas)

### Fase 2-7 — Ajustes finais de UX da Interface Essencial ✅
- [x] Confirmação (`window.confirm`) antes de excluir ingrediente, receita, custo fixo e canal customizado
- [x] Edição básica de ingredientes, receitas, custos fixos e canais — reaproveita o próprio formulário (botão "Editar" na lista → formulário pré-preenchido → "Salvar alterações"/"Cancelar edição") — sem duplicar o item editado
- [x] 4 novos componentes `*Screen.tsx` (`IngredientsScreen`, `RecipesScreen`, `FixedCostsScreen`, `CustomChannelsScreen`) — donos do estado "qual item está em edição agora"
- [x] 4 stores ganharam `updateX(id, dado)` — preserva o id original, não duplica, persiste e notifica (mesmo padrão de `addX`/`removeX`)
- [x] Precificação: mensagens de erro específicas quando custo fixo, lucro ou preço praticado têm texto inválido (não vazio) — campo vazio continua calculando normalmente quando aplicável (preço praticado)
- [x] Nenhuma alteração em `modules/pricing/` — só consumo das funções já existentes
- [x] Validado com 17 checagens isoladas das 4 funções `updateX` (não duplica, preserva id, persiste, notifica, não afeta outros itens da lista)
- [x] Rodar `typecheck` + `lint` + `build`
- [x] Testado com o servidor de dev real (5 rotas, sem erro)
- [x] `REVIEW.md` atualizado — pendências 1/2/3 da revisão anterior resolvidas; pendências 4-8 mantidas para fases futuras

### Fase 2-8 — Backup + polimento (em andamento)
- [x] Criar backup export/import (usando o storageService da Fase 2-1) — **pré-requisito da Fase 4** (rede de segurança dos dados locais antes de mexer em acesso)
  - [x] Criar `services/backup-service.ts` com exportação, parse/validação e importação segura
  - [x] Criar seção "Backup dos dados" em `/configuracoes`
  - [x] Exportar JSON com `appName`, `backupVersion`, `schemaVersion`, `updatedAt`, `exportedAt` e `data`
  - [x] Validar JSON inválido, app incorreto, data de exportação, formato e `schemaVersion`
  - [x] Normalizar dados antigos/parciais com `normalizeAppState`
  - [x] Pedir confirmação antes de sobrescrever os dados locais
  - [x] Recarregar stores reativos após importação
  - [x] Rodar `typecheck`, `lint` e `build`
- [ ] Padronizar entrada decimal entre todos os formulários (vírgula vs. ponto)
- [ ] Aviso de itens em uso antes de excluir (ex.: "este ingrediente é usado por 2 receitas")
- [ ] Teste manual em navegador real antes de seguir para Supabase/Auth — pendente no ambiente atual

## Fase 3 — Modo avançado
> Fica **depois** da Fase 4 na ordem de execução (decisão de 2026-08-05). O número
> foi mantido para preservar a rastreabilidade das referências já registradas.
> **Entregue por partes:** fator de correção e perda de produção saíram na P0-9A;
> multicanal e custos fixos já existiam desde as Fases 2-5 e 2-6.
- [x] Criar fator de correção — interface entregue na P0-9A
- [x] Criar perda de produção — interface entregue na P0-9A
- [x] Criar medidas caseiras — interface entregue na P0-9C
- [x] Criar sub-receitas — interface entregue na P0-9B
- [x] Criar multicanal — canais padrão e customizados (Fases 2-5 e 2-6)
- [x] Criar custos fixos — cadastro e rateio (Fase 2-6)
- [ ] Criar engenharia de cardápio — Pro Anual futuro

## Fase 4 — Acesso e licenças
> 📋 **Planejada em `PLAN-FASE-4.md`** (2026-08-05) — arquitetura, tabelas, RLS,
> DAL, feature flags, riscos e as 6 subfases abaixo. Nenhum código escrito ainda.
> Pré-requisito: Fase 2-8 (backup export/import).

### Fase 4-1A — Base SQL de profiles ✅
- [x] Migration `supabase/migrations/0001_profiles.sql`
- [x] Tabela `public.profiles` (id, email, full_name, created_at, updated_at)
- [x] Tabela `public.user_access_flags` (user_id, is_blocked, created_at, updated_at) — flags sensíveis isoladas
- [x] Trigger `on_auth_user_created` → cria perfil **e** flags no signup (`security definer`, `search_path` fixado, `on conflict do nothing`)
- [x] Trigger `set_updated_at` nas duas tabelas
- [x] Trigger `profiles_guard_immutable` — rejeita alteração de `id`/`email` por quem não é `service_role`
- [x] RLS habilitado nas duas tabelas
- [x] Policies: `profiles` select/update do próprio; `user_access_flags` **só select** do próprio
- [x] **Zero** policy de escrita em `user_access_flags` (a ausência É a proteção)
- [x] `grant update (full_name)` — única coluna de `profiles` que o cliente escreve
- [x] Índice `profiles_email_idx` para a busca do admin (Fase 7)
- [x] Rodar `typecheck` + `lint` (sem impacto — nenhum TS alterado)
- [ ] **Pendente de ambiente:** aplicar a migration num projeto Supabase real e verificar as invariantes (ver `REVIEW.md`)

### Fase 4-1B — Supabase client + Auth básico ✅
- [x] `@supabase/supabase-js` + `@supabase/ssr` instalados (únicas dependências novas)
- [x] `services/supabase/server.ts` — client de servidor (chave anônima + cookies), `getAuthUser()` com `getUser()`, `isSupabaseConfigured()`; `import "server-only"`
- [x] `app/auth/actions.ts` — Server Actions `signUpAction` / `signInAction` / `signOutAction`
- [x] `components/auth/form-state.ts` — tipo + estado inicial do formulário (fora do `"use server"`)
- [x] `components/auth/{AuthFormShell,LoginForm,SignupForm}.tsx`
- [x] `app/login/page.tsx`, `app/cadastro/page.tsx`, `app/conta/page.tsx`
- [x] `app/auth/callback/route.ts` — troca o `code` de confirmação por sessão; protegido contra open redirect
- [x] Header com área de conta (Entrar/Criar conta × Conta), estado vindo do layout server-side
- [x] `/conta` lê `profiles` e `user_access_flags` pela RLS da sessão; mostra e-mail, nome, status e aviso de que licença ainda não existe
- [x] `/conta` redireciona para `/login` sem sessão (verificado: 307)
- [x] App local continua funcionando sem Supabase configurado (`authEnabled = false` esconde a área de conta)
- [x] **Nenhum uso de `SUPABASE_SERVICE_ROLE_KEY`** (auditado: 0 leituras)
- [x] **Nenhum `getSession()`** — só `getUser()` (auditado: 0 usos)
- [x] Rodar `typecheck` + `lint` + `build`
- [x] Cadastro real testado contra o Supabase do projeto (usuária criada)
- [ ] **Pendente de ambiente:** confirmar o e-mail de uma conta de teste e percorrer login → `/conta` no navegador (ver `REVIEW.md`)
- [ ] **Pendente (Fase 4-5):** `proxy.ts` para renovar o token de sessão expirado

### Fase 4-1C — Limpeza pós-Auth (pendente)
- [ ] Remover a conta de teste criada durante a validação da 4-1B
- [ ] Decidir se a confirmação de e-mail fica ligada (hoje está) e ajustar a copy do cadastro
- [ ] Trigger de `update` em `auth.users` para espelhar troca de e-mail em `profiles.email`, se a UI oferecer isso

### Fase 4-2A — Base SQL de licenças ✅
- [x] Migration `supabase/migrations/0002_licenses.sql`
- [x] Tabela `public.licenses` (id, user_id, product_type, status, expires_at, provider, provider_order_id, timestamps)
- [x] `CHECK` em `product_type` (`one_time` | `annual_pro`) — **sem plano mensal**
- [x] `CHECK` em `status` (`active` | `refunded` | `chargeback` | `cancelled` | `expired`)
- [x] `CHECK` de coerência: `annual_pro` exige `expires_at`; `one_time` exige `expires_at` nulo
- [x] `UNIQUE (provider, provider_order_id)` — idempotência de webhook
- [x] Tabela `public.license_events` com `CHECK` fechado em `event_type` (8 valores)
- [x] FKs de `license_events` com `ON DELETE SET NULL` — evidência sobrevive à exclusão de conta/licença
- [x] Trigger `license_events_immutable` — bloqueia `UPDATE` para **todos**, inclusive service_role
- [x] Trigger `licenses_set_updated_at` (reusa `set_updated_at` de 0001)
- [x] Funções **internas** `is_user_blocked(uid)`, `has_pro_access(uid)`, `has_essential_access(uid)` — `SECURITY DEFINER`, `STABLE`, `search_path` fixado; `EXECUTE` revogado de `public`/`anon`/`authenticated`
- [x] Funções **expostas** `current_user_has_pro_access()`, `current_user_has_essential_access()` — sem parâmetro, resolvem `auth.uid()` por dentro, `false` em sessão anônima; `EXECUTE` só para `authenticated`
- [x] Vazamento lateral fechado: não há como consultar acesso de terceiros pelo cliente
- [x] Corrigido em relação ao plano: `is_blocked` vem de `user_access_flags`, não de `profiles`
- [x] RLS habilitado nas duas tabelas; **só** policies de `SELECT` do próprio registro
- [x] **Zero** policy de escrita e **zero** grant de escrita — dupla barreira
- [x] 4 índices (caminho quente de acesso, vencimento, histórico por usuária, histórico por licença)
- [x] Rodar `typecheck` + `lint` (sem impacto — nenhum TS alterado)
- [x] Aplicar `0002_licenses.sql` com sucesso no Supabase real
- [x] Confirmar `licenses` e `license_events` com RLS ativo e somente policies próprias de `SELECT`
- [x] Confirmar grants de cliente: `authenticated` somente com `SELECT`; sem `INSERT`/`UPDATE`/`DELETE`
- [x] Confirmar privilégios das funções: `anon` sem `EXECUTE`; `authenticated` somente nas duas funções `current_user_*`
- [x] Validar no banco a matriz de acesso registrada em `REVIEW.md`

### Fase 4-2B — Validação das licenças no banco (pendente)
- [x] Aplicar `0002_licenses.sql` no Supabase
- [ ] Provar que sessão `authenticated` **falha** ao tentar `insert`/`update`/`delete` em `licenses`
- [ ] Provar que `update` em `license_events` falha até com service_role
- [x] Rodar a matriz informada das funções de acesso contra o banco (ver `REVIEW.md`)
- [ ] Confirmar que `UNIQUE (provider, provider_order_id)` bloqueia pedido duplicado e permite múltiplos manuais (NULL)
- [x] Provar que `authenticated` **não** executa funções parametrizadas com `uid` e **executa** somente `current_user_has_essential_access()` / `current_user_has_pro_access()`

### Fase 4-3A — types/access.ts + DAL de acesso ✅
- [x] `types/access.ts` — `ProductType`, `LicenseStatus`, `ActivePlan`, `UserAccess`, `ANONYMOUS_ACCESS` (congelado), `resolveActivePlan()` (pura, testável)
- [x] `lib/auth/dal.ts` com `import "server-only"` — `getCurrentUserAccess()` (memoizado com `cache()` do React), `hasEssentialAccess()`, `hasProAccess()`
- [x] Usa `getUser()` (nunca `getSession()`); nenhuma função recebe `userId`
- [x] Chama **só** as RPCs sem parâmetro (`current_user_has_essential_access`, `current_user_has_pro_access`)
- [x] Consultas a tabela sem filtro de `user_id` — quem restringe é a RLS
- [x] Bloqueio reaplicado em TypeScript (redundante com o SQL, de propósito — as duas camadas erram para o mesmo lado)
- [x] Falha fechada: `data === true` (não truthiness); sem sessão/Supabase/migration → `ANONYMOUS_ACCESS`
- [x] `/conta` refatorada para uma única chamada ao DAL; mostra plano, descrição e vencimento do Pro
- [x] 27 checagens isoladas: 8 combinações de `resolveActivePlan`, regra de bloqueio, falha fechada da RPC, `ANONYMOUS_ACCESS`, e os 9 cenários da matriz da 4-2A
- [x] Verificado contra o Supabase real: `anon` recebe `permission denied` nas RPCs exposta **e** parametrizada
- [x] Rodar `typecheck` + `lint` + `build`
- [ ] **Pendente de ambiente:** exercitar o caminho autenticado (`/conta` logada com licença manual) — bloqueado pela confirmação de e-mail

### Fase 4-3B — Validação autenticada do DAL (pendente)
- [ ] Confirmar e-mail de uma conta de teste e abrir `/conta` logada
- [ ] Conceder licença `one_time` manual → `/conta` deve mostrar "Minha Fatia Essencial"
- [ ] Trocar para `annual_pro` vigente → deve mostrar "Minha Fatia Pro Anual" + vencimento
- [ ] Marcar `status = 'refunded'` → deve voltar a "Sem licença ativa"
- [ ] Marcar `is_blocked = true` → deve mostrar "Bloqueada" e "Sem licença ativa"
- [ ] Provar que `authenticated` **consegue** chamar `current_user_has_pro_access()` e **falha** em `has_pro_access(uid)`

### Fase 4-4A — Feature flags em código ✅
- [x] `lib/features.ts` — módulo puro, sem Supabase, sem tabela no banco
- [x] `FeatureKey` (15 recursos), `FeatureMinimumPlan`, `FeatureStatus`, `FeatureDefinition`
- [x] Matriz como `Record<FeatureKey, FeatureDefinition>` — TypeScript exige exaustividade, então recurso novo sem classificação **não compila**
- [x] `getFeatureDefinition()`, `canAccessFeature()`, `getAccessibleFeatures()`, `getLockedFeatures()`
- [x] `minimumPlan: "authenticated"` acrescentado para `account` — evita trancar a tela de conta para quem ainda não comprou
- [x] `status` (available/planned) separado de `minimumPlan` — não participa do gating
- [x] Falha fechada: bloqueio, plano insuficiente e chave desconhecida devolvem `false`
- [x] `lib/features-examples.ts` — 30 checagens sem framework (padrão das fases anteriores)
- [x] **Decisão comercial de 2026-08-06:** `advanced_mode` / `sub_recipes` / `household_measures` confirmados como **Essencial / planned** (fazem parte do "avançado básico"); Pro Anual reservado a recorrência, nuvem, automação, IA e relatórios — `DECISIONS.md`
- [x] `MATRIZ_APROVADA` congelada em `lib/features-examples.ts` — reclassificar um recurso quebra a validação em vez de passar batido
- [x] Rodar `typecheck` + `lint` + `build` (rotas inalteradas)

### Fase 4-5A — Página de bloqueio + helpers de acesso ✅
- [x] `app/acesso-bloqueado/page.tsx` — não redireciona ninguém (página que explica bloqueio não pode bloquear) e cobre os 5 estados possíveis
- [x] Motivo do bloqueio **recalculado** pelo DAL, nunca lido de query string (parâmetro na URL é forjável e mostraria diagnóstico falso)
- [x] Listas de plano geradas a partir de `ALL_FEATURES` (Fase 4-4A) — a tela não pode divergir da matriz que o gating aplica
- [x] Sem valores e sem botão de compra — a página de preços é a Fase 4-6
- [x] `lib/auth/require-access.ts` — `requireAuthenticatedAccess()`, `requireEssentialAccess()`, `requireProAccess()`
- [x] `import "server-only"`, nenhuma função recebe `userId`, nenhum acesso direto ao Supabase (só consome o DAL)
- [x] `requireAuthenticatedAccess()` **não** barra conta bloqueada — senão `/conta` viraria beco sem saída para quem mais precisa dela
- [x] `/conta` migrada do `redirect()` manual para `requireAuthenticatedAccess()`
- [x] `typecheck` + `lint` + `build` — 11 rotas, `/acesso-bloqueado` dinâmica (`ƒ`)
- [x] Teste manual: `/conta` sem sessão → 307 para `/login`; `/acesso-bloqueado` → 200 com o estado de visitante correto
- [ ] **Pendente de ambiente:** `/conta` logada — bloqueado pela confirmação de e-mail (mesma pendência das Fases 4-1C / 4-3B)

### Fase 4-5B — Gating Essencial nas telas locais ✅
- [x] **Decisão de 2026-08-06: sem bypass por ausência de Supabase.** Env faltando na Vercel não pode liberar o app de graça — falha fechada (`DECISIONS.md`)
- [x] `await requireEssentialAccess()` em `/`, `/ingredientes`, `/receitas`, `/configuracoes`, `/precificacao`
- [x] Públicas mantidas: `/login`, `/cadastro`, `/conta`, `/acesso-bloqueado`, `/auth/callback`
- [x] Gating por `requireEssentialAccess()`, **não** por `canAccessFeature` — grep confirma zero uso da matriz em código de rota
- [x] Sem route groups, sem refatoração de layout, sem mudança de UX além do guarda
- [x] `typecheck` + `lint` + `build` — 11 rotas, todas dinâmicas (`ƒ`); nenhuma rota protegida é estática
- [x] Teste manual sem sessão: as 5 protegidas → 307 para `/login`; públicas → 200; `/acesso-bloqueado` → 200 com **0 redirects**
- [x] Toda cadeia de redirecionamento termina em ≤ 1 salto — provado com `curl -L --max-redirs 10`
- [x] **Cookie de sessão forjado é rejeitado** (307 para `/login`) — prova que `getUser()` revalida em vez de confiar no cookie (risco #1 do `PLAN-FASE-4.md`)
- [ ] **Pendente de ambiente:** abrir as 5 telas logada com licença Essencial — bloqueado pela confirmação de e-mail (mesma pendência das Fases 4-1C / 4-3B)
- [x] `Header` de visitante mostra somente `Preços`, `Entrar` e `Criar conta`; links protegidos ficam ocultos
- [x] `/` permanece protegida; `/precos` assume o papel de vitrine pública nesta etapa

### Fase 4-5C — Camada otimista e organização (pendente)
- [ ] `proxy.ts` na raiz (**não** `middleware.ts` — renomeado no Next 16), só checagem otimista + renovação de token
- [ ] Route Groups `(app)` / `(pro)` — hoje o guarda está repetido em 5 páginas
- [ ] Reavaliar o CTA "Voltar ao painel" da `/acesso-bloqueado` (hoje condicionado a `hasEssential`)
- [ ] Considerar `requireFeatureAccess(feature)` ligando os guardas a `canAccessFeature`
- [ ] Considerar `?next=` no redirecionamento para `/login` (validando caminho interno, senão vira open redirect)

### Fase 4-6A — Página pública de preços ✅
- [x] Criar `/precos` pública, sem guarda de acesso e sem redirect para login
- [x] Separar Minha Fatia Essencial (compra única) e Minha Fatia Pro Anual
- [x] Gerar listas de recursos a partir de `ALL_FEATURES`, incluindo status planejado
- [x] Usar `NEXT_PUBLIC_BUY_ESSENTIAL_URL` e `NEXT_PUBLIC_BUY_PRO_ANNUAL_URL`; o fallback genérico `Em breve` desta fase foi substituído por mensagens específicas na P0-7
- [x] Não inventar preço enquanto ele não estava definido; a P0-7 preserva o valor comercial posteriormente aprovado
- [x] Confirmar zero oferta mensal
- [x] Adicionar `Preços` ao Header somente para visitante
- [x] Rodar `typecheck` + `lint` + `build` — 12 rotas, `/precos` incluída

### Fase 4-6B — Gating do Pro (pendente)
- [ ] Recursos Pro bloqueados por `canAccessFeature`

## Fase 5 — Produto final + Pro Anual
- [x] Criar página de preços (`/precos`)
- [x] Separar Essencial e Pro Anual
- [x] Garantir que não há nenhuma oferta de plano mensal
- [ ] Preparar recursos Pro bloqueados (rotas Pro)

## Fase 6 — Webhooks
> Renumerada como **Fase 4-7** no plano (`PLAN-FASE-4.md`, capítulo 13). Itens abaixo mantidos como escopo original.
- [ ] Criar webhook Kiwify (POST /api/webhooks/kiwify)
- [ ] Criar webhook Hotmart (POST /api/webhooks/hotmart)
- [ ] Criar tabela webhook_events — **rever:** a 0002 já resolveu idempotência de concessão pela UNIQUE `(provider, provider_order_id)`; a tabela cobriria replay de revogação e falha no meio do processamento (`PLAN-FASE-4.md` 13.9)
- [ ] Criar idempotência
- [ ] Criar lógica de venda aprovada, reembolso, chargeback, cancelamento e expiração

### Fase 4-7A — Planejamento do webhook Kiwify ✅
- [x] Plano técnico completo em `PLAN-FASE-4.md`, capítulo 13 — rota, envs, eventos, identificação, idempotência, auditoria, segurança, códigos de resposta e ordem de execução
- [x] Rota definida: `POST /api/webhooks/kiwify`, Route Handler, `runtime = "nodejs"`, corpo lido como texto cru **antes** do parse
- [x] Envs: manter `KIWIFY_WEBHOOK_SECRET` (já no `.env.example`, simétrico com Hotmart) + `SUPABASE_SERVICE_ROLE_KEY` só nesta rota, via `services/supabase/admin.ts` isolado
- [x] Eventos mapeados: `compra_aprovada` → `granted`; `compra_reembolsada` → `refunded`; `chargeback` → `chargeback`; demais → 200 sem ação
- [x] **Achado (A):** `licenses.user_id → profiles.id → auth.users.id` — licença para e-mail sem conta é impossível por FK, não por regra
- [x] **Achado (B):** `license_events` não serve de fila (vocabulário fechado por CHECK + append-only por trigger) → pendência exige migration
- [x] **Achado (C):** `provider_order_id` nullable + NULLs não conflitam em UNIQUE → payload sem order id precisa ser **rejeitado**, nunca gravado com NULL
- [x] Códigos de resposta definidos (replay e evento não tratado = 200, senão a Kiwify reenvia para sempre)
- [x] Rodar `typecheck` + `lint`
- [ ] **Decidir antes da 4-7B:** compra antes do cadastro — convidar via Admin API (recomendado) × fila `pending_purchases` × concessão manual
- [ ] **Decidir antes da 4-7B:** criar `webhook_events` junto de `pending_purchases` ou não criar nenhuma das duas
- [ ] Corrigir divergência: `README.md` linha 87 e a Fase 6 acima citam `webhook_events`, que não existe

### Fase 4-7B — Migration de suporte ao webhook ✅
- [x] `supabase/migrations/0003_webhook_support.sql` — **não edita 0001 nem 0002**
- [x] Tabela `public.webhook_events` (13 colunas) com FKs `on delete set null` para `profiles` e `licenses`
- [x] 5 CHECKs: `provider`, `event_type`, `status`, coerência `status ↔ processed_at`, `error_message` só em `failed`
- [x] Índice **único parcial** `(provider, provider_event_id) where provider_event_id is not null` — idempotência
- [x] Índice de busca `(provider, provider_order_id)` **não único** — o mesmo pedido gera aprovada e depois reembolso
- [x] 3 índices operacionais: fila de retrabalho (`status in ('received','failed')`), listagem do admin, histórico por usuária
- [x] `profiles_email_lower_unique` **parcial** (`where email <> ''`) — `handle_new_user` grava `''` para cadastro sem e-mail, e duas linhas assim quebrariam um índice único total
- [x] RLS habilitada, **zero policies** (nem de leitura) + `revoke all` e **zero grants** — duas barreiras independentes
- [x] **Sem trigger de imutabilidade**, ao contrário de `license_events`: esta tabela precisa de UPDATE (`received → processed`)
- [x] Rodar `typecheck` + `lint`
- [x] Aplicar `0003_webhook_support.sql` manualmente no Supabase real
- [x] Validar tabela, RLS, ausência de policies/privilégios e os índices de idempotência/e-mail no banco real
- [x] **Decisão registrada, custo conhecido:** `provider` aceita só `'kiwify'`; Hotmart exigirá migration (junto com o `event_type`, que usa vocabulário português da Kiwify)

### Fase 4-7C — Route Handler em modo captura ✅ (com bloqueio de banco)
- [x] `app/api/webhooks/kiwify/route.ts` — só `POST` exportado (Next devolve **405** sozinho nos outros métodos), `runtime = "nodejs"`
- [x] `services/supabase/admin.ts` — service role isolada, `server-only`, chave nunca exportada, falha fechada
- [x] `lib/webhooks/kiwify-payload.ts` — extractores **puros**, sem I/O, testáveis isolados
- [x] `lib/webhooks/kiwify-payload-examples.ts` — **28 checagens**, incluindo 11 entradas hostis que não podem lançar
- [x] Token aceito em `x-kiwify-token`, `Authorization: Bearer` e `?token=`, comparado por **hash SHA-256 + `timingSafeEqual`** (nem o comprimento do segredo vaza)
- [x] Autenticação **antes** de ler o corpo — payload não autenticado nunca chega ao banco
- [x] Corpo lido como texto cru antes do `JSON.parse` (pré-requisito para HMAC na 4-7D)
- [x] `.env.example` documenta que o "token" do painel da Kiwify vai em `KIWIFY_WEBHOOK_SECRET`
- [x] `typecheck` + `lint` + `build` — 13 rotas, `/api/webhooks/kiwify` dinâmica
- [x] Testes locais 1–7: GET → 405; sem token → 401; token errado nos 3 portadores → 401; JSON inválido → 400; corpo vazio → 400; **sem segredo configurado → 500 sem gravar nada**
- [x] ~~BLOQUEADO por `42501`~~ — resolvido pela Fase 4-7C-fix (`0004_service_role_grants.sql`, aplicada)
- [x] **Testes 8–13 reexecutados após o grant: 13/13 PASS**
- [x] Gravação em `webhook_events` funciona — 5 linhas, todas com `provider = 'kiwify'`
- [x] **Replay do mesmo `provider_event_id` → 200 com `duplicate: true`, sem sexta linha** (índice único parcial da 0003 funcionando)
- [x] **Token inválido não gera linha:** 13 requisições, só 5 linhas na tabela inteira, todas com marcador da rodada — zero das tentativas 2–5
- [x] `event_type` distingue corretamente `ignored` (nome lido, fora do escopo) de `unknown` (nenhum nome encontrado)
- [x] CHECK `status ↔ processed_at` respeitado nas 5 linhas; `user_id`/`license_id` nulos como previsto
- [x] `licenses` e `license_events` intocadas — as 2 linhas de cada são `provider=manual` / `source=manual:test`, do teste manual anterior
- [ ] **Limpar quando quiser:** as 5 linhas de teste têm `payload->>'_teste_claude_4_7c'` preenchido (ver `REVIEW.md` para o `DELETE`)

### Fase 4-7C-fix — Grants para service_role ✅
- [x] `supabase/migrations/0004_service_role_grants.sql` — **não altera 0001, 0002 nem 0003** (`git diff` vazio nas três)
- [x] `grant usage on schema public` — pré-requisito; sem ele todo privilégio de tabela falha com o mesmo 42501, confundindo o diagnóstico
- [x] `profiles` → `select` apenas
- [x] `webhook_events` → `select, insert, update` (a linha muda de `received` para `processed`/`ignored`/`failed`)
- [x] `licenses` → `select, insert, update` (compra, reembolso, chargeback, renovação)
- [x] `license_events` → `select, insert` — **sem `update`**, coerente com o trigger de imutabilidade da 0002
- [x] `user_access_flags` → `select, update` (bloqueio administrativo); sem `insert`, a linha nasce pelo trigger
- [x] **`grant execute` nas 3 funções internas** (`is_user_blocked`, `has_pro_access`, `has_essential_access`) — mesma falha da 0002 aplicada a funções, e o admin da Fase 7 depende delas
- [x] **Nenhum `delete` concedido** em nenhuma tabela — revogar é `status`, não apagar
- [x] Zero grants a `anon`/`authenticated`, zero `grant all`, zero policy, zero `alter table`, zero `revoke`
- [x] **Sem `alter default privileges`** — descartado por ser exatamente o "privilégio amplo demais" que o projeto recusa
- [x] 4 consultas de conferência pós-aplicação escritas na seção 5 da migration
- [x] Rodar `typecheck` + `lint`
- [ ] **Pendente de ambiente:** aplicar no Supabase real e rodar as 4 conferências da seção 5
- [ ] **Depois de aplicar:** reexecutar os testes 8–13 da Fase 4-7C (gravação e replay do webhook)
- [ ] **Conferir:** a consulta 5.4 procura perfis sem linha em `user_access_flags` — se houver, o bloqueio administrativo dessas contas falharia em silêncio
- [ ] Corrigir os comentários falsos sobre `service_role` em `0002` (linha 366) e `0003` (linha 342) — exige alterar migrations antigas, decisão em aberto

### Fase 4-7D — Validação real do webhook em produção ✅
- [x] **Causa do 401 identificada em produção:** a Kiwify manda o segredo em `?signature=`, e o handler só olhava `x-kiwify-token`, `Authorization: Bearer` e `?token=`
- [x] `?signature=` acrescentado aos portadores aceitos — tratado como **token simples**, aceito só se for exatamente igual a `KIWIFY_WEBHOOK_SECRET`
- [x] **HMAC não implementado**, de propósito: exigiria conhecer algoritmo e formato de digest da Kiwify, e nenhum payload real documenta isso. O nome do parâmetro não decide nada; a comparação com o segredo decide
- [x] Log de 401 convertido para **booleanos puros** — `hasHeaderToken`, `hasBearer`, `hasQueryToken`, `hasQuerySignature`, `signatureLooksLikeHex`
- [x] `signatureLooksLikeHex` distingue token simples de digest sem vazar nada — só aparece no 401, quando o valor inspecionado comprovadamente **não** é o segredo
- [x] Nenhum `console.*` do handler imprime token, signature, segredo ou payload
- [x] **12/12 testes locais**, incluindo `?signature=` certo → 200, errado → 401, e com cara de HMAC → 401
- [x] Replay do mesmo `provider_event_id` → 200 `duplicate:true`, **5 requisições com sucesso = 5 linhas**
- [x] `licenses` e `license_events` intocadas (2 linhas cada, `provider=manual`)
- [x] `typecheck` + `lint` + `build` — 13 rotas
- [x] **Confirmado em produção:** o botão de teste retornou 200 e foi ignorado com segurança
- [x] **Confirmado com compra real:** compra e reembolso da Kiwify retornaram 200 e foram processados

### Fase 4-7E — Validação da assinatura real (HMAC) ✅
- [x] **Hipótese da 4-7D refutada pelo teste real:** `signatureLooksLikeHex=true` no log de produção prova que `signature` é **assinatura, não token simples**
- [x] `?signature=` passou a ser validado como **HMAC do corpo cru** — SHA-256 e, se falhar, SHA-1, ambos em hex
- [x] **Aceitação de `signature` como token simples REMOVIDA** — o mesmo parâmetro não pode ter duas leituras, e a mais fraca valeria sempre que a mais forte falhasse
- [x] Prefixo `sha256=` / `sha1=` normalizado antes da comparação
- [x] **Ordem de leitura invertida:** corpo cru primeiro, autenticação depois — HMAC não é verificável sem os bytes. Payload não autenticado continua **nunca chegando ao banco**
- [x] Comparação em tempo constante por hash SHA-256 dos dois lados — `timingSafeEqual` nunca lança por tamanhos diferentes
- [x] Log com as flags pedidas: `hasQuerySignature`, `signatureFormat`, `hmacSha256Match`, `hmacSha1Match`, `tokenCarrierUsed`, `authResult` — **zero valores**
- [x] `tokenCarrierUsed` também no log de sucesso: identifica qual mecanismo a Kiwify realmente usou quando funcionar
- [x] **14/14 testes locais**, incluindo HMAC de outro corpo → 401 (replay cruzado) e `signature` = segredo → 401
- [x] `typecheck` + `lint` + `build` — 13 rotas
- [x] `licenses` e `license_events` intocadas (2 linhas cada, `provider=manual`)
- [x] **Assinatura confirmada com eventos reais:** compra e reembolso retornaram 200 em produção
- [x] **Dados antigos limpos:** webhooks `failed`/`ignored` removidos; ao final ficaram somente os `processed` da compra e do reembolso reais

### Fase 4-7F — Normalização do payload real e idempotência ✅
- [x] **Payload real da Kiwify capturado em produção** — `webhook_event_type = "order_approved"`, `order_id`, `order_status`, `payment_method`, `product_type`, `Product.*`, `Customer.*`
- [x] `order_approved` → `compra_aprovada`; `order_refunded` → `compra_reembolsada`; `order_chargeback` → `chargeback`; vocabulário próprio dos testes mantido
- [x] **`order_status` REMOVIDO dos caminhos de nome de evento** — vale `"paid"` no payload real e, sem `webhook_event_type`, viraria "compra aprovada" a partir de um status de pagamento
- [x] `provider_order_id` de `payload.order_id`; `id` removido dos candidatos (pode ser id de produto ou de cliente)
- [x] **Chave determinística `evento:pedido`** quando não há event_id — resolve o `provider_event_id NULL` que desligava a idempotência
- [x] `event_id` explícito, se um dia vier, tem prioridade sobre a derivação
- [x] `eventIdSource` (`provider` | `derived` | `none`) exposto para diagnóstico e log
- [x] `buyerEmail` de `Customer.email`, normalizado; `productId`, `productName`, `productType` extraídos (sem coluna nova)
- [x] **52/52 validações isoladas** — payload real fictício, três eventos do mesmo pedido gerando chaves distintas, replay gerando chave idêntica, entradas hostis
- [x] **7/7 testes HTTP** com o formato real: aprovada → 200; replay → `duplicate:true`; reembolso e chargeback do mesmo pedido → linhas novas; fora do escopo → `ignored`; sem tipo de evento → `unknown`
- [x] `typecheck` + `lint` + `build` — 13 rotas
- [x] `licenses` e `license_events` intocadas (2 linhas cada, `provider=manual`)
- [ ] ⚠️ **Limite conhecido:** dois eventos genuinamente distintos com mesmo tipo e mesmo `order_id` (renovação anual reusando o pedido) colidem e o segundo vira replay. Correto para a compra única; **reavaliar na fase de renovação do Pro**
- [x] **Limpeza concluída:** webhooks antigos `failed`/`ignored` removidos; banco final preserva somente a auditoria `processed` da compra e do reembolso reais

### Fase 4-7G — Compra aprovada libera licença Essencial ✅
- [x] `lib/webhooks/kiwify-processor.ts` — regra de negócio separada do Route Handler, `server-only`
- [x] **Só `compra_aprovada` concede.** Reembolso e chargeback são gravados e ficam `received` — revogação é fase própria
- [x] Compradora **já cadastrada**: perfil localizado por e-mail (`ilike` com curingas escapados — `_` é caractere legítimo em e-mail)
- [x] Licença `one_time` / `active` / `expires_at = NULL` / `provider = 'kiwify'` — valores conforme os CHECK das migrations
- [x] `license_events` com `event_type = 'granted'`, `source = 'webhook:kiwify'`, payload **só de referências** (sem PII duplicada)
- [x] `webhook_events` fechado com `status='processed'`, `processed_at`, `user_id`, `license_id`
- [x] **Idempotência em duas camadas:** índice único de `webhook_events` barra o replay antes de qualquer trabalho; unicidade `(provider, provider_order_id)` de `licenses` barra a segunda licença mesmo com `event_id` novo
- [x] **Recuperação:** reenvio de linha que ficou `received` é reprocessado, em vez de descartado como duplicata
- [x] Payload sem e-mail ou sem `order_id` → `failed` com código curto, **200** (reenviar não conserta)
- [x] **33/33 testes locais** contra o Supabase real
- [x] `has_essential_access(uid)` → `true`; usuária bloqueada → `false`
- [x] Service role **não aparece** no bundle do cliente; só o Route Handler importa `admin.ts`
- [x] `typecheck` + `lint` + `build` — 13 rotas
- [x] **Bloqueador do convite resolvido:** Resend/Supabase SMTP entregou o convite e a compradora real criou a senha
- [ ] ⛔ **Bug na migration 0002 descoberto:** o trigger `license_events_immutable` bloqueia o `ON DELETE SET NULL` da FK, então **usuária com evento de licença não pode ser excluída** (impacto LGPD). Isolado com teste A/B/C. Correção exige migration
- [x] **Compra real validada de ponta a ponta**
- [x] **Dados operacionais de teste limpos:** licenças manuais e webhooks antigos `failed`/`ignored` removidos; perfis antigos permanecem sem licença ativa

### Fase 4-7G-convite — Aceite de convite do Supabase ✅
- [x] **SMTP próprio com Resend validado em produção** — convite chega (remetente `Doce Margem <noreply@doceriadamora.com.br>`); ⚠️ caiu em spam, ver riscos
- [x] **Bloqueador 1 da 4-7G resolvido:** quem compra sem ter conta agora tem caminho até o acesso
- [x] `services/supabase/client.ts` — **primeiro client de navegador do projeto**; fragment não chega ao servidor, então não havia alternativa
- [x] `app/auth/accept-invite/page.tsx` + `components/auth/AcceptInviteClient.tsx` — lê o hash, cria a sessão, oferece a criação de senha
- [x] **Hash apagado antes de qualquer `await`** — fecha `Referer`, histórico e print de tela de uma vez
- [x] Senha trocada por **Server Action** (`setInvitedPasswordAction`) — nunca passa por estado de cliente, como no login
- [x] Sessão revalidada com `getUser()` antes da troca, nunca `getSession()`
- [x] `components/auth/InviteHashRescue.tsx` — convite que cair em `/login` é reencaminhado com o fragment preservado
- [x] `inviteUserByEmail` passou a mandar `redirectTo` → `${NEXT_PUBLIC_APP_URL}/auth/accept-invite`
- [x] `/auth/accept-invite` **sem guarda de acesso** — quem chega ainda não tem sessão; é ela que vai criar
- [x] Testado em **Chrome headless**: sem hash, hash de erro, token falso e hash lixo → todos com mensagem amigável, nenhum quebra
- [x] **URL limpa verificada via CDP**, não inferida: `/auth/accept-invite#access_token=…` e `/login#access_token=…` terminam ambos em `/auth/accept-invite` sem token
- [x] Nenhum `console.*` nos arquivos novos; service role fora do bundle do cliente
- [x] `typecheck` + `lint` + `build` — 14 rotas
- [x] **Resend configurado e verificado**; SMTP do Supabase apontando para `smtp.resend.com` com remetente `Doce Margem <noreply@doceriadamora.com.br>`
- [x] **Convite entregue de verdade** no Gmail (caiu em spam, marcado como "não é spam")
- [x] **Redirect URL cadastrada** no Supabase: `https://docemargem.doceriadamora.com.br/auth/accept-invite`
- [x] `NEXT_PUBLIC_APP_URL` na Vercel = `https://docemargem.doceriadamora.com.br`
- [x] **Dados de teste da 4-7G limpos** do Supabase
- [ ] ⚠️ **Entregabilidade:** SPF/DKIM/DMARC do domínio no Resend — não bloqueia tecnicamente, mas e-mail em spam custa vendas
- [x] **Compra real de ponta a ponta validada** (comprar → e-mail → criar senha → acessar)
- [x] As linhas antigas `failed`/`ignored` foram removidas após a validação real

### Fase 4-7G — Revisão final pós-correções externas ✅
- [x] Configuração externa confirmada: Resend, SMTP, Redirect URL, `NEXT_PUBLIC_APP_URL`, limpeza do banco
- [x] `typecheck` + `lint` + `build` — 14 rotas, tudo verde
- [x] Banco conferido: 2 licenças e 2 eventos, ambos `manual:test`; **nenhum resíduo `kiwify`**
- [x] ✅ **Corrigido:** o `insert` em `license_events` agora é checado. Falha → webhook vira `failed` com código curto e resposta **500**, nunca `processed` sem auditoria
- [x] `ensureGrantAudited` consulta antes de inserir — a condição antiga (`if (license.created)`) **restauraria o defeito no reprocessamento**, quando a licença já existe
- [x] `failed` entrou nos estados reprocessáveis — sem isso, marcar `failed` criaria beco sem saída e o reenvio da Kiwify viraria "duplicate"
- [x] `auditCreated` no log de sucesso
- [x] **30/30 isolados** (stub com falhas programáveis) + **33/33 ponta a ponta** contra o Supabase real
- [ ] 🟡 **Achado da revisão:** quem abre o convite e fecha antes de definir a senha fica com sessão válida **sem senha** — navega normalmente, mas não consegue voltar depois. Precisa de novo convite ou de tela de recuperação de senha
- [ ] 🟡 **Achado da revisão:** `InviteHashRescue` reencaminha qualquer hash com token, inclusive de recuperação de senha. Benigno hoje (o destino também define senha), mas revisar quando existir fluxo de recuperação

### Fase 4-7H — Reembolso e chargeback revogam licença ✅
- [x] `compra_reembolsada` → `licenses.status = 'refunded'` + `license_events` `refunded`
- [x] `chargeback` → `licenses.status = 'chargeback'` + `license_events` `chargeback`
- [x] Valores exatos dos CHECK das migrations; nada inventado
- [x] **Acesso cai na requisição seguinte** — as funções SQL filtram `status = 'active'` e o DAL não persiste acesso; não há cache para invalidar
- [x] `webhook_events` fechado como `processed` com `processed_at`, `user_id`, `license_id`
- [x] **Revogação sem licença → `failed` + 500, nunca `processed`.** Reembolso sem licença costuma significar aprovação ainda não processada; dar por concluído deixaria a aprovação chegar depois e liberar quem foi reembolsado
- [x] **Aprovação depois de reembolso/chargeback NÃO reativa** — o dinheiro já voltou; reconceder por webhook, sem ninguém olhar, é devolver o produto depois de devolver o pagamento
- [x] Reembolso após chargeback **não sobrescreve** o chargeback (fato mais grave preservado); para o acesso dá no mesmo
- [x] Auditoria idempotente por estado (`ensureAudited` consulta antes de inserir), e obrigatória — falha vira `failed` + 500
- [x] **65/65 isolados** + **24/24 ponta a ponta** contra o Supabase real
- [x] `has_essential_access` verificado indo para `false` após reembolso e após chargeback
- [x] `typecheck` + `lint` + `build` — 14 rotas
- [x] **Compra real de ponta a ponta validada em produção** — compra, convite, senha, acesso, reembolso e perda de acesso confirmados
- [ ] Perfis antigos de teste permanecem no Supabase, mas sem licença ativa; licenças manuais e webhooks antigos `failed`/`ignored` foram removidos

### Fase 4-7I — Filtrar teste da Kiwify e validar produto ✅
- [x] **Payload do botão "Testar Webhook" não libera mais nada** — era o que produzia `failed:invite_failed` em produção
- [x] Detecção por sinais **literais e estreitos**: `@example.com` (domínio reservado RFC 2606 — nenhum cliente real pode ter), `"Example product"` exato, `custom_fields` com `"Example field"/"Example value"`
- [x] Validação de produto antes de conceder: `KIWIFY_ESSENTIAL_PRODUCT_ID` como principal, `KIWIFY_ESSENTIAL_PRODUCT_NAME` como reserva
- [x] **Produto de outra oferta → `ignored` + 200**, sem usuária, sem licença, sem auditoria. Fecha o risco de webhook "todos os produtos que sou produtor"
- [x] **Env ausente → `product_config_missing`, falha fechada** em compra real
- [x] Sem identificação de produto no payload → `produto_nao_identificado`, não libera
- [x] Revogação segue mesmo sem produto identificado — a busca por `provider_order_id` já limita o alcance, e não revogar é pior que revogar à toa
- [x] `.env.example` documenta as duas variáveis novas
- [x] **95/95 isolados** + **19/19 ponta a ponta**, com o payload real do botão de teste da Kiwify
- [x] `typecheck` + `lint` + `build` — 14 rotas
- [x] **Identificação do produto validada em produção:** a compra real do Doce Margem Essencial foi aceita e processada; o ID continua sendo a configuração principal recomendada
- [x] **Compra real de ponta a ponta concluída**

### Validação final do ciclo real em produção ✅
- [x] Botão **“Testar Webhook”** da Kiwify retornou 200 e foi ignorado com segurança
- [x] Compra real do produto Doce Margem Essencial retornou 200
- [x] Webhook `compra_aprovada` ficou `processed`
- [x] Usuária criada
- [x] Convite entregue via Resend/Supabase SMTP
- [x] Compradora criou a senha
- [x] Licença Kiwify ficou `active`
- [x] `license_events` registrou `granted`
- [x] Acesso confirmado em `/conta`, `/ingredientes`, `/receitas`, `/precificacao` e `/configuracoes`
- [x] Reembolso real da Kiwify disparou webhook
- [x] Webhook `compra_reembolsada` ficou `processed`
- [x] Licença mudou para `refunded`
- [x] `license_events` registrou `refunded`
- [x] Usuária perdeu o acesso e caiu em `/acesso-bloqueado`
- [x] Licenças manuais de teste removidas
- [x] Webhooks antigos `failed`/`ignored` removidos
- [x] Estado final do banco contém somente os eventos `processed` de auditoria da compra e do reembolso reais

#### Pendências conhecidas após o teste
- [ ] Melhorar entregabilidade do convite, que ainda pode cair em spam
- [ ] Tratar os perfis antigos de teste; hoje permanecem sem licença ativa
- [ ] Executar chargeback manual ponta a ponta; o código usa o mesmo mecanismo de revogação do reembolso já validado
- [ ] Abrir oficialmente a venda do app
- [ ] Antes da venda aberta, revisar copy, checkout, domínio, suporte e política de reembolso

### Fase 4-7J — Cancelamento e expiração (pendente)
- [ ] Cadastrar o webhook no painel da Kiwify — **ainda não existe webhook cadastrado**
- [ ] Criar `POST /api/webhooks/kiwify` — **a rota ainda não existe**
- [ ] **Capturar payload real da Kiwify** (webhook.site) antes de escrever código — sem isso os nomes de campo são chute
- [ ] Confirmar o mecanismo de validação observado (token simples × HMAC em query string)
- [ ] **Decidir:** compra antes do cadastro — convite via Admin API (recomendado no plano) × concessão manual
- [ ] `services/supabase/admin.ts` com `server-only`, service role isolada do client de sessão
- [ ] Route Handler + teste com replay e token inválido
- [ ] Handler deve **rejeitar** payload sem `provider_event_id` — gravar NULL desliga a idempotência sem sinal nenhum
- [ ] Excluir `/api/webhooks/*` do `matcher` do `proxy.ts` quando a Fase 4-5C o criar
- [ ] **Pendente de deploy:** URL pública e teste de ponta a ponta com compra real

## Fase 7 — Admin
- [ ] Criar área admin (protegida por ADMIN_EMAILS)
- [ ] Buscar usuário por email
- [ ] Ver perfil e licenças
- [ ] Criar licença manual / ativar compra única / conceder Pro Anual
- [ ] Bloquear acesso
- [ ] Marcar reembolso / chargeback
- [ ] Ver webhooks e status de processamento

## Fase 8 — Revisão e deploy
- [ ] Rodar lint
- [ ] Rodar typecheck
- [ ] Rodar build
- [ ] Revisar segurança
- [ ] Preparar GitHub (e-mail noreply, repo, push main)
- [ ] Preparar Vercel (preset Next.js, variáveis de ambiente)

---

### Mapeamento (ordem de execução do briefing → fases acima)
A "ordem obrigatória de execução" do briefing agrupa algumas fases:
- Execução Fase 4 (Licenciamento e acesso) = Fases 4 + 5 acima.
- Execução Fase 5 (Webhooks e admin) = Fases 6 + 7 acima.
- Execução Fase 6 (Revisão e deploy) = Fase 8 acima.
