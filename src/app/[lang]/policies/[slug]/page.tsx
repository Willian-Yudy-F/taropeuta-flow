import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const KEYS: Record<string, string> = {
  privacy: "policy.privacy",
  terms: "policy.terms",
  cancellation: "policy.cancellation",
  disclaimer: "policy.disclaimer",
};

export default async function Policy({ params: paramsP }: { params: Promise<{ lang: string; slug: string }> }) {
  const params = await paramsP;
  if (!isLocale(params.lang) || !KEYS[params.slug]) notFound();
  const lang = params.lang as Locale;
  const t = await getDictionary(lang);
  let text = "";
  try {
    const { data } = await supabaseAdmin().from("content_blocks").select("value_en,value_pt").eq("key", KEYS[params.slug]).single();
    text = (lang === "pt" ? data?.value_pt : data?.value_en) ?? "";
  } catch {}
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl">{(t.policies as any)[params.slug]}</h1>
      <div className="mt-8 whitespace-pre-line text-sm leading-relaxed text-beige/90">{text}</div>
    </div>
  );
}
