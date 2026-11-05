import { NextRequest, NextResponse } from "next/server";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the ONLY place a Stripe payment is ever confirmed.
 * The success_url redirect is cosmetic; booking/payment status changes
 * exclusively here, after the signature is verified.
 *
 * ID model:
 *   payments.transaction_id     = Checkout Session id (cs_...)
 *   payments.payment_intent_id  = PaymentIntent id (pi_...) — set on completion
 *   charge.refunded events carry charge.payment_intent → lookup by pi_...
 */
export async function POST(req: NextRequest) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  const raw = await req.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = supabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const bookingId = session.metadata?.booking_id;
      if (!bookingId) break;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

      await db.from("bookings")
        .update({ status: "paid", payment_status: "succeeded", expires_at: null })
        .eq("id", bookingId);
      await db.from("payments").update({
        status: "succeeded",
        paid_at: new Date().toISOString(),
        payment_intent_id: paymentIntentId,
        method: session.payment_method_types?.[0] ?? "card",
      }).eq("transaction_id", session.id);

      const { data: b } = await db.from("bookings").select("client_id, amount_cents").eq("id", bookingId).single();
      if (b) {
        const { data: c } = await db.from("clients").select("total_spent_cents").eq("id", b.client_id).single();
        await db.from("clients").update({
          total_spent_cents: (c?.total_spent_cents ?? 0) + b.amount_cents,
          last_booking_at: new Date().toISOString(),
        }).eq("id", b.client_id);
      }
      // TODO: when an email provider is connected, send `booking_confirmation` here.
      break;
    }

    case "checkout.session.expired": {
      // Abandoned checkout → release the slot immediately.
      const session = event.data.object as any;
      const bookingId = session.metadata?.booking_id;
      if (!bookingId) break;
      await db.from("bookings")
        .update({ status: "cancelled", cancellation_reason: "checkout_expired" })
        .eq("id", bookingId)
        .eq("status", "pending_payment"); // never downgrade a paid booking
      await db.from("payments")
        .update({ status: "failed" })
        .eq("transaction_id", session.id)
        .eq("status", "pending");
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as any;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (!paymentIntentId) break;

      const { data: payment } = await db.from("payments")
        .select("id, booking_id")
        .eq("payment_intent_id", paymentIntentId)
        .maybeSingle();
      if (!payment) break;

      await db.from("payments").update({
        status: "refunded",
        refund_amount_cents: charge.amount_refunded,
        refunded_at: new Date().toISOString(),
      }).eq("id", payment.id);
      await db.from("bookings")
        .update({ status: "refunded", payment_status: "refunded" })
        .eq("id", payment.booking_id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
