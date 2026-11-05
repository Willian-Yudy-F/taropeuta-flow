import Link from "next/link";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase/server";
import ServiceCard from "@/components/ServiceCard";
import FAQ from "@/components/FAQ";
import TarotFrame from "@/components/TarotFrame";
import { notFound } from "next/navigation";

export const revalidate = 300;

export default async function Home({ params: paramsP }: { params: Promise<{ lang: string }> }) {
  const params = await paramsP;
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const t = await getDictionary(lang);

  let services: any[] = [], faqs: any[] = [], testimonials: any[] = [];
  try {
    const db = supabaseAdmin();
    [services, faqs, testimonials] = await Promise.all([
      db.from("services").select("*").eq("is_active", true).eq("is_archived", false).order("sort_order").then((r) => r.data ?? []),
      db.from("faqs").select("*").eq("is_published", true).order("sort_order").then((r) => r.data ?? []),
      db.from("testimonials").select("*").eq("is_published", true).eq("permission_granted", true).order("sort_order").then((r) => r.data ?? []),
    ]);
  } catch { /* DB not configured yet */ }

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="py-20 text-center md:py-28">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">{t.hero.eyebrow}</p>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl leading-tight md:text-7xl">{t.hero.title}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-beige/85 md:text-lg">{t.hero.subtitle}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href={`/${lang}/booking`} className="btn-gold">{t.hero.cta_primary}</Link>
          <Link href={`/${lang}/services`} className="btn-ghost">{t.hero.cta_secondary}</Link>
        </div>
      </section>

      <div className="gold-rule" />

      {/* Intro */}
      <section className="mx-auto max-w-3xl py-20 text-center">
        <h2 className="font-display text-4xl">{t.intro.title}</h2>
        <p className="mt-5 leading-relaxed text-beige/85">{t.intro.body}</p>
      </section>

      {/* How it works */}
      <section className="py-10">
        <h2 className="text-center font-display text-4xl">{t.how.title}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {t.how.steps.map((s: any, i: number) => (
            <div key={i} className="rounded-xl border border-gold/20 bg-navy-dark/50 p-7">
              <p className="font-display text-2xl text-gold">{["I", "II", "III"][i]}</p>
              <h3 className="mt-3 font-display text-2xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-beige/85">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section className="py-20">
          <h2 className="text-center font-display text-4xl">{t.services.title}</h2>
          <p className="mt-3 text-center text-beige/80">{t.services.subtitle}</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {services.map((s) => <ServiceCard key={s.id} s={s} lang={lang} t={t} />)}
          </div>
        </section>
      )}

      {/* Birth details */}
      <section className="py-10">
        <TarotFrame className="mx-auto max-w-3xl bg-navy-dark/60 p-10 text-center">
          <h2 className="font-display text-3xl">{t.birth.title}</h2>
          <p className="mt-4 text-sm leading-relaxed text-beige/85">{t.birth.body}</p>
        </TarotFrame>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20">
          <h2 className="text-center font-display text-4xl">{t.testimonials.title}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {testimonials.map((x) => (
              <figure key={x.id} className="rounded-xl border border-gold/20 bg-navy-dark/50 p-8">
                <blockquote className="font-display text-xl italic leading-relaxed">“{lang === "pt" ? x.text_pt ?? x.text_en : x.text_en ?? x.text_pt}”</blockquote>
                <figcaption className="mt-4 text-sm text-gold">— {x.display_name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="py-16">
          <h2 className="text-center font-display text-4xl">{t.faq.title}</h2>
          <div className="mt-10"><FAQ items={faqs} lang={lang} /></div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-20 text-center">
        <h2 className="font-display text-5xl">{t.final_cta.title}</h2>
        <Link href={`/${lang}/booking`} className="btn-gold mt-8 inline-block">{t.final_cta.cta}</Link>
      </section>
    </div>
  );
}
