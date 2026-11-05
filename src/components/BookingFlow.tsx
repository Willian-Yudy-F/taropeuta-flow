"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  lang: "en" | "pt";
  t: any;
  services: any[];
  preselectedSlug: string | null;
  stripeEnabled: boolean;
  businessTz: string;
};

const REQUIRED = [
  "full_name","email","whatsapp","country","city","timezone",
  "date_of_birth","birth_time","birth_city","topic","questions",
] as const;

export default function BookingFlow({ lang, t, services, preselectedSlug, stripeEnabled, businessTz }: Props) {
  const router = useRouter();
  const pre = services.find((s) => s.slug === preselectedSlug) ?? null;
  const [step, setStep] = useState(pre ? 2 : 1);
  const [service, setService] = useState<any>(pre);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ startsAtUtc: string; label: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const clientTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [form, setForm] = useState<Record<string, any>>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    consent_storage: false, consent_terms: false, topic: "", website: "",
  });

  useEffect(() => {
    if (!service || !date) return;
    setLoadingSlots(true); setSlot(null);
    fetch(`/api/availability?service=${service.id}&date=${date}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [service, date]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, boolean> = {};
    for (const k of REQUIRED) if (!form[k]) e[k] = true;
    if (!form.consent_storage) e.consent_storage = true;
    if (!form.consent_terms) e.consent_terms = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate() || !service || !slot) return;
    setSubmitting(true); setServerError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, startsAtUtc: slot, language: lang, clientTimezone: clientTz, form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "error");
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else router.push(`/${lang}/booking/confirmation?ref=${data.reference}`);
    } catch (err: any) {
      setServerError(err.message);
    } finally { setSubmitting(false); }
  };

  const Steps = () => (
    <ol className="mt-8 flex justify-center gap-2 text-[11px] uppercase tracking-widest text-beige/60">
      {[t.step_service, t.step_time, t.step_details, t.step_payment].map((s: string, i: number) => (
        <li key={s} className={`rounded-full border px-3 py-1 ${step === i + 1 ? "border-gold text-gold" : "border-gold/20"}`}>{i + 1}. {s}</li>
      ))}
    </ol>
  );

  const slotDateLocal = slot ? new Date(slot) : null;

  return (
    <div>
      <Steps />

      {step === 1 && (
        <div className="mt-10 grid gap-4">
          {services.map((s) => (
            <button key={s.id} onClick={() => { setService(s); setStep(2); }}
              className="rounded-xl border border-gold/25 bg-navy-dark/60 p-6 text-left transition hover:border-gold">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-display text-2xl">{lang === "pt" ? s.name_pt : s.name_en}</span>
                <span className="font-display text-xl text-gold">AUD ${(s.price_cents / 100).toFixed(0)}</span>
              </div>
              <p className="mt-2 text-sm text-beige/80">{lang === "pt" ? s.description_pt : s.description_en}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && service && (
        <div className="mt-10">
          <p className="text-sm text-beige/80">{lang === "pt" ? service.name_pt : service.name_en} · AUD ${(service.price_cents / 100).toFixed(0)}</p>
          <label className="label mt-6">{t.select_date}</label>
          <input type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
          {date && (
            <>
              <p className="label mt-6">{t.select_time}</p>
              <p className="mb-3 text-xs text-beige/60">{t.your_timezone.replace("{tz}", businessTz)} · {clientTz}</p>
              {loadingSlots ? <p className="text-sm text-beige/70">…</p> : slots.length === 0 ? (
                <p className="text-sm text-beige/70">{t.no_slots}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((s) => (
                    <button key={s.startsAtUtc} onClick={() => setSlot(s.startsAtUtc)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${slot === s.startsAtUtc ? "border-gold bg-gold text-navy-deep" : "border-gold/25 hover:border-gold"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="mt-8 flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(1)}>{t.form.back}</button>
            <button className="btn-gold disabled:opacity-40" disabled={!slot} onClick={() => setStep(3)}>{t.form.continue}</button>
          </div>
        </div>
      )}

      {step === 3 && service && (
        <div className="mt-10 grid gap-5">
          {[
            ["full_name", "text"], ["email", "email"], ["whatsapp", "tel"],
            ["country", "text"], ["city", "text"], ["timezone", "text"],
          ].map(([k, type]) => (
            <div key={k}>
              <label className="label" htmlFor={k}>{t.form[k]} *</label>
              <input id={k} type={type} className="input" value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
              {errors[k] && <p className="mt-1 text-xs text-terracotta">{t.form.required}</p>}
            </div>
          ))}

          {/* Honeypot anti-spam: hidden from humans (aria-hidden + off-screen), bots auto-fill it and get silently dropped server-side. */}
          <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" type="text" tabIndex={-1} autoComplete="off" value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </div>

          <div className="rounded-xl border border-gold/25 bg-navy-dark/50 p-5">
            <p className="text-xs leading-relaxed text-beige/80">{t.form.birth_help}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[["date_of_birth", "date"], ["birth_time", "time"], ["birth_city", "text"]].map(([k, type]) => (
                <div key={k}>
                  <label className="label" htmlFor={k}>{t.form[k === "date_of_birth" ? "dob" : k]} *</label>
                  <input id={k} type={type} className="input" value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
                  {errors[k] && <p className="mt-1 text-xs text-terracotta">{t.form.required}</p>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="topic">{t.form.topic} *</label>
            <select id="topic" className="input" value={form.topic} onChange={(e) => set("topic", e.target.value)} aria-invalid={!!errors.topic}>
              <option value="">—</option>
              {t.form.topics.map((x: string) => <option key={x} value={x}>{x}</option>)}
            </select>
            {errors.topic && <p className="mt-1 text-xs text-terracotta">{t.form.required}</p>}
          </div>
          <div>
            <label className="label" htmlFor="questions">{t.form.questions} *</label>
            <textarea id="questions" rows={4} className="input" value={form.questions ?? ""} onChange={(e) => set("questions", e.target.value)} aria-invalid={!!errors.questions} />
            {errors.questions && <p className="mt-1 text-xs text-terracotta">{t.form.required}</p>}
          </div>

          {[["consent_storage", t.form.consent_storage], ["consent_terms", t.form.consent_terms]].map(([k, label]) => (
            <label key={k as string} className="flex items-start gap-3 text-sm text-beige/90">
              <input type="checkbox" className="mt-1 accent-[#BD9060]" checked={!!form[k as string]} onChange={(e) => set(k as string, e.target.checked)} />
              <span>{label as string} {errors[k as string] && <em className="text-terracotta">*</em>}</span>
            </label>
          ))}

          <div className="mt-4 flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(2)}>{t.form.back}</button>
            <button className="btn-gold" onClick={() => setStep(4)}>{t.form.continue}</button>
          </div>
        </div>
      )}

      {step === 4 && service && slotDateLocal && (
        <div className="mt-10">
          <div className="rounded-xl border border-gold/30 bg-navy-dark/60 p-7">
            <h2 className="font-display text-2xl">{t.summary}</h2>
            <ul className="mt-4 space-y-1.5 text-sm text-beige/90">
              <li>{lang === "pt" ? service.name_pt : service.name_en}</li>
              <li>{slotDateLocal.toLocaleString(lang === "pt" ? "pt-BR" : "en-AU", { dateStyle: "full", timeStyle: "short" })} ({clientTz})</li>
              <li className="font-display text-xl text-gold">AUD ${(service.price_cents / 100).toFixed(2)}</li>
            </ul>
          </div>
          {!stripeEnabled && <p className="mt-5 text-xs leading-relaxed text-beige/70">{t.manual_payment_note}</p>}
          {serverError && <p className="mt-4 text-sm text-terracotta">{serverError}</p>}
          <div className="mt-8 flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(3)}>{t.form.back}</button>
            <button className="btn-gold disabled:opacity-40" disabled={submitting} onClick={submit}>
              {submitting ? "…" : stripeEnabled ? t.form.pay : t.form.confirm_manual}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
