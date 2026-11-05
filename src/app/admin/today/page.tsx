import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { StatusTag } from "@/components/admin/StatusTag";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Today() {
  await requireAdmin();
  const db = supabaseAdmin();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const [{ data: todays }, { data: review }] = await Promise.all([
    db.from("bookings").select("id,reference,starts_at,status,payment_status,internal_notes,services(name_pt,duration_min),clients(id,full_name,whatsapp)")
      .gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString()).order("starts_at"),
    db.from("payments").select("id,amount_cents,provider,created_at,bookings(reference),clients(full_name)")
      .in("status", ["pending", "manual_review"]).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">Hoje</h1>
      <section className="mt-6 rounded-xl border border-navy-deep/10 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl">Agendamentos de hoje</h2>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {(todays ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-navy-deep/5">
                <td className="py-2 font-medium">{new Date(b.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                <td><Link className="underline decoration-gold" href={`/admin/crm/${b.clients?.id}`}>{b.clients?.full_name}</Link></td>
                <td className="text-navy-mid/70">{b.services?.name_pt}</td>
                <td><StatusTag s={b.status} /></td>
                <td className="text-navy-mid/60">{b.internal_notes ?? ""}</td>
              </tr>
            ))}
            {!todays?.length && <tr><td className="py-3 text-navy-mid/60">Nenhum atendimento hoje.</td></tr>}
          </tbody>
        </table>
      </section>
      <section className="mt-6 rounded-xl border border-navy-deep/10 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl">Pagamentos para revisar</h2>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {(review ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-navy-deep/5">
                <td className="py-2">{p.clients?.full_name}</td>
                <td>{p.bookings?.reference}</td>
                <td>AUD ${(p.amount_cents / 100).toFixed(2)}</td>
                <td className="text-navy-mid/60">{p.provider}</td>
              </tr>
            ))}
            {!review?.length && <tr><td className="py-3 text-navy-mid/60">Nada pendente. ✦</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
