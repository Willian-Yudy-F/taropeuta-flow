import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase/server";
import TarotFrame from "@/components/TarotFrame";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Public confirmation page. Privacy & payment-integrity rules:
 * - Shows ONLY the opaque booking reference and a status message —
 *   never name, e-mail, birth data or any personal detail.
 * - The payment state comes from the DATABASE (set by the verified
 *   Stripe webhook), never from a query-string flag the browser could
 *   fabricate. Until the webhook lands, the page shows "pending".
 */
export default async function Confirmation({ params: paramsP, searchParams: searchParamsP }: { params: Promise<{ lang: string }>; searchParams: Promise<{ ref?: string }> }) {
  const params = await paramsP;
  const searchParams = await searchParamsP;
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const t = await getDictionary(lang);

  let whatsapp = "https://wa.me/SEU_NUMERO_COM_CODIGO_DO_PAIS";
  let paid = false;
  const ref = (searchParams.ref ?? "").replace(/[^A-Z0-9]/gi, "").slice(0, 12);
  try {
    const db = supabaseAdmin();
    const [{ data: settings }, { data: booking }] = await Promise.all([
      db.from("settings").select("whatsapp_link").single(),
      ref ? db.from("bookings").select("payment_status").eq("reference", ref).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    whatsapp = settings?.whatsapp_link ?? whatsapp;
    paid = booking?.payment_status === "succeeded";
  } catch {}

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <TarotFrame className="bg-navy-dark/60 p-12">
        <h1 className="font-display text-4xl">{t.booking.confirmation.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-beige/85">{paid ? t.booking.confirmation.paid : t.booking.confirmation.pending}</p>
        {ref && (
          <p className="mt-6 text-xs uppercase tracking-widest text-beige/60">
            {t.booking.confirmation.reference}: <span className="text-gold">{ref}</span>
          </p>
        )}
        <a className="btn-ghost mt-8 inline-block" href={whatsapp} target="_blank" rel="noreferrer">{t.booking.confirmation.support}</a>
      </TarotFrame>
    </div>
  );
}
