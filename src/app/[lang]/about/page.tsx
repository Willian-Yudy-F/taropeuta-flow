import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase/server";
import TarotFrame from "@/components/TarotFrame";
import { notFound } from "next/navigation";

export const revalidate = 300;

export default async function About({ params: paramsP }: { params: Promise<{ lang: string }> }) {
  const params = await paramsP;
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const t = await getDictionary(lang);
  let blocks: Record<string, string> = {};
  try {
    const { data } = await supabaseAdmin().from("content_blocks").select("key,value_en,value_pt").eq("group_name", "about");
    for (const b of data ?? []) blocks[b.key] = (lang === "pt" ? b.value_pt : b.value_en) ?? "";
    const { data: d } = await supabaseAdmin().from("content_blocks").select("value_en,value_pt").eq("key", "policy.disclaimer").single();
    blocks["disclaimer"] = (lang === "pt" ? d?.value_pt : d?.value_en) ?? "";
  } catch {}
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-center font-display text-5xl">{t.about.title}</h1>
      <TarotFrame className="mx-auto mt-12 flex h-72 max-w-sm items-center justify-center bg-navy-dark/60">
        <p className="px-8 text-center text-xs uppercase tracking-widest text-beige/60">
          {lang === "pt" ? "Foto profissional — adicionar no painel" : "Professional photo — add via admin"}
        </p>
      </TarotFrame>
      <section className="mt-12 space-y-8 leading-relaxed text-beige/90">
        <p>{blocks["about.intro"]}</p>
        <p>{blocks["about.purpose"]}</p>
        <p>{blocks["about.approach"]}</p>
      </section>
      <section className="mt-14">
        <h2 className="font-display text-3xl">{t.about.values_title}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {t.about.values.map((v: string) => (
            <li key={v} className="rounded-lg border border-gold/20 bg-navy-dark/50 px-5 py-4 text-sm">{v}</li>
          ))}
        </ul>
      </section>
      <p className="mt-14 border-t border-gold/20 pt-6 text-center text-xs italic text-beige/70">{blocks["disclaimer"]}</p>
    </div>
  );
}
