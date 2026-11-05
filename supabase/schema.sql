-- ============================================================
-- TAROPEUTA · Database schema (Supabase / PostgreSQL)
-- Run once in the Supabase SQL editor (or via supabase CLI).
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────
create type booking_status as enum
  ('pending_payment','paid','confirmed','completed','cancelled','refunded','no_show');
create type payment_status as enum
  ('pending','succeeded','failed','refunded','manual_review');
create type client_status as enum ('active','inactive','vip','blocked');

-- ── Clients ─────────────────────────────────────────────────
-- Needed for the booking overlap exclusion constraint
create extension if not exists btree_gist;

create table clients (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           text not null unique,
  whatsapp        text,
  country         text,
  city            text,
  timezone        text,
  date_of_birth   date,
  birth_time      time,
  birth_city      text,
  sun_sign        text,
  moon_sign       text,          -- filled manually or by a future verified integration
  rising_sign     text,          -- filled manually or by a future verified integration
  consent_marketing boolean not null default false,
  consent_storage   boolean not null default false,
  consent_at      timestamptz,
  consent_version text,           -- version of privacy/terms accepted (e.g. '2026-07')
  consent_language text,          -- language in which consent was given ('pt' | 'en')
  anonymized_at   timestamptz,    -- set when data is anonymized (LGPD/GDPR)
  internal_notes  text,
  tags            text[] not null default '{}',
  status          client_status not null default 'active',
  total_spent_cents bigint not null default 0,
  last_booking_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_clients_email on clients (lower(email));
create index idx_clients_tags on clients using gin (tags);

-- ── Services ────────────────────────────────────────────────
create table services (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_en         text not null,
  name_pt         text not null,
  description_en  text,
  description_pt  text,
  price_cents     integer not null,
  currency        text not null default 'AUD',
  duration_min    integer not null,
  questions_included integer,
  delivery_format text not null,               -- 'whatsapp_audio' | 'online_session'
  required_fields jsonb not null default '[]', -- extra per-service fields (future)
  min_notice_hours integer not null default 24,
  buffer_min      integer not null default 15,
  max_per_day     integer not null default 6,
  cover_image_url text,
  is_active       boolean not null default true,
  is_archived     boolean not null default false,
  confirmation_template_key text default 'booking_confirmation',
  reminder_template_key     text default 'booking_reminder',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Availability rules & blocks ─────────────────────────────
create table availability_rules (
  id          uuid primary key default gen_random_uuid(),
  weekday     smallint not null check (weekday between 0 and 6), -- 0=Sunday
  start_time  time not null,
  end_time    time not null,
  is_active   boolean not null default true
);

create table blocked_slots (
  id          uuid primary key default gen_random_uuid(),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  created_at  timestamptz not null default now()
);

-- ── Bookings ────────────────────────────────────────────────
create table bookings (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  client_id         uuid not null references clients(id) on delete restrict,
  service_id        uuid not null references services(id) on delete restrict,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  business_timezone text not null,
  client_timezone   text,
  status            booking_status not null default 'pending_payment',
  payment_status    payment_status not null default 'pending',
  form_responses    jsonb not null default '{}',  -- topic, questions/context, etc.
  birth_snapshot    jsonb,                        -- {date_of_birth, birth_time, birth_city} at booking time
  amount_cents      integer not null,
  currency          text not null default 'AUD',
  discount_code_id  uuid,
  internal_notes    text,
  language          text not null default 'pt',   -- language chosen by the client
  cancellation_reason text,
  expires_at        timestamptz,   -- temporary hold: pending_payment bookings past this moment are released
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_bookings_starts on bookings (starts_at);
create index idx_bookings_client on bookings (client_id);

-- Prevents two non-cancelled bookings occupying the same start slot
create unique index uniq_active_slot on bookings (starts_at)
  where status not in ('cancelled','refunded');

-- Race-proof: no two active bookings may OVERLAP in time, even with
-- different start points (different services/durations). Enforced by
-- the database itself, so concurrent requests cannot both succeed.
alter table bookings add constraint bookings_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at) with &&)
  where (status not in ('cancelled','refunded'));

-- ── Payments ────────────────────────────────────────────────
create table payments (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references bookings(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete restrict,
  amount_cents    integer not null,
  currency        text not null default 'AUD',
  provider        text not null default 'stripe', -- stripe | manual | wise (future) | ...
  method          text,                           -- card, transfer, pix (future)...
  transaction_id  text,                           -- Stripe Checkout Session id (or manual reference)
  payment_intent_id text,                         -- Stripe PaymentIntent id (links refunds/charges back)
  status          payment_status not null default 'pending',
  paid_at         timestamptz,
  refund_amount_cents integer,
  refund_reason   text,
  refunded_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index idx_payments_booking on payments (booking_id);
create index idx_payments_intent on payments (payment_intent_id);

-- ── Discount codes (future-ready) ───────────────────────────
create table discount_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  percent_off   integer check (percent_off between 1 and 100),
  amount_off_cents integer,
  currency      text default 'AUD',
  max_uses      integer,
  used_count    integer not null default 0,
  valid_from    timestamptz,
  valid_until   timestamptz,
  is_active     boolean not null default true
);
alter table bookings
  add constraint fk_booking_discount foreign key (discount_code_id) references discount_codes(id);

-- ── Testimonials ────────────────────────────────────────────
create table testimonials (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  text_en       text,
  text_pt       text,
  service_id    uuid references services(id) on delete set null,
  permission_granted boolean not null default false,
  is_published  boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ── CMS content (bilingual key/value) ───────────────────────
create table content_blocks (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,   -- e.g. 'home.hero.title', 'policy.cancellation'
  value_en    text,
  value_pt    text,
  group_name  text,                   -- 'home' | 'about' | 'legal' | 'footer' | 'seo' | 'email'...
  updated_at  timestamptz not null default now()
);

create table faqs (
  id          uuid primary key default gen_random_uuid(),
  question_en text not null, answer_en text not null,
  question_pt text not null, answer_pt text not null,
  is_published boolean not null default true,
  sort_order  integer not null default 0
);

-- ── Email templates (provider connected later) ──────────────
create table email_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,   -- booking_confirmation | booking_reminder | thank_you
  subject_en  text not null, body_en text not null,
  subject_pt  text not null, body_pt text not null,
  reminder_hours_before integer,      -- only for reminder templates
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- ── Settings (single row) ───────────────────────────────────
create table settings (
  id                 boolean primary key default true check (id), -- singleton
  business_timezone  text not null default 'Australia/Sydney',
  default_language   text not null default 'pt',
  whatsapp_link      text default 'https://wa.me/SEU_NUMERO_COM_CODIGO_DO_PAIS',
  instagram_url      text,
  contact_email      text not null default 'taropeuta@gmail.com',
  cancellation_min_hours integer not null default 24,
  allow_reschedule   boolean not null default true,
  allow_refund       boolean not null default false,
  allow_credit       boolean not null default true,
  stripe_enabled     boolean not null default false,
  manual_payment_enabled boolean not null default true,
  manual_payment_instructions_en text,
  manual_payment_instructions_pt text
);
insert into settings default values;

-- ── Future module: Digital Journal (hidden, "Coming soon") ──
create table journal_modules (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null default 'Digital Journal',
  name_pt     text not null default 'Diário Digital',
  status      text not null default 'coming_soon',  -- coming_soon | beta | live
  is_public   boolean not null default false,
  config      jsonb not null default '{}'
);
insert into journal_modules default values;

create table journal_entries (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  title       text,
  body        text,
  prompt_key  text,          -- guided reflection prompt used, if any
  visibility  text not null default 'private',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Data-privacy requests (export / deletion) ───────────────
create table privacy_requests (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete set null,
  email       text not null,
  kind        text not null check (kind in ('export','deletion')),
  status      text not null default 'open',  -- open | done | rejected
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- ── updated_at triggers ─────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

do $$ declare t text;
begin
  foreach t in array array['clients','services','bookings','content_blocks','journal_entries','email_templates']
  loop
    execute format('create trigger trg_%s_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ── Row Level Security ──────────────────────────────────────
-- Anonymous visitors can only READ published/active public content.
-- All writes and all personal data go through the Next.js server
-- using the service-role key (bypasses RLS). Admins sign in via
-- Supabase Auth.

alter table clients          enable row level security;
alter table bookings         enable row level security;
alter table payments         enable row level security;
alter table privacy_requests enable row level security;
alter table journal_entries  enable row level security;
alter table discount_codes   enable row level security;
alter table email_templates  enable row level security;
alter table settings         enable row level security;
alter table services         enable row level security;
alter table testimonials     enable row level security;
alter table content_blocks   enable row level security;
alter table faqs             enable row level security;
alter table availability_rules enable row level security;
alter table blocked_slots    enable row level security;
alter table journal_modules  enable row level security;

-- ── Profiles & roles ─────────────────────────────────────────
-- Every auth user gets a profile with role 'client' by default.
-- Only rows with role 'admin' may access administrative data.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'client' check (role in ('admin','client')),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- Users can read ONLY their own profile (needed by the admin guard).
create policy "read own profile" on profiles
  for select to authenticated using (auth.uid() = id);
-- No insert/update/delete policies: roles can only be changed with the
-- service role key or directly in the Supabase dashboard (SQL editor).

-- SECURITY DEFINER helper usable inside other policies.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- Auto-create a 'client' profile whenever a new auth user is created.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  insert into profiles (id, role) values (new.id, 'client') on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Public (anon) read policies: ONLY published site content ─
create policy "public read active services"        on services       for select using (is_active and not is_archived);
create policy "public read published testimonials" on testimonials   for select using (is_published and permission_granted);
create policy "public read content"                on content_blocks for select using (true);
create policy "public read faqs"                   on faqs           for select using (is_published);
-- NOTE: availability_rules and blocked_slots have NO public policies.
-- Available slots are computed server-side (/api/availability) with the
-- service-role key, so the public never sees raw schedule/blocked data
-- (which could reveal personal routines or other clients' bookings).

-- ── Sensitive tables: ADMIN-ONLY via is_admin() ──────────────
-- A merely-authenticated (non-admin) user gets ZERO rows from these.
create policy "admin read clients"    on clients          for select to authenticated using (public.is_admin());
create policy "admin read bookings"   on bookings         for select to authenticated using (public.is_admin());
create policy "admin read payments"   on payments         for select to authenticated using (public.is_admin());
create policy "admin read blocks"     on blocked_slots    for select to authenticated using (public.is_admin());
create policy "admin read rules"      on availability_rules for select to authenticated using (public.is_admin());
create policy "admin read settings"   on settings         for select to authenticated using (public.is_admin());
create policy "admin read privacy"    on privacy_requests for select to authenticated using (public.is_admin());
create policy "admin read templates"  on email_templates  for select to authenticated using (public.is_admin());
create policy "admin read discounts"  on discount_codes   for select to authenticated using (public.is_admin());

-- Writes are performed exclusively by the server with the service-role
-- key (bypasses RLS) after the application-level admin check
-- (requireAdmin/assertAdmin). No write policies are granted to any role.

-- ── Future client portal (Digital Journal) ───────────────────
-- When the client login is built, clients will read ONLY their own rows.
-- The linking column (auth user -> clients.id) does not exist yet, so no
-- policy is created now; journal_entries stays fully private by default.
-- Example for the future:
--   create policy "client reads own journal" on journal_entries
--     for select to authenticated using (client_id = public.current_client_id());
