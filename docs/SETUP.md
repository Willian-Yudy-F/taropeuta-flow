# Taropeuta — Guia de Configuração (SETUP)

Este guia cobre tudo o que precisa ser configurado manualmente antes de colocar a plataforma no ar, e como administrar o site no dia a dia.

> **Resumo do que você precisa criar/fornecer:** projeto no Supabase, chaves da Stripe, provedor de e-mail, número de WhatsApp, domínio (futuro) e textos legais definitivos. A lista completa está na seção 12.

---

## 0. Instalação e primeiro deploy

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (ver seções abaixo)
npm run dev                  # ambiente local em http://localhost:3000
```

Deploy recomendado: **Vercel** (detecta Next.js automaticamente).
1. Suba o projeto para um repositório no GitHub.
2. Em vercel.com → *Add New Project* → importe o repositório.
3. Cole as variáveis do `.env.local` em *Settings → Environment Variables*.
4. Deploy. A URL temporária será algo como `taropeuta.vercel.app` até você conectar um domínio (seção 9).

### Banco de dados (Supabase) — obrigatório

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Em *SQL Editor*, execute **na ordem**: o conteúdo de `supabase/schema.sql` e depois `supabase/seed.sql`.
3. Em *Settings → API*, copie para o `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreta — nunca exponha no navegador nem em repositório público)
4. **Criar o usuário administrador (2 passos — os dois são obrigatórios):**
   1. Em *Authentication → Users → Add user*, crie um usuário com o e-mail `taropeuta@gmail.com` (ou outro) e uma senha forte. Um perfil com papel `client` é criado automaticamente por trigger.
   2. **Promova esse usuário a admin** no *SQL Editor*:
      ```sql
      update public.profiles
      set role = 'admin'
      where id = (select id from auth.users where email = 'taropeuta@gmail.com');
      ```
   Sem o passo 2, o login funciona mas o acesso ao painel é **negado (403)** — apenas contas com `role = 'admin'` na tabela `profiles` acessam `/admin`, CRM, agenda, financeiro, exportações e configurações.

### Como testar uma conta comum (sem acesso ao admin)

1. Crie um segundo usuário em *Authentication → Users* e **não** o promova a admin.
2. Entre em `/admin/login` com essa conta → você verá **“403 — Acesso negado”**.
3. Tente abrir diretamente `/admin/crm/export` logada com essa conta → resposta **403 Forbidden** (e **401** deslogada).
4. As server actions administrativas (salvar serviço, marcar pagamento, etc.) também rejeitam contas não-admin no servidor (`assertAdmin()` na primeira linha de cada ação).

### Como validar a RLS (3 perfis)

No *SQL Editor* do Supabase, valide com os três contextos:

```sql
-- 1) VISITANTE NÃO AUTENTICADO (anon): só conteúdo público publicado
set role anon;
select count(*) from services;          -- > 0 (apenas ativos e não arquivados)
select count(*) from faqs;              -- > 0 (apenas publicados)
select count(*) from clients;           -- ERRO/0 linhas — privado
select count(*) from bookings;          -- ERRO/0 linhas — privado
select count(*) from payments;          -- ERRO/0 linhas — privado
select count(*) from blocked_slots;     -- 0 linhas — bloqueios não são públicos
select count(*) from settings;          -- 0 linhas — configurações não são públicas
reset role;

-- 2) USUÁRIO AUTENTICADO COMUM: mesmos zeros nas tabelas sensíveis.
--    Teste real: logue no site do Supabase com o usuário comum via API
--    (anon key + senha) e repita os selects — is_admin() retorna false.

-- 3) ADMIN: as leituras de clients/bookings/payments retornam linhas
--    porque is_admin() = true para o perfil promovido.
```

O caminho de escrita do app usa a **service role key apenas no servidor**, sempre atrás de `requireAdmin`/`assertAdmin`/`requireAdminApi`.

Sem o Supabase configurado o site público ainda renderiza (com textos padrão), mas agendamentos e o painel admin não funcionam.

---

## 1. Como editar o conteúdo do site

Tudo é editado no painel: **`/admin` → Conteúdo**.

- **Blocos de texto** (hero, sobre, rodapé, páginas legais): organizados por grupo, cada bloco tem campo PT e EN. Salvar publica imediatamente.
- **FAQs**: criar, editar, ordenar, publicar/despublicar, excluir.
- **Depoimentos**: só aparecem no site quando *Permissão concedida* + *Publicado* estão marcados. Não há depoimentos inventados no sistema — adicione apenas depoimentos reais autorizados.
- **Modelos de e-mail**: assunto e corpo em PT/EN com placeholders (`{{client_name}}`, `{{service_name}}`, `{{date}}`, `{{time}}`, `{{timezone}}`, `{{reference}}`, `{{whatsapp_link}}`).

Blocos marcados com `[EDIT IN ADMIN]` (política de privacidade e termos de uso) são placeholders — substitua por textos legais definitivos antes do lançamento.

## 2. Como alternar e editar idiomas

- O visitante escolhe o idioma pelo seletor **PT / EN** no cabeçalho. As URLs são `/pt/...` e `/en/...`.
- O **idioma padrão** (para onde `/` redireciona) é configurado em **Configurações → Idioma padrão do site**.
- Todos os conteúdos do CMS têm campos separados PT e EN. Os textos fixos da interface ficam em `src/dictionaries/pt.json` e `en.json` (edição via código).
- O painel admin é em português; a arquitetura permite tradução futura.

## 3. Como adicionar ou editar serviços

**`/admin` → Atendimentos**.

- Editar um serviço existente: clique no card para expandir o formulário (nome/descrição PT+EN, preço, moeda, duração, nº de perguntas, formato de entrega, antecedência mínima, intervalo entre atendimentos, máximo por dia, imagem de capa, ordem, ativo/inativo).
- **Novo serviço**: formulário no fim da página.
- **Duplicar**: cria uma cópia inativa para editar com calma.
- **Arquivar**: tira o serviço do site sem apagar o histórico de agendamentos. Pode ser restaurado.

## 4. Como configurar horários de atendimento

**`/admin` → Configurações → Horários de atendimento**: janelas semanais (ex.: Segunda 09:00→18:00). Os horários exibidos na página de agendamento são gerados a partir dessas janelas, respeitando duração + intervalo do serviço, antecedência mínima e máximo por dia.

**Bloqueios pontuais** (feriados, folgas, viagens): **`/admin` → Agenda → Bloqueios de agenda**.

Todos os horários são interpretados no **fuso do negócio** (Configurações), e a cliente vê o horário também no fuso dela.

## 5. Como conectar a Stripe

1. Crie a conta em [stripe.com](https://stripe.com) (país: Austrália; moeda: AUD).
2. Em *Developers → API keys*, copie para o `.env.local` / variáveis da Vercel:
   ```
   STRIPE_SECRET_KEY=sk_test_...       # depois sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. **Webhook** (necessário para confirmar pagamentos automaticamente): em *Developers → Webhooks → Add endpoint*, aponte para
   `https://SEU-DOMINIO/api/webhooks/stripe`
   e selecione os eventos `checkout.session.completed` e `charge.refunded`. Copie o *Signing secret* para `STRIPE_WEBHOOK_SECRET`.
4. No painel: **Configurações → Pagamentos → marcar “Stripe ativo”**.

Fluxo: a cliente preenche o formulário → é redirecionada para o Stripe Checkout seguro → ao pagar, o webhook marca o agendamento como **Pago** e registra o pagamento. Nenhum dado de cartão passa pelo nosso servidor.

**Reembolsos Stripe**: faça pelo painel da Stripe; o webhook localiza o pagamento pelo `payment_intent_id` e atualiza pagamento **e** agendamento para “Reembolsado”.

**Checkout abandonado**: cada checkout reserva o horário por um tempo configurável (Configurações → *Tempo de reserva do checkout*, mínimo 30 min — exigência da Stripe). Se a cliente não pagar, o evento `checkout.session.expired` libera o horário; e mesmo que o webhook falhe, o sistema cancela reservas expiradas automaticamente antes de calcular disponibilidade (autocorreção).

### Como testar os webhooks Stripe (modo teste)

1. Instale a [Stripe CLI](https://stripe.com/docs/stripe-cli) e faça `stripe login`.
2. Em um terminal: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — copie o `whsec_...` exibido para `STRIPE_WEBHOOK_SECRET`.
3. Rode o site (`npm run dev`), faça um agendamento e pague com o cartão de teste `4242 4242 4242 4242` → o agendamento vira **Pago** via webhook.
4. Cenários a validar:
   - **Aprovado**: pagar normalmente → status *Pago*; página de confirmação mostra o texto de pagamento confirmado (ela lê o status do banco, nunca da URL).
   - **Falhado**: cartão `4000 0000 0000 0002` → permanece *Aguardando pagamento* até expirar.
   - **Abandonado/expirado**: feche o checkout e dispare `stripe trigger checkout.session.expired` (ou aguarde o hold) → reserva cancelada, horário liberado.
   - **Reembolsado**: reembolse no dashboard → `charge.refunded` marca pagamento e agendamento como *Reembolsado*.
   - **Manual**: com Stripe desativada, a reserva nasce *Aguardando pagamento* e é confirmada em Financeiro → *Marcar como pago*.

## 6. Modo teste vs. modo produção

- **Teste**: use as chaves `sk_test_...` e o webhook em modo teste. Cartão de teste: `4242 4242 4242 4242`, qualquer validade futura e CVC.
- **Produção**: troque para `sk_live_...` e crie um novo webhook endpoint em modo live (o *signing secret* muda!).
- Enquanto a Stripe estiver **desativada** nas Configurações, o site funciona em modo de pagamento manual: a reserva é criada como **“Aguardando pagamento”** e você confirma manualmente em **Financeiro → Marcar como pago** após receber a transferência.

## 7. Como configurar notificações por e-mail

A estrutura está pronta (modelos bilíngues + ponto de integração), mas **nenhum provedor está conectado** — os e-mails ainda não são enviados automaticamente.

Recomendação: [Resend](https://resend.com) (generoso no plano grátis, integração simples com Next.js).

1. Crie a conta, verifique um domínio de envio (ou use o domínio sandbox para testes).
2. Adicione ao `.env.local`: `EMAIL_PROVIDER=resend` e `RESEND_API_KEY=re_...`
3. O ponto de integração está comentado com `TODO` em `src/app/api/webhooks/stripe/route.ts` (confirmação pós-pagamento) — a função deve ler o modelo em `email_templates`, substituir os placeholders e enviar.
4. **Lembretes automáticos** (24 h antes) exigem uma tarefa agendada: use *Vercel Cron Jobs* ou *Supabase Edge Functions + pg_cron* chamando uma rota que busca agendamentos nas próximas X horas e dispara o modelo `booking_reminder`.

## 8. Como adicionar o link do WhatsApp

**Configurações → Link do WhatsApp**. Substitua o placeholder por:
```
https://wa.me/CODIGODOPAISNUMERO    →  ex.: https://wa.me/61412345678
```
(código do país + número, sem espaços, sem `+`). O link é usado automaticamente no rodapé, página de contato, confirmação de agendamento e modelos de e-mail.

## 9. Como conectar um domínio no futuro

Nenhum domínio foi inventado — quando você comprar o seu:

1. Na Vercel: *Project → Settings → Domains → Add* e digite o domínio.
2. No registrador (ex.: Namecheap, GoDaddy, registro.br): crie o registro `A` / `CNAME` que a Vercel indicar.
3. Atualize `NEXT_PUBLIC_SITE_URL` nas variáveis de ambiente.
4. Se a Stripe já estiver ativa, atualize a URL do webhook para o novo domínio.
5. Se o e-mail estiver ativo, verifique o novo domínio no provedor de e-mail (registros SPF/DKIM).

Nenhuma alteração de código é necessária.

## 10. Como acessar o CRM

- **`/admin/login`** com o usuário criado no Supabase (seção 0).
- **CRM**: busca por nome/e-mail, filtros por tags (Nova cliente, Recorrente, VIP, Relacionamento, Carreira, Astrologia, Tarô, Austrália, Brasil, Follow-up), perfil completo da cliente com dados de nascimento, painel de astrologia (Sol/Lua/Ascendente), notas internas, histórico de agendamentos e pagamentos.
- **Sol** é calculado automaticamente pela data de nascimento. **Lua e Ascendente** são campos manuais — o sistema **não** calcula mapa astral completo (isso exigiria efemérides verificadas; o espaço para integração futura está reservado).

## 11. Como exportar dados de clientes

- **Todas as clientes**: CRM → botão **Exportar CSV** (ou Configurações → Privacidade).
- **Pagamentos**: Financeiro → **Exportar CSV** (filtrado pelo período selecionado).
- **Exclusão de dados (LGPD/GDPR)**: Configurações → Privacidade → informar o e-mail da cliente. Os dados pessoais e de nascimento são anonimizados preservando o histórico financeiro agregado.

## 12. O que ainda precisa ser fornecido manualmente

| Item | Onde configurar | Status |
|---|---|---|
| Projeto Supabase + execução de `schema.sql` e `seed.sql` | supabase.com → SQL Editor | ⬜ pendente |
| Usuário administrador (e-mail + senha) | Supabase → Authentication | ⬜ pendente |
| Chaves Supabase no `.env` | `.env.local` / Vercel | ⬜ pendente |
| Chaves Stripe (teste e depois live) | `.env.local` / Vercel | ⬜ pendente |
| Webhook Stripe | Painel Stripe | ⬜ pendente |
| Provedor de e-mail (ex.: Resend) + integração de envio | `.env` + código (TODO marcado) | ⬜ pendente |
| Número real do WhatsApp | Admin → Configurações | ⬜ pendente |
| Instagram (opcional) | Admin → Configurações | ⬜ pendente |
| Foto profissional na página Sobre | Admin → Conteúdo (URL da imagem) | ⬜ pendente |
| Texto pessoal de apresentação (Sobre) | Admin → Conteúdo | ⬜ pendente |
| Política de privacidade definitiva | Admin → Conteúdo → Páginas legais | ⬜ placeholder `[EDIT IN ADMIN]` |
| Termos de serviço definitivos | Admin → Conteúdo → Páginas legais | ⬜ placeholder `[EDIT IN ADMIN]` |
| Depoimentos reais autorizados | Admin → Conteúdo → Depoimentos | ⬜ vazio de propósito |
| Domínio próprio | Vercel + registrador | ⬜ futuro |
| Cron de lembretes automáticos | Vercel Cron / Supabase | ⬜ futuro |

### Onde cada variável de ambiente vai (Vercel)

Em *Vercel → Project → Settings → Environment Variables* (nunca no código, nunca no Git):

| Variável | Escopo | Sensível? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview + Development | não (pública por design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview + Development | não (protegida pela RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production (+ Preview se necessário) | **SIM — só servidor, ignora RLS** |
| `STRIPE_SECRET_KEY` | Production / Preview (chaves diferentes: live/test) | **SIM** |
| `STRIPE_WEBHOOK_SECRET` | Production / Preview (secrets diferentes por endpoint) | **SIM** |
| `NEXT_PUBLIC_SITE_URL` | todas | não |
| `EMAIL_PROVIDER_API_KEY` (futuro) | Production | **SIM** |

Regras: segredos **sem** o prefixo `NEXT_PUBLIC_` nunca chegam ao navegador; o `.gitignore` já exclui `.env*`; o repositório contém apenas `.env.example` vazio.

---

## Checklist de segurança antes de publicar

- [ ] `schema.sql` + `seed.sql` executados; extensão `btree_gist` criada (está no schema).
- [ ] Usuário admin criado **e promovido** (`profiles.role = 'admin'`).
- [ ] Teste com conta comum: `/admin` nega com 403; `/admin/crm/export` responde 403.
- [ ] Validação RLS dos 3 perfis executada (seção acima).
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` apenas na Vercel — nunca commitadas.
- [ ] Stripe testada em modo teste (aprovado, falhado, expirado, reembolsado, manual).
- [ ] Webhook live criado com o domínio final e novo `whsec_...`.
- [ ] WhatsApp real configurado (sem placeholder).
- [ ] Políticas de privacidade e termos definitivos publicados (sem `[EDIT IN ADMIN]`).
- [ ] HTTPS ativo (Vercel padrão) — HSTS já é enviado em produção.
- [ ] Cabeçalhos verificados em produção (CSP, X-Frame-Options, nosniff, Referrer-Policy) — ex.: `curl -sI https://SEU-DOMINIO | grep -iE 'content-security|frame|nosniff|referrer|strict-transport'`.
- [ ] `npm audit` sem vulnerabilidades.

## Resultado real das verificações (build de entrega)

Executado neste código, nesta ordem:

```
$ npm ci
→ instala a partir do package-lock.json regenerado, sem erros

$ npx tsc --noEmit
→ 0 erros

$ npm run build        # Next.js 15.5.20
→ Compiled successfully — 25 rotas geradas (site público SSG/dinâmico + admin + APIs)

$ npm audit
→ found 0 vulnerabilities
```

Notas: o projeto foi migrado do Next 14 para o **Next 15.5 (linha com suporte de segurança ativo)** + React 19; um `override` fixa o `postcss` interno do Next em versão corrigida (GHSA-qx2v-qp2m-jg93). As fontes são **auto-hospedadas** via `@fontsource` (sem chamadas ao Google Fonts em build ou runtime — deploy não depende de CDN externa e nenhum dado de visitante vai ao Google).

### Rate limiting — limites conhecidos

O limite de requisições do formulário (8/min por IP + 3/min por e-mail) é **em memória, por instância serverless**. Na Vercel isso é uma primeira camada de proteção, não uma garantia global (instâncias diferentes têm contadores diferentes). Para um limite global, conecte um [Upstash Redis](https://upstash.com) (plano grátis) e troque o mapa em `src/app/api/bookings/route.ts` pelo `@upstash/ratelimit` — o ponto está comentado no código. O honeypot anti-spam do formulário funciona independentemente disso.

---

## Notas de escopo (honestidade técnica)

- **E-mails**: modelos e arquitetura prontos; o **envio** só acontece após conectar um provedor (seção 7).
- **Lembretes**: exigem tarefa agendada (seção 7, item 4).
- **Lua/Ascendente**: manuais por decisão de integridade — sem biblioteca de efemérides verificada, o sistema não finge calcular mapa astral.
- **Diário Digital**: módulo futuro oculto, com tabelas prontas (`journal_modules`, `journal_entries`) e status "Em breve" no admin. Sem preço, nome final ou fluxo de venda, conforme o escopo.
- **BRL/USD, Wise, cupons**: estrutura de dados pronta (`currency` nos serviços, `provider` nos pagamentos, tabela `discount_codes`), ativação futura.
