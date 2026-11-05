import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function Contact({ params: paramsP }: { params: Promise<{ lang: string }> }) {
  const params = await paramsP;
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const t = await getDictionary(lang);
  let settings: any = null;
  try { settings = (await supabaseAdmin().from("settings").select("*").single()).data; } catch {}
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="font-display text-5xl">{t.contact.title}</h1>
      <p className="mt-5 text-beige/85">{t.contact.body}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <a className="btn-gold" href={settings?.whatsapp_link ?? "https://wa.me/SEU_NUMERO_COM_CODIGO_DO_PAIS"} target="_blank" rel="noreferrer">WhatsApp</a>
        <a className="btn-ghost" href={`mailto:${settings?.contact_email ?? "taropeuta@gmail.com"}`}>{settings?.contact_email ?? "taropeuta@gmail.com"}</a>
      </div>
    </div>
  );
}
