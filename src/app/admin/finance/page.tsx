import { requireAdmin, assertAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { StatusTag, PaymentTag } from "@/components/admin/StatusTag";
import { revalidatePath } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";

/* ── server actions ──────────────────────────────────────── */

async function markAsPaid(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const bookingId = String(formData.get("booking_id"));
  const { data: b } = await db.from("bookings").select("id,client_id,amount_cents,currency").eq("id", bookingId).single();
  if (!b) return;
  const now = new Date().toISOString();
  await db.from("bookings").update({ status: "paid", payment_status: "succeeded" }).eq("id", b.id);
  // upsert a manual payment record
  const { data: existing } = await db.from("payments").select("id").eq("booking_id", b.id).eq("status", "pending").maybeSingle();
  if (existing) {
    await db.from("payments").update({ status: "succeeded", paid_at: now, provider: "manual", method: String(formData.get("method") || "transfer") }).eq("id", existing.id);
  } else {
    await db.from("payments").insert({ booking_id: b.id, client_id: b.client_id, amount_cents: b.amount_cents, currency: b.currency, provider: "manual", method: String(formData.get("method") || "transfer"), status: "succeeded", paid_at: now });
  }
  // update client aggregates
  const { data: client } = await db.from("clients").select("total_spent_cents").eq("id", b.client_id).single();
  await db.from("clients").update({ total_spent_cents: (client?.total_spent_cents ?? 0) + b.amount_cents, last_booking_at: now }).eq("id", b.client_id);
  revalidatePath("/admin/finance");
}

async function markRefunded(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const bookingId = String(formData.get("booking_id"));
  const now = new Date().toISOString();
  await db.from("bookings").update({ status: "refunded", payment_status: "refunded" }).eq("id", bookingId);
  await db.from("payments").update({ status: "refunded", refunded_at: now, refund_reason: String(formData.get("reason") || "") || null }).eq("booking_id", bookingId).eq("status", "succeeded");
  revalidatePath("/admin/finance");
}

/* ── page ────────────────────────────────────────────────── */

export default async function FinancePage({ searchParams: searchParamsP }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await searchParamsP;
  await requireAdmin();
  const db = supabaseAdmin();
  const { data: settings } = await db.from("settings").select("business_timezone").single();
  const tz = settings?.business_timezone ?? "Australia/Sydney";

  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  const from = searchParams.from ?? `${today.slice(0, 7)}-01`;
  const to = searchParams.to ?? today;

  const [{ data: payments }, { data: pendingBookings }] = await Promise.all([
    db.from("payments")
      .select("id,booking_id,amount_cents,currency,provider,method,status,paid_at,created_at,refund_reason,bookings(reference,starts_at,services(name_pt)),clients(full_name)")
      .gte("created_at", `${from}T00:00:00Z`)
      .lte("created_at", `${to}T23:59:59Z`)
      .order("created_at", { ascending: false }),
    db.from("bookings")
      .select("id,reference,starts_at,amount_cents,currency,status,clients(full_name,email),services(name_pt)")
      .eq("payment_status", "pending")
      .not("status", "in", "(cancelled,refunded)")
      .order("starts_at"),
  ]);

  const succeeded = (payments ?? []).filter((p) => p.status === "succeeded");
  const refunded = (payments ?? []).filter((p) => p.status === "refunded");

  // revenue by currency and by service
  const byCurrency: Record<string, number> = {};
  const byService: Record<string, { total: number; currency: string; count: number }> = {};
  for (const p of succeeded) {
    byCurrency[p.currency] = (byCurrency[p.currency] ?? 0) + p.amount_cents;
    const name = (p as any).bookings?.services?.name_pt ?? "—";
    byService[name] ??= { total: 0, currency: p.currency, count: 0 };
    byService[name].total += p.amount_cents;
    byService[name].count += 1;
  }

  const money = (cents: number, cur: string) => `${(cents / 100).toFixed(2)} ${cur}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl">Financeiro</h1>
        <form className="flex items-end gap-2 text-sm" action="/admin/finance" method="get">
          <label className="grid gap-1">De<input type="date" name="from" defaultValue={from} className="input" /></label>
          <label className="grid gap-1">Até<input type="date" name="to" defaultValue={to} className="input" /></label>
          <button className="rounded-full bg-navy-deep px-4 py-2 text-offwhite">Aplicar</button>
        </form>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-navy-mid/60">Receita no período</p>
          {Object.keys(byCurrency).length
            ? Object.entries(byCurrency).map(([cur, cents]) => <p key={cur} className="mt-1 font-display text-2xl">{money(cents, cur)}</p>)
            : <p className="mt-1 font-display text-2xl">0.00 AUD</p>}
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-navy-mid/60">Pagamentos confirmados</p>
          <p className="mt-1 font-display text-2xl">{succeeded.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-navy-mid/60">Reembolsos no período</p>
          <p className="mt-1 font-display text-2xl">{refunded.length}</p>
        </div>
      </div>

      {/* revenue by service */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Receita por serviço</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-navy-mid/60">
            <tr><th className="py-2">Serviço</th><th>Atendimentos</th><th>Receita</th></tr>
          </thead>
          <tbody>
            {Object.entries(byService).map(([name, v]) => (
              <tr key={name} className="border-t border-navy-deep/5">
                <td className="py-2">{name}</td><td>{v.count}</td><td>{money(v.total, v.currency)}</td>
              </tr>
            ))}
            {!Object.keys(byService).length && <tr><td colSpan={3} className="py-3 text-navy-mid/50">Sem receita no período selecionado.</td></tr>}
          </tbody>
        </table>
      </section>

      {/* pending payments — manual confirmation */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Pagamentos pendentes</h2>
        <p className="mt-1 text-xs text-navy-mid/60">Confirme aqui pagamentos manuais (transferência, PIX futuro, etc.). O agendamento passa a “Pago”.</p>
        <div className="mt-3 space-y-2">
          {pendingBookings?.map((b: any) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-navy-deep/10 px-4 py-3 text-sm">
              <span className="font-mono text-xs text-navy-mid/50">{b.reference}</span>
              <span>{b.clients?.full_name}</span>
              <span className="text-navy-mid/60">{b.services?.name_pt}</span>
              <span>{formatInTimeZone(new Date(b.starts_at), tz, "dd/MM HH:mm")}</span>
              <span className="font-medium">{money(b.amount_cents, b.currency)}</span>
              <StatusTag s={b.status} />
              <form action={markAsPaid} className="ml-auto flex items-center gap-2">
                <input type="hidden" name="booking_id" value={b.id} />
                <select name="method" className="rounded-lg border border-navy-deep/20 px-2 py-1">
                  <option value="transfer">Transferência</option>
                  <option value="cash">Dinheiro</option>
                  <option value="other">Outro</option>
                </select>
                <button className="rounded-full bg-emerald-600 px-4 py-1.5 text-white">Marcar como pago</button>
              </form>
            </div>
          ))}
          {!pendingBookings?.length && <p className="text-sm text-navy-mid/50">Nenhum pagamento pendente. ✦</p>}
        </div>
      </section>

      {/* payment history */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Histórico de pagamentos</h2>
          <a href={`/admin/finance/export?from=${from}&to=${to}`} className="rounded-full border border-navy-deep/20 px-4 py-1.5 text-sm">Exportar CSV</a>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-navy-mid/60">
            <tr><th className="py-2">Data</th><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Origem</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {payments?.map((p: any) => (
              <tr key={p.id} className="border-t border-navy-deep/5">
                <td className="py-2">{formatInTimeZone(new Date(p.paid_at ?? p.created_at), tz, "dd/MM/yy HH:mm")}</td>
                <td>{p.clients?.full_name}</td>
                <td>{p.bookings?.services?.name_pt}</td>
                <td>{money(p.amount_cents, p.currency)}</td>
                <td className="capitalize">{p.provider}{p.method ? ` · ${p.method}` : ""}</td>
                <td><PaymentTag s={p.status} /></td>
                <td>
                  {p.status === "succeeded" && p.provider === "manual" && (
                    <form action={markRefunded}>
                      <input type="hidden" name="booking_id" value={p.booking_id} />
                      <input type="hidden" name="reason" value="Reembolso manual" />
                      <button className="text-xs text-rose-600 underline">Reembolsar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!payments?.length && <tr><td colSpan={7} className="py-3 text-navy-mid/50">Nenhum pagamento no período.</td></tr>}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-navy-mid/50">Reembolsos via Stripe devem ser feitos no painel da Stripe — o webhook atualiza o status aqui automaticamente. Para pagamentos manuais, altere o status do agendamento na Agenda.</p>
      </section>
    </div>
  );
}
