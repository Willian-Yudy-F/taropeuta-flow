import Link from "next/link";
import TarotFrame from "./TarotFrame";

export default function ServiceCard({ s, lang, t }: { s: any; lang: "en" | "pt"; t: any }) {
  const name = lang === "pt" ? s.name_pt : s.name_en;
  const desc = lang === "pt" ? s.description_pt : s.description_en;
  const price = (s.price_cents / 100).toFixed(0);
  const scope = s.questions_included
    ? t.services.questions.replace("{n}", String(s.questions_included))
    : t.services.open_session;
  const format = s.delivery_format === "whatsapp_audio" ? t.services.whatsapp_audio : t.services.online_session;
  return (
    <TarotFrame className="flex h-full flex-col bg-navy-dark/60 p-8 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">{s.duration_min} {t.services.minutes} · {scope}</p>
      <h3 className="mt-3 font-display text-3xl">{name}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-beige/85">{desc}</p>
      <p className="mt-6 text-xs text-beige/70">{format}</p>
      <div className="mt-4 flex items-end justify-between">
        <p className="font-display text-3xl text-gold">{t.services.from} ${price}</p>
        <Link href={`/${lang}/booking?service=${s.slug}`} className="btn-ghost text-xs">{t.services.book}</Link>
      </div>
    </TarotFrame>
  );
}
