import { requireAdmin, assertAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/* ── server actions ──────────────────────────────────────── */

function revalidatePublic() {
  ["/pt", "/en", "/pt/about", "/en/about", "/pt/services", "/en/services"].forEach((p) => revalidatePath(p));
  revalidatePath("/[lang]/policies/[slug]", "page");
}

async function saveBlock(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("content_blocks").update({
    value_pt: String(formData.get("value_pt") || "") || null,
    value_en: String(formData.get("value_en") || "") || null,
  }).eq("id", formData.get("id"));
  revalidatePath("/admin/content"); revalidatePublic();
}

async function saveFaq(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const id = String(formData.get("id") || "");
  const payload = {
    question_pt: String(formData.get("question_pt")), answer_pt: String(formData.get("answer_pt")),
    question_en: String(formData.get("question_en")), answer_en: String(formData.get("answer_en")),
    is_published: formData.get("is_published") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
  };
  if (id) await db.from("faqs").update(payload).eq("id", id);
  else await db.from("faqs").insert(payload);
  revalidatePath("/admin/content"); revalidatePublic();
}

async function deleteFaq(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("faqs").delete().eq("id", formData.get("id"));
  revalidatePath("/admin/content"); revalidatePublic();
}

async function saveTestimonial(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const id = String(formData.get("id") || "");
  const payload = {
    display_name: String(formData.get("display_name")),
    text_pt: String(formData.get("text_pt") || "") || null,
    text_en: String(formData.get("text_en") || "") || null,
    permission_granted: formData.get("permission_granted") === "on",
    is_published: formData.get("is_published") === "on" && formData.get("permission_granted") === "on",
    sort_order: Number(formData.get("sort_order") || 0),
  };
  if (id) await db.from("testimonials").update(payload).eq("id", id);
  else await db.from("testimonials").insert(payload);
  revalidatePath("/admin/content"); revalidatePublic();
}

async function deleteTestimonial(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("testimonials").delete().eq("id", formData.get("id"));
  revalidatePath("/admin/content"); revalidatePublic();
}

async function saveTemplate(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("email_templates").update({
    subject_pt: String(formData.get("subject_pt")), body_pt: String(formData.get("body_pt")),
    subject_en: String(formData.get("subject_en")), body_en: String(formData.get("body_en")),
    reminder_hours_before: formData.get("reminder_hours_before") ? Number(formData.get("reminder_hours_before")) : null,
    is_active: formData.get("is_active") === "on",
  }).eq("id", formData.get("id"));
  revalidatePath("/admin/content");
}

/* ── page ────────────────────────────────────────────────── */

const GROUP_LABELS: Record<string, string> = {
  home: "Página inicial", about: "Sobre", legal: "Páginas legais", footer: "Rodapé", seo: "SEO",
};

export default async function ContentAdminPage() {
  await requireAdmin();
  const db = supabaseAdmin();
  const [{ data: blocks }, { data: faqs }, { data: testimonials }, { data: templates }, { data: journal }] = await Promise.all([
    db.from("content_blocks").select("*").order("group_name").order("key"),
    db.from("faqs").select("*").order("sort_order"),
    db.from("testimonials").select("*").order("sort_order"),
    db.from("email_templates").select("*").order("key"),
    db.from("journal_modules").select("*").limit(1).maybeSingle(),
  ]);

  const groups: Record<string, any[]> = {};
  for (const b of blocks ?? []) (groups[b.group_name ?? "outros"] ??= []).push(b);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Conteúdo</h1>
        <p className="mt-1 text-sm text-navy-mid/70">Textos do site, FAQs, depoimentos, e-mails e páginas legais — sempre em PT e EN.</p>
      </div>

      {/* content blocks by group */}
      {Object.entries(groups).map(([group, items]) => (
        <section key={group} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl">{GROUP_LABELS[group] ?? group}</h2>
          <div className="mt-3 space-y-3">
            {items.map((b) => (
              <details key={b.id} className="rounded-xl border border-navy-deep/10 p-4">
                <summary className="cursor-pointer font-mono text-xs text-navy-mid/70">{b.key}</summary>
                <form action={saveBlock} className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <input type="hidden" name="id" value={b.id} />
                  <label className="grid gap-1">Português<textarea name="value_pt" defaultValue={b.value_pt ?? ""} rows={5} className="input" /></label>
                  <label className="grid gap-1">English<textarea name="value_en" defaultValue={b.value_en ?? ""} rows={5} className="input" /></label>
                  <button className="rounded-full bg-navy-deep px-4 py-1.5 text-offwhite md:col-span-2">Salvar</button>
                </form>
              </details>
            ))}
          </div>
        </section>
      ))}

      {/* FAQs */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Perguntas frequentes</h2>
        <div className="mt-3 space-y-3">
          {faqs?.map((f) => (
            <details key={f.id} className="rounded-xl border border-navy-deep/10 p-4">
              <summary className="cursor-pointer text-sm">{f.question_pt} {!f.is_published && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">rascunho</span>}</summary>
              <form action={saveFaq} className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <input type="hidden" name="id" value={f.id} />
                <label className="grid gap-1">Pergunta (PT)<input name="question_pt" defaultValue={f.question_pt} className="input" /></label>
                <label className="grid gap-1">Question (EN)<input name="question_en" defaultValue={f.question_en} className="input" /></label>
                <label className="grid gap-1">Resposta (PT)<textarea name="answer_pt" defaultValue={f.answer_pt} rows={3} className="input" /></label>
                <label className="grid gap-1">Answer (EN)<textarea name="answer_en" defaultValue={f.answer_en} rows={3} className="input" /></label>
                <label className="grid gap-1">Ordem<input type="number" name="sort_order" defaultValue={f.sort_order} className="input" /></label>
                <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={f.is_published} /> Publicado</label>
                <div className="flex gap-2 md:col-span-2">
                  <button className="rounded-full bg-navy-deep px-4 py-1.5 text-offwhite">Salvar</button>
                </div>
              </form>
              <form action={deleteFaq} className="mt-2"><input type="hidden" name="id" value={f.id} /><button className="text-xs text-rose-600 underline">Excluir</button></form>
            </details>
          ))}
        </div>
        <details className="mt-4 rounded-xl border border-dashed border-navy-deep/20 p-4">
          <summary className="cursor-pointer text-sm font-medium">+ Nova pergunta</summary>
          <form action={saveFaq} className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <label className="grid gap-1">Pergunta (PT)<input required name="question_pt" className="input" /></label>
            <label className="grid gap-1">Question (EN)<input required name="question_en" className="input" /></label>
            <label className="grid gap-1">Resposta (PT)<textarea required name="answer_pt" rows={3} className="input" /></label>
            <label className="grid gap-1">Answer (EN)<textarea required name="answer_en" rows={3} className="input" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked /> Publicado</label>
            <button className="rounded-full bg-navy-deep px-4 py-1.5 text-offwhite md:col-span-2">Adicionar</button>
          </form>
        </details>
      </section>

      {/* Testimonials */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Depoimentos</h2>
        <p className="mt-1 text-xs text-navy-mid/60">Um depoimento só é publicado no site quando a cliente autorizou (“Permissão concedida”) e o status é “Publicado”.</p>
        <div className="mt-3 space-y-3">
          {testimonials?.map((t) => (
            <details key={t.id} className="rounded-xl border border-navy-deep/10 p-4">
              <summary className="cursor-pointer text-sm">{t.display_name} {t.is_published ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">publicado</span> : <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">rascunho</span>}</summary>
              <form action={saveTestimonial} className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <input type="hidden" name="id" value={t.id} />
                <label className="grid gap-1 md:col-span-2">Nome exibido<input name="display_name" defaultValue={t.display_name} className="input" /></label>
                <label className="grid gap-1">Texto (PT)<textarea name="text_pt" defaultValue={t.text_pt ?? ""} rows={3} className="input" /></label>
                <label className="grid gap-1">Text (EN)<textarea name="text_en" defaultValue={t.text_en ?? ""} rows={3} className="input" /></label>
                <label className="flex items-center gap-2"><input type="checkbox" name="permission_granted" defaultChecked={t.permission_granted} /> Permissão concedida pela cliente</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={t.is_published} /> Publicado</label>
                <label className="grid gap-1">Ordem<input type="number" name="sort_order" defaultValue={t.sort_order} className="input" /></label>
                <button className="rounded-full bg-navy-deep px-4 py-1.5 text-offwhite md:col-span-2">Salvar</button>
              </form>
              <form action={deleteTestimonial} className="mt-2"><input type="hidden" name="id" value={t.id} /><button className="text-xs text-rose-600 underline">Excluir</button></form>
            </details>
          ))}
          {!testimonials?.length && <p className="text-sm text-navy-mid/50">Nenhum depoimento cadastrado ainda — nada de inventar. Adicione quando clientes reais autorizarem. ✦</p>}
        </div>
        <details className="mt-4 rounded-xl border border-dashed border-navy-deep/20 p-4">
          <summary className="cursor-pointer text-sm font-medium">+ Novo depoimento</summary>
          <form action={saveTestimonial} className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <label className="grid gap-1 md:col-span-2">Nome exibido<input required name="display_name" className="input" /></label>
            <label className="grid gap-1">Texto (PT)<textarea name="text_pt" rows={3} className="input" /></label>
            <label className="grid gap-1">Text (EN)<textarea name="text_en" rows={3} className="input" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="permission_granted" /> Permissão concedida</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_published" /> Publicado</label>
            <button className="rounded-full bg-navy-deep px-4 py-1.5 text-offwhite md:col-span-2">Adicionar</button>
          </form>
        </details>
      </section>

      {/* Email templates */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Modelos de e-mail</h2>
        <p className="mt-1 text-xs text-navy-mid/60">Placeholders disponíveis: {"{{client_name}}, {{service_name}}, {{date}}, {{time}}, {{timezone}}, {{reference}}, {{whatsapp_link}}"}. O envio automático é ativado quando um provedor de e-mail for conectado (ver documentação).</p>
        <div className="mt-3 space-y-3">
          {templates?.map((t) => (
            <details key={t.id} className="rounded-xl border border-navy-deep/10 p-4">
              <summary className="cursor-pointer font-mono text-xs text-navy-mid/70">{t.key} {!t.is_active && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">inativo</span>}</summary>
              <form action={saveTemplate} className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <input type="hidden" name="id" value={t.id} />
                <label className="grid gap-1">Assunto (PT)<input name="subject_pt" defaultValue={t.subject_pt} className="input" /></label>
                <label className="grid gap-1">Subject (EN)<input name="subject_en" defaultValue={t.subject_en} className="input" /></label>
                <label className="grid gap-1">Corpo (PT)<textarea name="body_pt" defaultValue={t.body_pt} rows={6} className="input" /></label>
                <label className="grid gap-1">Body (EN)<textarea name="body_en" defaultValue={t.body_en} rows={6} className="input" /></label>
                {t.key === "booking_reminder" && (
                  <label className="grid gap-1">Lembrete: horas antes do atendimento<input type="number" min="1" name="reminder_hours_before" defaultValue={t.reminder_hours_before ?? 24} className="input" /></label>
                )}
                <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={t.is_active} /> Ativo</label>
                <button className="rounded-full bg-navy-deep px-4 py-1.5 text-offwhite md:col-span-2">Salvar</button>
              </form>
            </details>
          ))}
        </div>
      </section>

      {/* Digital Journal (future module) */}
      <section className="rounded-2xl border border-dashed border-gold/50 bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Diário Digital <span className="ml-2 rounded-full bg-gold/15 px-3 py-0.5 text-xs text-gold">Em breve</span></h2>
        <p className="mt-2 text-sm text-navy-mid/70">
          Módulo futuro (inspirado no NotebookLM): reflexões guiadas, entradas de diário, notas pessoais e área de login da cliente.
          Está oculto da navegação pública e sem preço definido — status atual: <span className="font-mono text-xs">{journal?.status ?? "coming_soon"}</span>.
          A estrutura de banco de dados já existe (<span className="font-mono text-xs">journal_modules</span>, <span className="font-mono text-xs">journal_entries</span>), pronta para quando o produto for definido.
        </p>
      </section>
    </div>
  );
}
