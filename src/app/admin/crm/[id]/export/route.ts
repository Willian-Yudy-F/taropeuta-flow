import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

/**
 * Exports ALL data held about a single client (LGPD/GDPR data-portability
 * requests). Admin-only — a non-admin authenticated user receives 403.
 */
export async function GET(_req: Request, { params: paramsP }: { params: Promise<{ id: string }> }) {
  const params = await paramsP;
  const denied = await requireAdminApi();
  if (denied) return denied;

  const db = supabaseAdmin();
  const [{ data: client }, { data: bookings }, { data: payments }] = await Promise.all([
    db.from("clients").select("*").eq("id", params.id).single(),
    db.from("bookings").select("reference,starts_at,ends_at,status,payment_status,amount_cents,currency,language,form_responses,birth_snapshot,created_at").eq("client_id", params.id).order("starts_at"),
    db.from("payments").select("amount_cents,currency,provider,method,status,paid_at,refund_amount_cents,refunded_at,created_at").eq("client_id", params.id).order("created_at"),
  ]);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = { exported_at: new Date().toISOString(), client, bookings: bookings ?? [], payments: payments ?? [] };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="taropeuta-cliente-${params.id}.json"`,
    },
  });
}
