import Link from "next/link";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CRM({ searchParams: searchParamsP }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  const searchParams = await searchParamsP;
  await requireAdmin();
  const db = supabaseAdmin();
  let query = db.from("clients").select("id,full_name,email,whatsapp,country,tags,status,total_spent_cents,last_booking_at").order("created_at", { ascending: false }).limit(200);
  if (searchParams.q) query = query.or(`full_name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%`);
  if (searchParams.tag) query = query.contains("tags", [searchParams.tag]);
  const { data: clients } = await query;

  const TAGS = ["Nova cliente","Retornante","VIP","Relacionamento","Carreira","Astrologia","Tarot","Austrália","Brasil","Acompanhar"];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl">CRM</h1>
        <a href="/admin/crm/export" className="rounded-full border border-navy-deep/20 px-4 py-2 text-sm">Exportar CSV</a>
      </div>
      <form className="mt-5 flex gap-2">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Buscar por nome ou e-mail…" className="w-full max-w-md rounded-lg border border-navy-deep/15 bg-white px-4 py-2.5 text-sm" />
        <button className="rounded-lg bg-navy-deep px-5 text-sm text-offwhite">Buscar</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {TAGS.map((t) => (
          <Link key={t} href={`/admin/crm?tag=${encodeURIComponent(t)}`}
            className={`rounded-full border px-3 py-1 ${searchParams.tag === t ? "border-gold bg-gold/20" : "border-navy-deep/15"}`}>{t}</Link>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-navy-deep/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-navy-deep/5 text-left text-xs uppercase tracking-wider text-navy-mid">
            <tr><th className="p-3">Cliente</th><th>Contato</th><th>País</th><th>Tags</th><th>Total gasto</th><th>Último atendimento</th></tr>
          </thead>
          <tbody>
            {(clients ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-navy-deep/5 hover:bg-navy-deep/[0.03]">
                <td className="p-3"><Link className="font-medium underline decoration-gold" href={`/admin/crm/${c.id}`}>{c.full_name}</Link></td>
                <td className="text-navy-mid/80">{c.email}</td>
                <td>{c.country ?? "—"}</td>
                <td className="space-x-1">{(c.tags ?? []).map((t: string) => <span key={t} className="rounded-full bg-beige/50 px-2 py-0.5 text-xs">{t}</span>)}</td>
                <td>AUD ${(c.total_spent_cents / 100).toFixed(0)}</td>
                <td className="text-navy-mid/70">{c.last_booking_at ? new Date(c.last_booking_at).toLocaleDateString("pt-BR") : "—"}</td>
              </tr>
            ))}
            {!clients?.length && <tr><td className="p-4 text-navy-mid/60">Nenhuma cliente encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
