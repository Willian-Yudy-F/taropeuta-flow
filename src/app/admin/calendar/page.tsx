import { requireAdmin, assertAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { StatusTag } from "@/components/admin/StatusTag";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

const TZ_FALLBACK = "Australia/Sydney";

/* ── server actions ──────────────────────────────────────── */

async function createManualBooking(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const { data: settings } = await db.from("settings").select("business_timezone").single();
  const tz = settings?.business_timezone ?? TZ_FALLBACK;

  const serviceId = String(formData.get("service_id"));
  const { data: service } = await db.from("services").select("*").eq("id", serviceId).single();
  if (!service) return;

  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  const startsAt = fromZonedTime(`${date}T${time}:00`, tz);
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);

  // find-or-create client by email
  const email = String(formData.get("email")).trim().toLowerCase();
  const fullName = String(formData.get("full_name")).trim();
  let { data: client } = await db.from("clients").select("id").ilike("email", email).maybeSingle();
  if (!client) {
    const { data: created } = await db.from("clients")
      .insert({ full_name: fullName, email, whatsapp: String(formData.get("whatsapp") || "") || null, consent_storage: true, consent_at: new Date().toISOString() })
      .select("id").single();
    client = created;
  }
  if (!client) return;

  const { error } = await db.from("bookings").insert({
    client_id: client.id,
    service_id: service.id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    business_timezone: tz,
    status: String(formData.get("status") || "confirmed"),
    payment_status: formData.get("status") === "pending_payment" ? "pending" : "succeeded",
    amount_cents: service.price_cents,
    currency: service.currency,
    form_responses: { source: "manual_admin" },
    internal_notes: String(formData.get("notes") || "") || null,
    language: "pt",
  });
  revalidatePath("/admin/calendar");
  if (error?.code === "23505") redirect("/admin/calendar?error=slot_taken");
}

async function rescheduleBooking(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const id = String(formData.get("booking_id"));
  const { data: b } = await db.from("bookings").select("service_id,business_timezone,services(duration_min)").eq("id", id).single();
  if (!b) return;
  const tz = b.business_timezone ?? TZ_FALLBACK;
  const duration = (b as any).services?.duration_min ?? 30;
  const startsAt = fromZonedTime(`${formData.get("date")}T${formData.get("time")}:00`, tz);
  const { error } = await db.from("bookings").update({
    starts_at: startsAt.toISOString(),
    ends_at: new Date(startsAt.getTime() + duration * 60_000).toISOString(),
  }).eq("id", id);
  revalidatePath("/admin/calendar");
  if (error?.code === "23505") redirect("/admin/calendar?error=slot_taken");
}

async function updateStatus(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("bookings").update({ status: String(formData.get("status")) }).eq("id", formData.get("booking_id"));
  revalidatePath("/admin/calendar");
}

async function addBlockedSlot(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const { data: settings } = await db.from("settings").select("business_timezone").single();
  const tz = settings?.business_timezone ?? TZ_FALLBACK;
  const date = String(formData.get("date"));
  const from = String(formData.get("from") || "00:00");
  const to = String(formData.get("to") || "23:59");
  await db.from("blocked_slots").insert({
    starts_at: fromZonedTime(`${date}T${from}:00`, tz).toISOString(),
    ends_at: fromZonedTime(`${date}T${to}:00`, tz).toISOString(),
    reason: String(formData.get("reason") || "") || null,
  });
  revalidatePath("/admin/calendar");
}

async function removeBlockedSlot(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("blocked_slots").delete().eq("id", formData.get("id"));
  revalidatePath("/admin/calendar");
}

/* ── page ────────────────────────────────────────────────── */

export default async function CalendarPage({ searchParams: searchParamsP }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await searchParamsP;
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: settings } = await db.from("settings").select("business_timezone").single();
  const tz = settings?.business_timezone ?? TZ_FALLBACK;

  const view = (searchParams.view === "week" || searchParams.view === "month") ? searchParams.view : "day";
  const anchorStr = searchParams.date ?? formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  const anchor = new Date(`${anchorStr}T12:00:00`);

  let rangeStart: Date, rangeEnd: Date, rangeLabel: string;
  if (view === "day") {
    rangeStart = fromZonedTime(`${anchorStr}T00:00:00`, tz);
    rangeEnd = fromZonedTime(`${anchorStr}T23:59:59`, tz);
    rangeLabel = formatInTimeZone(rangeStart, tz, "dd/MM/yyyy");
  } else if (view === "week") {
    const ws = startOfWeek(anchor, { weekStartsOn: 1 });
    const we = endOfWeek(anchor, { weekStartsOn: 1 });
    rangeStart = fromZonedTime(`${ws.toISOString().slice(0, 10)}T00:00:00`, tz);
    rangeEnd = fromZonedTime(`${we.toISOString().slice(0, 10)}T23:59:59`, tz);
    rangeLabel = `${formatInTimeZone(rangeStart, tz, "dd/MM")} – ${formatInTimeZone(rangeEnd, tz, "dd/MM/yyyy")}`;
  } else {
    const ms = startOfMonth(anchor), me = endOfMonth(anchor);
    rangeStart = fromZonedTime(`${ms.toISOString().slice(0, 10)}T00:00:00`, tz);
    rangeEnd = fromZonedTime(`${me.toISOString().slice(0, 10)}T23:59:59`, tz);
    rangeLabel = formatInTimeZone(rangeStart, tz, "MM/yyyy");
  }

  const step = view === "day" ? 1 : view === "week" ? 7 : 30;
  const prev = addDays(anchor, -step).toISOString().slice(0, 10);
  const next = addDays(anchor, step).toISOString().slice(0, 10);

  let q = db.from("bookings")
    .select("id,reference,starts_at,status,payment_status,amount_cents,currency,clients(full_name,email),services(id,name_pt)")
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", rangeEnd.toISOString())
    .order("starts_at");
  if (searchParams.status) q = q.eq("status", searchParams.status);
  if (searchParams.service) q = q.eq("service_id", searchParams.service);

  const [{ data: bookings }, { data: services }, { data: blocked }] = await Promise.all([
    q,
    db.from("services").select("id,name_pt,is_archived").eq("is_archived", false).order("sort_order"),
    db.from("blocked_slots").select("*").gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view, date: anchorStr, status: searchParams.status, service: searchParams.service, ...over };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/admin/calendar?${p.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Agenda</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={qs({ date: prev })} className="rounded-full border border-navy-deep/20 px-3 py-1.5">←</Link>
          <span className="min-w-36 text-center font-medium">{rangeLabel}</span>
          <Link href={qs({ date: next })} className="rounded-full border border-navy-deep/20 px-3 py-1.5">→</Link>
        </div>
      </div>

      {searchParams.error === "slot_taken" && (
        <p className="mt-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">Esse horário já está ocupado por outro agendamento ativo.</p>
      )}

      {/* view + filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {(["day", "week", "month"] as const).map((v) => (
          <Link key={v} href={qs({ view: v })}
            className={`rounded-full px-3 py-1.5 ${view === v ? "bg-navy-deep text-offwhite" : "border border-navy-deep/20"}`}>
            {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
          </Link>
        ))}
        <span className="mx-2 h-5 w-px bg-navy-deep/10" />
        <form className="flex flex-wrap items-center gap-2" action="/admin/calendar" method="get">
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="date" value={anchorStr} />
          <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-lg border border-navy-deep/20 bg-white px-2 py-1.5">
            <option value="">Todos os status</option>
            {["pending_payment", "paid", "confirmed", "completed", "cancelled", "refunded", "no_show"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="service" defaultValue={searchParams.service ?? ""} className="rounded-lg border border-navy-deep/20 bg-white px-2 py-1.5">
            <option value="">Todos os serviços</option>
            {services?.map((s) => <option key={s.id} value={s.id}>{s.name_pt}</option>)}
          </select>
          <button className="rounded-full bg-navy-deep px-3 py-1.5 text-offwhite">Filtrar</button>
        </form>
      </div>

      {/* bookings in range */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Agendamentos</h2>
        {!bookings?.length && <p className="mt-3 text-sm text-navy-mid/60">Nenhum agendamento neste período.</p>}
        <div className="mt-3 space-y-3">
          {bookings?.map((b: any) => (
            <details key={b.id} className="rounded-xl border border-navy-deep/10 p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">{formatInTimeZone(new Date(b.starts_at), tz, "dd/MM HH:mm")}</span>
                <span>{b.clients?.full_name}</span>
                <span className="text-navy-mid/60">{b.services?.name_pt}</span>
                <StatusTag s={b.status} />
                <span className="ml-auto font-mono text-xs text-navy-mid/50">{b.reference}</span>
              </summary>
              <div className="mt-4 grid gap-4 border-t border-navy-deep/10 pt-4 md:grid-cols-3">
                <form action={rescheduleBooking} className="space-y-2 text-sm">
                  <input type="hidden" name="booking_id" value={b.id} />
                  <p className="font-medium">Reagendar</p>
                  <input required type="date" name="date" className="input" defaultValue={formatInTimeZone(new Date(b.starts_at), tz, "yyyy-MM-dd")} />
                  <input required type="time" name="time" className="input" defaultValue={formatInTimeZone(new Date(b.starts_at), tz, "HH:mm")} />
                  <button className="rounded-full bg-navy-deep px-4 py-1.5 text-offwhite">Salvar novo horário</button>
                </form>
                <form action={updateStatus} className="space-y-2 text-sm">
                  <input type="hidden" name="booking_id" value={b.id} />
                  <p className="font-medium">Status</p>
                  <select name="status" defaultValue={b.status} className="input">
                    {["pending_payment", "paid", "confirmed", "completed", "cancelled", "refunded", "no_show"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="rounded-full border border-navy-deep/30 px-4 py-1.5">Atualizar status</button>
                </form>
                <div className="text-sm">
                  <p className="font-medium">Cliente</p>
                  <p className="mt-1 text-navy-mid/70">{b.clients?.email}</p>
                  <p className="mt-1">{(b.amount_cents / 100).toFixed(2)} {b.currency}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* manual booking */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl">Agendamento manual</h2>
          <p className="mt-1 text-xs text-navy-mid/60">Horários no fuso do negócio ({tz}).</p>
          <form action={createManualBooking} className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <input required name="full_name" placeholder="Nome completo" className="input md:col-span-2" />
            <input required type="email" name="email" placeholder="E-mail" className="input" />
            <input name="whatsapp" placeholder="WhatsApp (opcional)" className="input" />
            <select required name="service_id" className="input md:col-span-2">
              <option value="">Selecionar serviço…</option>
              {services?.map((s) => <option key={s.id} value={s.id}>{s.name_pt}</option>)}
            </select>
            <input required type="date" name="date" className="input" />
            <input required type="time" name="time" className="input" />
            <select name="status" defaultValue="confirmed" className="input">
              <option value="confirmed">Confirmado (pago fora do sistema)</option>
              <option value="pending_payment">Aguardando pagamento</option>
            </select>
            <input name="notes" placeholder="Nota interna (opcional)" className="input" />
            <button className="rounded-full bg-navy-deep px-5 py-2 text-offwhite md:col-span-2">Criar agendamento</button>
          </form>
        </section>

        {/* blocked slots */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl">Bloqueios de agenda</h2>
          <p className="mt-1 text-xs text-navy-mid/60">Feriados, folgas e horários indisponíveis.</p>
          <form action={addBlockedSlot} className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <input required type="date" name="date" className="input col-span-2 md:col-span-1" />
            <input type="time" name="from" defaultValue="00:00" className="input" />
            <input type="time" name="to" defaultValue="23:59" className="input" />
            <input name="reason" placeholder="Motivo" className="input col-span-2 md:col-span-1" />
            <button className="col-span-2 rounded-full bg-navy-deep px-4 py-2 text-offwhite md:col-span-4">Bloquear</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {blocked?.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-navy-deep/10 px-3 py-2">
                <span>{formatInTimeZone(new Date(s.starts_at), tz, "dd/MM HH:mm")} → {formatInTimeZone(new Date(s.ends_at), tz, "dd/MM HH:mm")} {s.reason ? `· ${s.reason}` : ""}</span>
                <form action={removeBlockedSlot}><input type="hidden" name="id" value={s.id} /><button className="text-rose-600">Remover</button></form>
              </li>
            ))}
            {!blocked?.length && <li className="text-navy-mid/50">Nenhum bloqueio futuro.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
