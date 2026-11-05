# ✦ Taropeuta

Plataforma bilíngue (PT-BR / EN) de site público, agendamentos, pagamentos e CRM para a marca **Taropeuta** — tarô e astrologia como ferramentas de reflexão e decisões práticas.

## Meta Hackathon extension: Taropeuta Flow

Taropeuta Flow adds a human-reviewed social inbox for synthetic Instagram, WhatsApp and Facebook enquiries. Meta's `muse-spark-1.3-contributor` model structures each enquiry, identifies missing booking information, recommends an administrative next step and prepares a reply draft. The practitioner must edit or approve every draft; nothing is sent automatically.

The public judge demo is available at `/en/flow-demo` and `/pt/flow-demo`. It works with labelled fixtures when `MODEL_API_KEY` is absent, so the demonstration never depends on the external API. Only synthetic messages are sent to Meta during the hackathon.

### Run the hackathon demo

```bash
npm install
export MODEL_API_KEY="your-meta-model-api-key"
npm run dev
```

Open `http://localhost:3000/en/flow-demo`. Never commit the real key; `.env*` files are ignored.

> **Comece por aqui:** [`docs/SETUP.md`](docs/SETUP.md) — guia completo de configuração (Supabase, Stripe, e-mail, WhatsApp, domínio, CRM).

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15.5 (App Router, Server Components + Server Actions) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS + fontes auto-hospedadas (@fontsource: Cormorant Garamond / Figtree) |
| Banco & Auth | Supabase (PostgreSQL + RLS + Auth) |
| Pagamentos | Stripe Checkout + webhook (AUD; BRL/USD futuros) |
| Fusos horários | date-fns-tz |
| Validação | zod |

## Estrutura

```
src/
  app/
    [lang]/            # site público bilíngue (pt / en)
      page.tsx           home
      about/ services/ contact/ policies/[slug]/
      booking/           fluxo de agendamento (4 passos) + confirmação
    admin/             # painel protegido por login (PT)
      page.tsx           visão geral (KPIs)
      today/ crm/ calendar/ finance/ services/ content/ settings/
    api/
      availability/      GET horários disponíveis
      bookings/          POST criação de reserva (+ Stripe Checkout)
      webhooks/stripe/   confirmação automática de pagamento
  components/          # StarField, TarotFrame, BookingFlow, etc.
  dictionaries/        # pt.json / en.json (textos fixos da interface)
  lib/                 # supabase, stripe, i18n, availability, astrology, adminGuard
supabase/
  schema.sql           # tabelas, índices, RLS, triggers
  seed.sql             # serviços iniciais, horários, FAQs, políticas, e-mails
docs/
  SETUP.md             # guia de configuração completo
```

## Segurança (resumo)

- **Papéis reais**: tabela `profiles` com role `admin`/`client`; só admins acessam `/admin`, CRM, financeiro, exportações e configurações. Verificação no servidor em três camadas: páginas (`requireAdmin`), APIs (`requireAdminApi` → 401/403) e server actions (`assertAdmin`).
- **RLS restritiva**: tabelas sensíveis (`clients`, `bookings`, `payments`, bloqueios, configurações) são invisíveis para anônimos **e** para autenticados comuns — apenas `is_admin()`.
- **Agenda validada no servidor**: a rota de reserva reconfere janela, antecedência, buffer, máximo/dia, bloqueios e conflitos; o banco garante ausência de sobreposição com constraint de exclusão (`tstzrange`) — à prova de corrida.
- **Pagamento só via webhook**: a confirmação lê o status do banco; a URL de retorno nunca decide nada. Checkouts abandonados expiram e liberam o horário.
- **Cabeçalhos**: CSP, HSTS (produção), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy; cookies Secure/SameSite=Lax em produção.
- **Anti-abuso**: honeypot no formulário + rate limit por IP e por e-mail; erros públicos genéricos.
- **Segredos só no servidor**: service role e chaves Stripe fora do bundle, `.gitignore` cobre `.env*`.

## Princípios do build

- **Nada inventado**: sem depoimentos falsos, sem telefone, sem domínio, sem biografia fictícia. Lacunas são placeholders editáveis marcados no admin.
- **Pagamento honesto**: sem Stripe configurada, reservas nascem como *Aguardando pagamento* e são confirmadas manualmente no Financeiro.
- **Astrologia com integridade**: Sol calculado pela data; Lua/Ascendente manuais até existir integração de efemérides verificada.
- **Privacidade**: RLS no banco, dados de nascimento fora de URLs públicas, exportação CSV e anonimização LGPD/GDPR no admin, sem armazenamento de cartão.
- **Anti-duplicidade**: índice único no banco impede dois agendamentos ativos no mesmo horário (à prova de corrida).

## Scripts

```bash
npm run dev     # desenvolvimento
npm run build   # build de produção
npm start       # servir build
```
