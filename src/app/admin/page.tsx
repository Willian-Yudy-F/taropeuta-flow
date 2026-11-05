import Link from "next/link";
import { StatusTag } from "@/components/admin/StatusTag";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const money = (c: number) => `AUD $${(c / 100).toFixed(2)}`;

export default async function Overview() {
  await requireAdmin();
  const db = supabaseAdmin();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [payments, bookings, upcoming, clients, topServices] = await Promise.all([
    db.from("payments").select("amount_cents,status,paid_at").gte("created_at", monthStart.toISOString()),
    db.from("bookings").select("id,status").gte("created_at", monthStart.toISOString()),
    db.from("bookings").select("reference,starts_at,status,services(name_pt),clients(full_name)").gte("starts_at", new Date().toISOString()).order("starts_at").limit(8),
    db.from("clients").select("id,last_booking_at"),
    db.from("bookings").select("service_id,services(name_pt)").not("status", "in", "(cancelled,refunded)"),
  ]).then((rs) => rs.map((r) => r.data ?? []));

  const revenue = (payments as any[]).filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount_cents, 0);
  const pending = (payments as any[]).filter((p) => p.status === "pending").length;
  const returning = (clients as any[]).filter((c) => c.last_booking_at).length;
  const counts: Record<string, number> = {};
  for (const b of topServices as any[]) { const n = b.services?.name_pt ?? "—"; counts[n] = (counts[n] ?? 0) + 1; }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const Card = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-navy-deep/10 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-navy-mid/70">{label}</p>
      <p className="mt-2 font-display text-3xl text-navy-deep">{value}</p>
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-3xl">Visão geral</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Receita no mês" value={money(revenue)} />
        <Card label="Agendamentos no mês" value={String((bookings as any[]).length)} />
        <Card label="Pagamentos pendentes" value={String(pending)} />
        <Card label="Clientes (retornantes)" value={`${(clients as any[]).length} (${returning})`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-navy-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl">Próximos agendamentos</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {(upcoming as any[]).map((b) => (
                <tr key={b.reference} className="border-t border-navy-deep/5">
                  <td className="py-2">{new Date(b.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>{b.clients?.full_name}</td>
                  <td className="text-navy-mid/70">{b.services?.name_pt}</td>
                  <td><StatusTag s={b.status} /></td>
                </tr>
              ))}
              {(upcoming as any[]).length === 0 && <tr><td className="py-3 text-navy-mid/60">Nenhum agendamento futuro.</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="rounded-xl border border-navy-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl">Atendimentos mais agendados</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {top.map(([name, n]) => <li key={name} className="flex justify-between border-t border-navy-deep/5 py-2"><span>{name}</span><span className="text-gold">{n}</span></li>)}
          </ul>
          <h2 className="mt-8 font-display text-xl">Ações rápidas</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link className="rounded-full bg-navy-deep px-4 py-2 text-offwhite" href="/admin/calendar">+ Agendamento manual</Link>
            <Link className="rounded-full border border-navy-deep/20 px-4 py-2" href="/admin/crm">Buscar cliente</Link>
            <Link className="rounded-full border border-navy-deep/20 px-4 py-2" href="/admin/finance">Revisar pagamentos</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

