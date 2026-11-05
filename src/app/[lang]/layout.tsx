import { notFound } from "next/navigation";
import StarField from "@/components/StarField";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getDictionary, isLocale, locales } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase/server";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params: paramsP }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const params = await paramsP;
  if (!isLocale(params.lang)) notFound();
  const t = await getDictionary(params.lang);
  let settings: any = null;
  try {
    const { data } = await supabaseAdmin().from("settings").select("*").single();
    settings = data;
  } catch { /* Supabase not configured yet — render with defaults */ }
  return (
    <>
      <StarField />
      <Header lang={params.lang} t={t} />
      <main className="relative z-10">{children}</main>
      <Footer lang={params.lang} t={t} settings={settings} />
    </>
  );
}
