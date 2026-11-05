import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabase/server";
import BookingFlow from "@/components/BookingFlow";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Booking({ params: paramsP, searchParams: searchParamsP }: { params: Promise<{ lang: string }>; searchParams: Promise<{ service?: string }> }) {
  const params = await paramsP;
  const searchParams = await searchParamsP;
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const t = await getDictionary(lang);
  let services: any[] = [];
  let settings: any = null;
  try {
    const db = supabaseAdmin();
    services = (await db.from("services").select("*").eq("is_active", true).eq("is_archived", false).order("sort_order")).data ?? [];
    settings = (await db.from("settings").select("business_timezone,manual_payment_enabled,stripe_enabled,whatsapp_link").single()).data;
  } catch {}
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-center font-display text-5xl">{t.booking.title}</h1>
      <BookingFlow
        lang={lang}
        t={t.booking}
        services={services}
        preselectedSlug={searchParams.service ?? null}
        stripeEnabled={Boolean(settings?.stripe_enabled && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
        businessTz={settings?.business_timezone ?? "Australia/Sydney"}
      />
    </div>
  );
}
