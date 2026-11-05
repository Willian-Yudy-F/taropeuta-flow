import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase/server";
import ServiceCard from "@/components/ServiceCard";
import { notFound } from "next/navigation";

export const revalidate = 300;

export default async function Services({ params: paramsP }: { params: Promise<{ lang: string }> }) {
  const params = await paramsP;
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const t = await getDictionary(lang);
  let services: any[] = [];
  try {
    const { data } = await supabaseAdmin().from("services").select("*").eq("is_active", true).eq("is_archived", false).order("sort_order");
    services = data ?? [];
  } catch {}
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-center font-display text-5xl">{t.services.title}</h1>
      <p className="mt-3 text-center text-beige/80">{t.services.subtitle}</p>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {services.map((s) => <ServiceCard key={s.id} s={s} lang={lang} t={t} />)}
      </div>
    </div>
  );
}
