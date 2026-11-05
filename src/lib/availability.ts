import { addMinutes, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { supabaseAdmin } from "@/lib/supabase/server";
import { releaseExpiredHolds } from "@/lib/holds";

export type Slot = { startsAtUtc: string; label: string };

/**
 * Generates available slots for a service on a given date (business timezone),
 * applying: weekly availability rules, min-notice, buffer time, max/day,
 * blocked slots, and existing non-cancelled bookings.
 */
export async function getAvailableSlots(serviceId: string, dateISO: string): Promise<{ slots: Slot[]; businessTz: string }> {
  const db = supabaseAdmin();

  // Free slots held by abandoned/expired Stripe checkouts before computing.
  await releaseExpiredHolds(db);

  const [{ data: settings }, { data: service }] = await Promise.all([
    db.from("settings").select("*").single(),
    db.from("services").select("*").eq("id", serviceId).single(),
  ]);
  if (!service || !settings) return { slots: [], businessTz: settings?.business_timezone ?? "Australia/Sydney" };

  const tz = settings.business_timezone as string;
  const weekday = toZonedTime(fromZonedTime(`${dateISO}T12:00:00`, tz), tz).getDay();

  const { data: rules } = await db
    .from("availability_rules")
    .select("*")
    .eq("weekday", weekday)
    .eq("is_active", true);
  if (!rules?.length) return { slots: [], businessTz: tz };

  const dayStartUtc = fromZonedTime(`${dateISO}T00:00:00`, tz);
  const dayEndUtc = fromZonedTime(`${dateISO}T23:59:59`, tz);

  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    db.from("bookings").select("starts_at, ends_at, status")
      .gte("starts_at", dayStartUtc.toISOString()).lte("starts_at", dayEndUtc.toISOString())
      .not("status", "in", "(cancelled,refunded)"),
    db.from("blocked_slots").select("starts_at, ends_at")
      .lte("starts_at", dayEndUtc.toISOString()).gte("ends_at", dayStartUtc.toISOString()),
  ]);

  if ((bookings?.length ?? 0) >= service.max_per_day) return { slots: [], businessTz: tz };

  const stepMin = service.duration_min + service.buffer_min;
  const minStart = addMinutes(new Date(), service.min_notice_hours * 60);
  const overlaps = (aS: Date, aE: Date, bS: Date, bE: Date) => aS < bE && bS < aE;

  const slots: Slot[] = [];
  for (const rule of rules) {
    let cursor = fromZonedTime(`${dateISO}T${rule.start_time}`, tz);
    const windowEnd = fromZonedTime(`${dateISO}T${rule.end_time}`, tz);
    while (addMinutes(cursor, service.duration_min) <= windowEnd) {
      const end = addMinutes(cursor, service.duration_min);
      const clash =
        (bookings ?? []).some((b) => overlaps(cursor, end, new Date(b.starts_at), new Date(b.ends_at))) ||
        (blocks ?? []).some((b) => overlaps(cursor, end, new Date(b.starts_at), new Date(b.ends_at)));
      if (cursor >= minStart && !clash) {
        slots.push({ startsAtUtc: cursor.toISOString(), label: format(toZonedTime(cursor, tz), "HH:mm") });
      }
      cursor = addMinutes(cursor, stepMin);
    }
  }
  return { slots, businessTz: tz };
}
