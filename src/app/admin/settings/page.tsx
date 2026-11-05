import { requireAdmin, assertAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/* ── server actions ──────────────────────────────────────── */

function revalidatePublic() {
  ["/pt", "/en", "/pt/contact", "/en/contact", "/pt/booking", "/en/booking"].forEach((p) => revalidatePath(p));
}

async function saveSettings(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("settings").update({
    business_timezone: String(formData.get("business_timezone")),
    default_language: String(formData.get("default_language")),
    whatsapp_link: String(formData.get("whatsapp_link") || "") || null,
    instagram_url: String(formData.get("instagram_url") || "") || null,
    contact_email: String(formData.get("contact_email")),
    cancellation_min_hours: Number(formData.get("cancellation_min_hours") || 24),
    allow_reschedule: formData.get("allow_reschedule") === "on",
    allow_refund: formData.get("allow_refund") === "on",
    allow_credit: formData.get("allow_credit") === "on",
    stripe_enabled: formData.get("stripe_enabled") === "on",
    manual_payment_enabled: formData.get("manual_payment_enabled") === "on",
    manual_payment_instructions_pt: String(formData.get("manual_payment_instructions_pt") || "") || null,
    manual_payment_instructions_en: String(formData.get("manual_payment_instructions_en") || "") || null,
    checkout_hold_minutes: Math.max(30, Number(formData.get("checkout_hold_minutes") || 35)),
  }).eq("id", true);
  revalidatePath("/admin/settings"); revalidatePublic();
}

async function saveRule(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const id = String(formData.get("id") || "");
  const payload = {
    weekday: Number(formData.get("weekday")),
    start_time: String(formData.get("start_time")),
    end_time: String(formData.get("end_time")),
    is_active: formData.get("is_active") === "on",
  };
  if (id) await db.from("availability_rules").update(payload).eq("id", id);
  else await db.from("availability_rules").insert(payload);
  revalidatePath("/admin/settings");
}

async function deleteRule(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("availability_rules").delete().eq("id", formData.get("id"));
  revalidatePath("/admin/settings");
}

async function resolvePrivacyRequest(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  await db.from("privacy_requests").update({ status: String(formData.get("status")), resolved_at: new Date().toISOString() }).eq("id", formData.get("id"));
  revalidatePath("/admin/settings");
}

async function deleteClientData(formData: FormData) {
  "use server";
  await assertAdmin();
  const db = supabaseAdmin();
  const email = String(formData.get("email")).trim().toLowerCase();
  const { data: client } = await db.from("clients").select("id").ilike("email", email).maybeSingle();
  if (client) {
    // anonymize rather than break FK history: bookings reference clients with on delete restrict
    await db.from("clients").update({
      full_name: "Cliente removida (LGPD/GDPR)", email: `deleted-${client.id}@removed.local`,
      whatsapp: null, country: null, city: null, timezone: null,
      date_of_birth: null, birth_time: null, birth_city: null,
      sun_sign: null, moon_sign: null, rising_sign: null,
      internal_notes: null, tags: [], status: "inactive",
      consent_marketing: false, consent_storage: false,
      anonymized_at: new Date().toISOString(),
    }).eq("id", client.id);
    await db.from("bookings").update({ birth_snapshot: null, form_responses: {} }).eq("client_id", client.id);
    await db.from("journal_entries").delete().eq("client_id", client.id);
  }
  revalidatePath("/admin/settings");
}

/* ── page ────────────────────────────────────────────────── */

export default async function SettingsPage() {
  await requireAdmin();
  const db = supabaseAdmin();
  const [{ data: settings }, { data: rules }, { data: requests }] = await Promise.all([
    db.from("settings").select("*").single(),
    db.from("availability_rules").select("*").order("weekday").order("start_time"),
    db.from("privacy_requests").select("*").order("created_at", { ascending: false }).limit(30),
  ]);
  const s = settings!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-navy-mid/70">Fuso horário, idioma, contato, pagamentos, horários de atendimento e privacidade.</p>
      </div>

      {/* business settings */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Negócio & contato</h2>
        <form action={saveSettings} className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <label className="grid gap-1">Fuso horário do negócio
            <input name="business_timezone" defaultValue={s.business_timezone} className="input" placeholder="Australia/Sydney" />
            <span className="text-xs text-navy-mid/50">Formato IANA, ex.: Australia/Sydney, America/Sao_Paulo</span>
          </label>
          <label className="grid gap-1">Idioma padrão do site
            <select name="default_language" defaultValue={s.default_language} className="input">
              <option value="pt">Português</option><option value="en">English</option>
            </select>
          </label>
          <label className="grid gap-1">E-mail de contato<input type="email" name="contact_email" defaultValue={s.contact_email} className="input" /></label>
          <label className="grid gap-1">Link do WhatsApp
            <input name="whatsapp_link" defaultValue={s.whatsapp_link ?? ""} className="input" />
            <span className="text-xs text-navy-mid/50">Substitua pelo link real: https://wa.me/61XXXXXXXXX (código do país + número, sem espaços)</span>
          </label>
          <label className="grid gap-1">Instagram (URL)<input name="instagram_url" defaultValue={s.instagram_url ?? ""} className="input" placeholder="https://instagram.com/…" /></label>

          <div className="md:col-span-2 mt-2 border-t border-navy-deep/10 pt-4">
            <h3 className="font-display text-lg">Cancelamento & reagendamento</h3>
          </div>
          <label className="grid gap-1">Antecedência mínima para cancelar/reagendar (horas)
            <input type="number" min="0" name="cancellation_min_hours" defaultValue={s.cancellation_min_hours} className="input" />
          </label>
          <div className="grid gap-2">
            <label className="flex items-center gap-2"><input type="checkbox" name="allow_reschedule" defaultChecked={s.allow_reschedule} /> Permitir reagendamento</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="allow_refund" defaultChecked={s.allow_refund} /> Permitir reembolso</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="allow_credit" defaultChecked={s.allow_credit} /> Permitir crédito para futura sessão</label>
          </div>
          <p className="text-xs text-navy-mid/50 md:col-span-2">O texto completo da política é editado em Conteúdo → Páginas legais.</p>

          <div className="md:col-span-2 mt-2 border-t border-navy-deep/10 pt-4">
            <h3 className="font-display text-lg">Pagamentos</h3>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" name="stripe_enabled" defaultChecked={s.stripe_enabled} /> Stripe ativo
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" name="manual_payment_enabled" defaultChecked={s.manual_payment_enabled} /> Pagamento manual ativo (reserva fica “Aguardando pagamento”)</label>
          <p className="text-xs text-navy-mid/50 md:col-span-2">Só ative a Stripe depois de configurar as chaves no arquivo .env (ver documentação SETUP.md, seção Stripe). Sem as chaves, o checkout falharia.</p>
          <label className="grid gap-1">Tempo de reserva do checkout (minutos)
            <input type="number" min="30" name="checkout_hold_minutes" defaultValue={s.checkout_hold_minutes ?? 35} className="input" />
            <span className="text-xs text-navy-mid/50">Quanto tempo um horário fica reservado enquanto a cliente não conclui o pagamento na Stripe. Mínimo 30 (exigência da Stripe). Expirado, o horário é liberado automaticamente.</span>
          </label>
          <label className="grid gap-1">Instruções de pagamento manual (PT)<textarea name="manual_payment_instructions_pt" defaultValue={s.manual_payment_instructions_pt ?? ""} rows={3} className="input" placeholder="Ex.: envie o comprovante da transferência pelo WhatsApp…" /></label>
          <label className="grid gap-1">Manual payment instructions (EN)<textarea name="manual_payment_instructions_en" defaultValue={s.manual_payment_instructions_en ?? ""} rows={3} className="input" /></label>

          <button className="rounded-full bg-navy-deep px-5 py-2 text-offwhite md:col-span-2">Salvar configurações</button>
        </form>
      </section>

      {/* availability rules */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Horários de atendimento</h2>
        <p className="mt-1 text-xs text-navy-mid/60">Janelas semanais em que os horários ficam disponíveis para agendamento (no fuso {s.business_timezone}). Bloqueios pontuais ficam na Agenda.</p>
        <div className="mt-4 space-y-2">
          {rules?.map((r) => (
            <form key={r.id} action={saveRule} className="flex flex-wrap items-center gap-2 rounded-xl border border-navy-deep/10 px-3 py-2 text-sm">
              <input type="hidden" name="id" value={r.id} />
              <select name="weekday" defaultValue={r.weekday} className="rounded-lg border border-navy-deep/20 px-2 py-1.5">
                {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <input type="time" name="start_time" defaultValue={String(r.start_time).slice(0, 5)} className="rounded-lg border border-navy-deep/20 px-2 py-1.5" />
              <span>→</span>
              <input type="time" name="end_time" defaultValue={String(r.end_time).slice(0, 5)} className="rounded-lg border border-navy-deep/20 px-2 py-1.5" />
              <label className="flex items-center gap-1.5"><input type="checkbox" name="is_active" defaultChecked={r.is_active} /> Ativa</label>
              <button className="rounded-full border border-navy-deep/20 px-3 py-1">Salvar</button>
              <button formAction={deleteRule} className="text-rose-600">Remover</button>
            </form>
          ))}
        </div>
        <form action={saveRule} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-navy-deep/20 px-3 py-3 text-sm">
          <span className="font-medium">Nova janela:</span>
          <select name="weekday" className="rounded-lg border border-navy-deep/20 px-2 py-1.5">
            {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input required type="time" name="start_time" className="rounded-lg border border-navy-deep/20 px-2 py-1.5" />
          <span>→</span>
          <input required type="time" name="end_time" className="rounded-lg border border-navy-deep/20 px-2 py-1.5" />
          <label className="flex items-center gap-1.5"><input type="checkbox" name="is_active" defaultChecked /> Ativa</label>
          <button className="rounded-full bg-navy-deep px-4 py-1.5 text-offwhite">Adicionar</button>
        </form>
      </section>

      {/* privacy */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl">Privacidade & dados</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">Exportar dados de uma cliente</h3>
            <p className="mt-1 text-xs text-navy-mid/60">A exportação completa (CSV) está no CRM. Para o histórico de uma cliente específica, abra o perfil dela no CRM.</p>
            <a href="/admin/crm/export" className="mt-3 inline-block rounded-full border border-navy-deep/20 px-4 py-1.5 text-sm">Exportar todas as clientes (CSV)</a>
          </div>
          <div>
            <h3 className="text-sm font-medium">Excluir dados de uma cliente (LGPD/GDPR)</h3>
            <p className="mt-1 text-xs text-navy-mid/60">Anonimiza os dados pessoais e apaga dados de nascimento e respostas de formulário, preservando o histórico financeiro agregado.</p>
            <form action={deleteClientData} className="mt-3 flex gap-2 text-sm">
              <input required type="email" name="email" placeholder="email@dacliente.com" className="input flex-1" />
              <button className="rounded-full bg-rose-600 px-4 py-1.5 text-white">Excluir dados</button>
            </form>
          </div>
        </div>

        <div className="mt-6 border-t border-navy-deep/10 pt-4">
          <h3 className="text-sm font-medium">Solicitações de privacidade</h3>
          <div className="mt-2 space-y-2 text-sm">
            {requests?.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-navy-deep/10 px-3 py-2">
                <span className="capitalize">{r.kind === "export" ? "Exportação" : "Exclusão"}</span>
                <span className="text-navy-mid/70">{r.email}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${r.status === "open" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"}`}>{r.status === "open" ? "Aberta" : r.status === "done" ? "Concluída" : "Rejeitada"}</span>
                {r.status === "open" && (
                  <span className="ml-auto flex gap-2">
                    <form action={resolvePrivacyRequest}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="done" /><button className="rounded-full border border-emerald-300 px-3 py-1 text-emerald-700">Concluir</button></form>
                    <form action={resolvePrivacyRequest}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-full border border-navy-deep/20 px-3 py-1">Rejeitar</button></form>
                  </span>
                )}
              </div>
            ))}
            {!requests?.length && <p className="text-navy-mid/50">Nenhuma solicitação registrada.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
