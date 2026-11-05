import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Releases expired temporary holds: pending_payment bookings whose
 * `expires_at` has passed (Stripe checkout abandoned/never completed).
 * Cancelling them frees the slot for the unique/exclusion constraints
 * and for the availability engine. The Stripe `checkout.session.expired`
 * webhook does the same thing pro-actively; this is the lazy fallback
 * so the system self-heals even if a webhook is missed.
 */
export async function releaseExpiredHolds(db: SupabaseClient) {
  const nowIso = new Date().toISOString();
  const { data: expired } = await db
    .from("bookings")
    .select("id")
    .eq("status", "pending_payment")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  if (!expired?.length) return;
  const ids = expired.map((b) => b.id);
  await db.from("bookings")
    .update({ status: "cancelled", cancellation_reason: "checkout_expired" })
    .in("id", ids);
  await db.from("payments")
    .update({ status: "failed" })
    .in("booking_id", ids)
    .eq("status", "pending");
}
