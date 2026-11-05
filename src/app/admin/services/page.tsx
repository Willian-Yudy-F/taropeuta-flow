import { requireAdmin, assertAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/* ── server actions ──────────────────────────────────────── */

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function saveService(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const id = String(formData.get("id") || "");
  const payload = {
    name_en: String(formData.get("name_en")),
    name_pt: String(formData.get("name_pt")),
    description_en: String(formData.get("description_en") || "") || null,
    description_pt: String(formData.get("description_pt") || "") || null,
    price_cents: Math.round(Number(formData.get("price")) * 100),
    currency: String(formData.get("currency") || "AUD"),
    duration_min: Number(formData.get("duration_min")),
    questions_included: formData.get("questions_included") ? Number(formData.get("questions_included")) : null,
    delivery_format: String(formData.get("delivery_format")),
    min_notice_hours: Number(formData.get("min_notice_hours") || 24),
    buffer_min: Number(formData.get("buffer_min") || 15),
    max_per_day: Number(formData.get("max_per_day") || 6),
    cover_image_url: String(formData.get("cover_image_url") || "") || null,
    is_active: formData.get("is_active") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
  };
  if (id) {
    await db.from("services").update(payload).eq("id", id);
  } else {
    await db.from("services").insert({ ...payload, slug: slugify(payload.name_en) });
  }
  revalidatePath("/admin/services");
  revalidatePath("/pt"); revalidatePath("/en");
}

async function duplicateService(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const { data: s } = await db.from("services").select("*").eq("id", formData.get("id")).single();
  if (!s) return;
  const { id, created_at, updated_at, ...rest } = s as any;
  await db.from("services").insert({ ...rest, slug: `${rest.slug}-copia-${Date.now().toString(36)}`, name_pt: `${rest.name_pt} (cópia)`, name_en: `${rest.name_en} (copy)`, is_active: false });
  revalidatePath("/admin/services");
}

async function toggleArchive(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const archived = formData.get("archived") === "true";
  await db.from("services").update({ is_archived: !archived, is_active: false }).eq("id", formData.get("id"));
  revalidatePath("/admin/services");
}

/* ── page ────────────────────────────────────────────────── */

function ServiceForm({ s }: { s?: any }) {
  return (
    <form action={saveService} className="grid gap-3 text-sm md:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="grid gap-1">Nome (PT)<input required name="name_pt" defaultValue={s?.name_pt} className="input" /></label>
      <label className="grid gap-1">Name (EN)<input required name="name_en" defaultValue={s?.name_en} className="input" /></label>
      <label className="grid gap-1 md:col-span-1">Descrição (PT)<textarea name="description_pt" defaultValue={s?.description_pt ?? ""} rows={3} className="input" /></label>
      <label className="grid gap-1 md:col-span-1">Description (EN)<textarea name="description_en" defaultValue={s?.description_en ?? ""} rows={3} className="input" /></label>
      <label className="grid gap-1">Preço<input required type="number" step="0.01" min="0" name="price" defaultValue={s ? (s.price_cents / 100).toFixed(2) : ""} className="input" /></label>
      <label className="grid gap-1">Moeda
        <select name="currency" defaultValue={s?.currency ?? "AUD"} className="input">
          <option value="AUD">AUD</option><option value="BRL">BRL (futuro)</option><option value="USD">USD (futuro)</option>
        </select>
      </label>
      <label className="grid gap-1">Duração (min)<input required type="number" min="5" name="duration_min" defaultValue={s?.duration_min ?? 30} className="input" /></label>
      <label className="grid gap-1">Perguntas incluídas<input type="number" min="0" name="questions_included" defaultValue={s?.questions_included ?? ""} className="input" /></label>
      <label className="grid gap-1">Formato de entrega
        <select name="delivery_format" defaultValue={s?.delivery_format ?? "whatsapp_audio"} className="input">
          <option value="whatsapp_audio">Áudio via WhatsApp</option>
          <option value="online_session">Sessão online</option>
        </select>
      </label>
      <label className="grid gap-1">Antecedência mínima (h)<input type="number" min="0" name="min_notice_hours" defaultValue={s?.min_notice_hours ?? 24} className="input" /></label>
      <label className="grid gap-1">Intervalo entre atendimentos (min)<input type="number" min="0" name="buffer_min" defaultValue={s?.buffer_min ?? 15} className="input" /></label>
      <label className="grid gap-1">Máximo por dia<input type="number" min="1" name="max_per_day" defaultValue={s?.max_per_day ?? 6} className="input" /></label>
      <label className="grid gap-1">Imagem de capa (URL)<input name="cover_image_url" defaultValue={s?.cover_image_url ?? ""} className="input" placeholder="https://…" /></label>
      <label className="grid gap-1">Ordem de exibição<input type="number" name="sort_order" defaultValue={s?.sort_order ?? 0} className="input" /></label>
      <label className="flex items-center gap-2 md:col-span-2">
        <input type="checkbox" name="is_active" defaultChecked={s ? s.is_active : true} /> Ativo (visível no site e disponível para agendamento)
      </label>
      <button className="rounded-full bg-navy-deep px-5 py-2 text-offwhite md:col-span-2">{s ? "Salvar alterações" : "Criar serviço"}</button>
    </form>
  );
}

export default async function ServicesAdminPage() {
  await requireAdmin();
  const db = supabaseAdmin();
  const { data: services } = await db.from("services").select("*").order("is_archived").order("sort_order");

  const active = services?.filter((s) => !s.is_archived) ?? [];
  const archived = services?.filter((s) => s.is_archived) ?? [];

  return (
    <div>
      <h1 className="font-display text-3xl">Atendimentos</h1>
      <p className="mt-1 text-sm text-navy-mid/70">Crie, edite, duplique, desative ou arquive serviços. Textos em PT e EN aparecem no site conforme o idioma do visitante.</p>

      <div className="mt-6 space-y-4">
        {active.map((s) => (
          <details key={s.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3">
              <span className="font-display text-lg">{s.name_pt}</span>
              <span className="text-sm text-navy-mid/60">{(s.price_cents / 100).toFixed(2)} {s.currency} · {s.duration_min} min</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{s.is_active ? "Ativo" : "Inativo"}</span>
              <span className="ml-auto flex gap-2 text-sm">
                <form action={duplicateService}><input type="hidden" name="id" value={s.id} /><button className="rounded-full border border-navy-deep/20 px-3 py-1">Duplicar</button></form>
                <form action={toggleArchive}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="archived" value="false" /><button className="rounded-full border border-rose-200 px-3 py-1 text-rose-600">Arquivar</button></form>
              </span>
            </summary>
            <div className="mt-5 border-t border-navy-deep/10 pt-5"><ServiceForm s={s} /></div>
          </details>
        ))}
      </div>

      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Novo serviço</h2>
        <div className="mt-4"><ServiceForm /></div>
      </section>

      {archived.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl text-navy-mid/70">Arquivados</h2>
          <div className="mt-3 space-y-2">
            {archived.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-navy-deep/10 bg-white/60 px-4 py-3 text-sm">
                <span>{s.name_pt}</span>
                <form action={toggleArchive}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="archived" value="true" /><button className="text-navy-mid underline">Restaurar</button></form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
