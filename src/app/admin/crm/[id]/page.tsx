import { requireAdmin, assertAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { StatusTag } from "@/components/admin/StatusTag";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientProfile({ params: paramsP }: { params: Promise<{ id: string }> }) {
  const params = await paramsP;
  await requireAdmin();
  const db = supabaseAdmin();
  const { data: c } = await db.from("clients").select("*").eq("id", params.id).single();
  if (!c) notFound();
  const [{ data: bookings }, { data: payments }] = await Promise.all([
    db.from("bookings").select("reference,starts_at,status,amount_cents,currency,form_responses,services(name_pt)").eq("client_id", c.id).order("starts_at", { ascending: false }),
    db.from("payments").select("amount_cents,currency,provider,status,paid_at,created_at").eq("client_id", c.id).order("created_at", { ascending: false }),
  ]);

  async function saveAstro(formData: FormData) {
    "use server";
  await assertAdmin();
    const db = supabaseAdmin();
    await db.from("clients").update({
      sun_sign: String(formData.get("sun_sign") || "") || null,
      moon_sign: String(formData.get("moon_sign") || "") || null,
      rising_sign: String(formData.get("rising_sign") || "") || null,
      internal_notes: String(formData.get("internal_notes") || "") || null,
      tags: String(formData.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean),
    }).eq("id", formData.get("id"));
    revalidatePath(`/admin/crm/${formData.get("id")}`);
  }

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div><p className="text-xs uppercase tracking-wider text-navy-mid/60">{label}</p><p className="mt-0.5 text-sm">{value ?? "—"}</p></div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{c.full_name}</h1>
        <a href={`/admin/crm/${c.id}/export`} className="rounded-full border border-navy-deep/20 px-4 py-1.5 text-sm">Exportar dados (JSON)</a>
      </div>
      <p className="mt-1 text-sm text-navy-mid/70">{c.email} · {c.whatsapp ?? "sem WhatsApp"}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-navy-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl">Dados</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="País" value={c.country} /><Field label="Cidade" value={c.city} />
            <Field label="Fuso horário" value={c.timezone} /><Field label="Consentimento" value={c.consent_storage ? `Sim (${c.consent_at ? new Date(c.consent_at).toLocaleDateString("pt-BR") : ""})` : "Não"} />
            <Field label="Total gasto" value={`AUD $${(c.total_spent_cents / 100).toFixed(2)}`} />
            <Field label="Cliente desde" value={new Date(c.created_at).toLocaleDateString("pt-BR")} />
          </div>
        </section>

        <section className="rounded-xl border border-gold/40 bg-[#FBF7F2] p-6 shadow-sm">
          <h2 className="font-display text-xl">Perfil astrológico</h2>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Field label="Nascimento" value={c.date_of_birth ? new Date(c.date_of_birth + "T00:00:00").toLocaleDateString("pt-BR") : "—"} />
            <Field label="Horário" value={c.birth_time} /><Field label="Cidade natal" value={c.birth_city} />
          </div>
          <form action={saveAstro} className="mt-5 grid grid-cols-3 gap-3">
            <input type="hidden" name="id" value={c.id} />
            {[["sun_sign", "Sol"], ["moon_sign", "Lua"], ["rising_sign", "Ascendente"]].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs uppercase tracking-wider text-navy-mid/60">{label}</label>
                <input name={k} defaultValue={(c as any)[k] ?? ""} className="mt-1 w-full rounded-lg border border-navy-deep/15 px-3 py-2 text-sm" />
              </div>
            ))}
            <div className="col-span-3">
              <label className="text-xs uppercase tracking-wider text-navy-mid/60">Tags (separadas por vírgula)</label>
              <input name="tags" defaultValue={(c.tags ?? []).join(", ")} className="mt-1 w-full rounded-lg border border-navy-deep/15 px-3 py-2 text-sm" />
            </div>
            <div className="col-span-3">
              <label className="text-xs uppercase tracking-wider text-navy-mid/60">Notas internas</label>
              <textarea name="internal_notes" defaultValue={c.internal_notes ?? ""} rows={3} className="mt-1 w-full rounded-lg border border-navy-deep/15 px-3 py-2 text-sm" />
            </div>
            <button className="col-span-3 justify-self-start rounded-full bg-navy-deep px-5 py-2 text-sm text-offwhite">Salvar</button>
          </form>
          <p className="mt-3 text-[11px] text-navy-mid/60">Lua e Ascendente exigem cálculo de efemérides — preencha manualmente ou integre uma biblioteca astrológica verificada no futuro. O Sol é calculado automaticamente pela data de nascimento.</p>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-navy-deep/10 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl">Histórico de agendamentos</h2>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {(bookings ?? []).map((b: any) => (
              <tr key={b.reference} className="border-t border-navy-deep/5">
                <td className="py-2">{new Date(b.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{b.services?.name_pt}</td>
                <td>{b.currency} ${(b.amount_cents / 100).toFixed(0)}</td>
                <td><StatusTag s={b.status} /></td>
                <td className="max-w-xs truncate text-navy-mid/60">{b.form_responses?.topic}</td>
              </tr>
            ))}
            {!bookings?.length && <tr><td className="py-3 text-navy-mid/60">Sem agendamentos.</td></tr>}
          </tbody>
        </table>
        <h2 className="mt-8 font-display text-xl">Pagamentos</h2>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {(payments ?? []).map((p: any, i: number) => (
              <tr key={i} className="border-t border-navy-deep/5">
                <td className="py-2">{new Date(p.paid_at ?? p.created_at).toLocaleDateString("pt-BR")}</td>
                <td>{p.currency} ${(p.amount_cents / 100).toFixed(2)}</td>
                <td className="text-navy-mid/60">{p.provider}</td>
                <td>{p.status}</td>
              </tr>
            ))}
            {!payments?.length && <tr><td className="py-3 text-navy-mid/60">Sem pagamentos.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
