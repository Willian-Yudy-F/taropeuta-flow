import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied; // 401 signed-out / 403 non-admin

  const from = req.nextUrl.searchParams.get("from") ?? "2000-01-01";
  const to = req.nextUrl.searchParams.get("to") ?? "2100-01-01";

  const db = supabaseAdmin();
  const { data: payments } = await db.from("payments")
    .select("created_at,paid_at,amount_cents,currency,provider,method,status,transaction_id,bookings(reference,starts_at,services(name_pt)),clients(full_name,email)")
    .gte("created_at", `${from}T00:00:00Z`)
    .lte("created_at", `${to}T23:59:59Z`)
    .order("created_at", { ascending: false });

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["criado_em", "pago_em", "valor", "moeda", "origem", "metodo", "status", "transacao", "referencia", "atendimento_em", "servico", "cliente", "email"];
  const rows = (payments ?? []).map((p: any) => [
    p.created_at, p.paid_at ?? "", (p.amount_cents / 100).toFixed(2), p.currency, p.provider, p.method ?? "",
    p.status, p.transaction_id ?? "", p.bookings?.reference ?? "", p.bookings?.starts_at ?? "",
    p.bookings?.services?.name_pt ?? "", p.clients?.full_name ?? "", p.clients?.email ?? "",
  ].map(esc).join(","));

  const csv = [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="taropeuta-pagamentos-${from}_${to}.csv"`,
    },
  });
}
