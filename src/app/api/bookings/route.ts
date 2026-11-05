import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { supabaseAdmin } from "@/lib/supabase/server";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { sunSign } from "@/lib/astrology";
import { getAvailableSlots } from "@/lib/availability";
import { releaseExpiredHolds } from "@/lib/holds";

export const dynamic = "force-dynamic";

/** Bump when the privacy policy / terms text changes materially. */
const CONSENT_VERSION = "2026-07";

const FormSchema = z.object({
  full_name: z.string().min(2).max(200),
  email: z.string().email().max(254),
  whatsapp: z.string().min(5).max(30),
  country: z.string().min(2).max(100),
  city: z.string().min(1).max(120),
  timezone: z.string().min(2).max(80),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birth_time: z.string().regex(/^\d{2}:\d{2}/),
  birth_city: z.string().min(1).max(160),
  topic: z.string().min(1).max(120),
  questions: z.string().min(1).max(5000),
  consent_storage: z.literal(true),
  consent_terms: z.literal(true),
  /** Honeypot — humans never see this field; bots fill it. Must stay empty. */
  website: z.string().max(0).optional().or(z.literal("")),
});

const BodySchema = z.object({
  serviceId: z.string().uuid(),
  startsAtUtc: z.string().datetime(),
  language: z.enum(["en", "pt"]),
  clientTimezone: z.string().max(80).optional(),
  form: FormSchema,
});

// UPGRADE POINT (global rate limit): replace this map with @upstash/ratelimit
// backed by Upstash Redis — see docs/SETUP.md ("Rate limiting — limites conhecidos").
// In-memory rate limit (per serverless instance). On Vercel each warm
// instance keeps its own map, so this is a best-effort first layer —
// docs/SETUP.md explains how to add Upstash for a global limit.
const hits = new Map<string, { n: number; t: number }>();
function rateLimited(key: string, max: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > 60_000) { hits.set(key, { n: 1, t: now }); return false; }
  h.n += 1;
  return h.n > max;
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (rateLimited(`ip:${ip}`, 8)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  const { serviceId, startsAtUtc, language, clientTimezone, form } = parsed.data;

  // Honeypot tripped → pretend success, store nothing.
  if (form.website) return NextResponse.json({ reference: "OK" });

  if (rateLimited(`email:${form.email.toLowerCase()}`, 3)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const db = supabaseAdmin();
  const [{ data: service }, { data: settings }] = await Promise.all([
    db.from("services").select("*").eq("id", serviceId).eq("is_active", true).eq("is_archived", false).single(),
    db.from("settings").select("*").single(),
  ]);
  if (!service || !settings) return NextResponse.json({ error: "Service unavailable" }, { status: 400 });

  // Release expired pending_payment holds so their slots become free again.
  await releaseExpiredHolds(db);

  // ── Full server-side schedule validation ──────────────────────────
  // The requested slot must be one the availability engine would offer
  // RIGHT NOW. getAvailableSlots applies: weekly windows, min-notice,
  // duration+buffer grid, max-per-day, blocked slots, and every active
  // booking. The UI is never trusted.
  const startsAt = new Date(startsAtUtc);
  const dateISO = formatInTimeZone(startsAt, settings.business_timezone, "yyyy-MM-dd");
  const { slots } = await getAvailableSlots(service.id, dateISO);
  const offered = slots.some((s) => new Date(s.startsAtUtc).getTime() === startsAt.getTime());
  if (!offered) {
    return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
  }
  const endsAt = addMinutes(startsAt, service.duration_min);

  // Upsert client by email
  const { data: existing } = await db.from("clients").select("id").ilike("email", form.email).maybeSingle();
  const clientFields = {
    full_name: form.full_name, email: form.email.toLowerCase(), whatsapp: form.whatsapp,
    country: form.country, city: form.city, timezone: form.timezone,
    date_of_birth: form.date_of_birth, birth_time: form.birth_time, birth_city: form.birth_city,
    sun_sign: sunSign(form.date_of_birth),
    consent_storage: true, consent_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION, consent_language: language,
  };
  let clientId: string;
  if (existing) {
    await db.from("clients").update(clientFields).eq("id", existing.id);
    clientId = existing.id;
  } else {
    const { data: created, error } = await db.from("clients").insert(clientFields).select("id").single();
    if (error || !created) return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
    clientId = created.id;
  }

  // Temporary hold: Stripe checkouts expire after `checkout_hold_minutes`.
  const useStripe = settings.stripe_enabled && stripeEnabled();
  const holdMinutes = Math.max(30, settings.checkout_hold_minutes ?? 35);
  const expiresAt = useStripe ? addMinutes(new Date(), holdMinutes).toISOString() : null;

  // Create booking. Two DB-level guards make double booking impossible even
  // under a race: a unique index on starts_at AND a tstzrange exclusion
  // constraint (no overlapping active bookings). 23505/23P01 → 409.
  const { data: booking, error: bErr } = await db.from("bookings").insert({
    client_id: clientId,
    service_id: service.id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    business_timezone: settings.business_timezone,
    client_timezone: clientTimezone ?? form.timezone,
    status: "pending_payment",
    payment_status: "pending",
    amount_cents: service.price_cents,
    currency: service.currency,
    language,
    expires_at: expiresAt,
    form_responses: { topic: form.topic, questions: form.questions },
    birth_snapshot: { date_of_birth: form.date_of_birth, birth_time: form.birth_time, birth_city: form.birth_city },
  }).select("id, reference").single();

  if (bErr) {
    const conflict = bErr.code === "23505" || bErr.code === "23P01";
    return NextResponse.json(
      { error: conflict ? "Slot was just taken — please pick another time." : "Could not create booking" },
      { status: conflict ? 409 : 500 },
    );
  }

  // Stripe Checkout, if configured & enabled; otherwise manual payment path
  if (useStripe) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    try {
      const session = await stripe().checkout.sessions.create({
        mode: "payment",
        customer_email: form.email,
        expires_at: Math.floor(Date.now() / 1000) + holdMinutes * 60, // Stripe min: 30 minutes
        line_items: [{
          price_data: {
            currency: service.currency.toLowerCase(),
            unit_amount: service.price_cents,
            product_data: { name: language === "pt" ? service.name_pt : service.name_en },
          },
          quantity: 1,
        }],
        metadata: { booking_id: booking.id, client_id: clientId },
        success_url: `${site}/${language}/booking/confirmation?ref=${booking.reference}`,
        cancel_url: `${site}/${language}/booking/confirmation?ref=${booking.reference}`,
      });
      await db.from("payments").insert({
        booking_id: booking.id, client_id: clientId,
        amount_cents: service.price_cents, currency: service.currency,
        provider: "stripe", transaction_id: session.id,
        payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        status: "pending",
      });
      return NextResponse.json({ reference: booking.reference, checkoutUrl: session.url });
    } catch {
      // Stripe failed → release the hold instead of blocking the slot.
      await db.from("bookings").update({ status: "cancelled", cancellation_reason: "stripe_error" }).eq("id", booking.id);
      return NextResponse.json({ error: "Payment could not be started. Please try again." }, { status: 502 });
    }
  }

  await db.from("payments").insert({
    booking_id: booking.id, client_id: clientId,
    amount_cents: service.price_cents, currency: service.currency,
    provider: "manual", status: "pending",
  });
  return NextResponse.json({ reference: booking.reference });
}
