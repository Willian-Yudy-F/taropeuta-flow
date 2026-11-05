import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied; // 401 signed-out / 403 non-admin

  const { data } = await supabaseAdmin().from("clients")
    .select("full_name,email,whatsapp,country,city,timezone,date_of_birth,birth_time,birth_city,sun_sign,moon_sign,rising_sign,tags,status,total_spent_cents,created_at");
  const rows = data ?? [];
  const headers = Object.keys(rows[0] ?? { full_name: "" });
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => esc(Array.isArray(r[h]) ? r[h].join("; ") : r[h])).join(","))].join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=taropeuta-clientes.csv` },
  });
}
