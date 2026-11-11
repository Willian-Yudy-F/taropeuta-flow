# Taropeuta Flow

Human-reviewed AI workflow for social enquiries, booking preparation and client operations.

**Live demo:** [English](https://taropeuta-flow.vercel.app/en/flow-demo) · [Português](https://taropeuta-flow.vercel.app/pt/flow-demo)

> Built for the Meta Global AI Developer Hackathon. The project was completed after the submission portal closed and was **not submitted, shortlisted or awarded**.

## The problem

Taropeuta receives enquiries through Instagram, WhatsApp and Facebook. The conversations are valuable, but the operational work behind them can become fragmented: understanding intent, collecting missing booking details, assessing risk, choosing the next step and preparing a response.

## The solution

Taropeuta Flow converts a synthetic social enquiry into a structured client-journey record:

- intent and service interest;
- missing booking information;
- journey stage and risk level;
- recommended administrative next action;
- a draft reply for practitioner review.

The practitioner remains responsible for every decision. Nothing is sent automatically. Prediction requests are reframed, and immediate-risk messages leave the generative workflow.

## Try the demo

The public demo contains six fictional contacts using reserved `example.test` email addresses. It works without credentials through clearly labelled fixtures.

When `MODEL_API_KEY` is configured on the server, the `/api/meta/intake` route uses Meta's `muse-spark-1.3-contributor` model. If the model is unavailable, the interface falls back to a labelled deterministic fixture instead of hiding the failure.

No real client messages, bookings or personal data are included in the repository or public demo.

## Product scope

Taropeuta Flow is integrated into a broader bilingual platform that includes:

- public pages in Portuguese and English;
- booking and availability workflows;
- Stripe-ready checkout and webhook handling;
- Supabase-ready authentication, CRM and Row Level Security;
- a protected admin area for calendar, services, content and finance;
- a future social inbox using the same review-first Flow component.

The public deployment demonstrates the experience with synthetic data. Real client storage is not enabled until Supabase, authentication, consent, retention and privacy policies are configured.

## Stack

| Area | Technology |
| --- | --- |
| Application | Next.js 15 App Router, React 19, TypeScript |
| Interface | Tailwind CSS, self-hosted Cormorant Garamond and Figtree |
| Validation | Zod |
| Data and auth | Supabase-ready PostgreSQL, RLS and Auth |
| Payments | Stripe Checkout and webhook-ready flows |
| AI | Meta Model API with structured server-side output |
| Deployment | Vercel |

## Architecture

```text
Synthetic social enquiry
        ↓
Server-side validation and safety rules
        ↓
Meta Model API or labelled demo fixture
        ↓
Structured journey record
        ↓
Human review, edit or approval
        ↓
No automatic sending
```

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
git clone https://github.com/Willian-Yudy-F/taropeuta-flow.git
cd taropeuta-flow
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/en/flow-demo` or `http://localhost:3000/pt/flow-demo`.

`MODEL_API_KEY` is optional. Leave it empty to use labelled fixtures. Never prefix it with `NEXT_PUBLIC_` or commit it.

## Verify a change

```bash
npm run check
npm run build
npm audit --audit-level=high
```

The production build generates 19 static pages and validates the dynamic admin and API routes.

## Repository structure

```text
src/
├── app/
│   ├── [lang]/flow-demo/     # Public bilingual demo
│   ├── admin/inbox/          # Future protected social inbox
│   └── api/meta/intake/      # Server-only Meta Model API route
├── components/FlowDemo.tsx   # Human-review interface
├── lib/demoEnquiries.ts      # Six synthetic enquiries
└── lib/metaIntake.ts         # Structured model client and safety handling
supabase/
├── schema.sql                # Tables, constraints, RLS and triggers
└── seed.sql                  # Initial services and settings
docs/
└── SETUP.md                  # Full platform configuration guide
```

## Security and privacy boundaries

- API keys and service-role credentials remain server-side.
- `.env*` files are ignored; `.env.example` contains names only.
- Sensitive tables use admin-only RLS policies.
- Booking availability is revalidated on the server and protected by database constraints.
- Payment completion depends on the Stripe webhook, not a return URL.
- The public demo sends only synthetic messages to the model.
- Real Meta channel integrations require separate permissions, webhooks, consent and privacy review.

See [docs/SETUP.md](docs/SETUP.md) for the complete deployment and security checklist.

## Current status

Portfolio-ready prototype. The bilingual demo, fixture fallback, safety exit, journey controls and production build are working. The next stage is a separate, privacy-reviewed Supabase environment before any real-person data is introduced.
