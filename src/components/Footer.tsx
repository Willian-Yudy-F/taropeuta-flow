import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export default function Footer({ lang, t, settings }: { lang: Locale; t: any; settings: any }) {
  return (
    <footer className="relative z-10 mt-24 border-t border-gold/20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">Taropeuta<span className="text-gold">.</span></p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-beige/80">{t.footer.disclaimer}</p>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs uppercase tracking-widest text-gold">{t.nav.contact}</p>
          <ul className="space-y-2 text-beige/90">
            <li><a className="hover:text-offwhite" href={`mailto:${settings?.contact_email ?? "taropeuta@gmail.com"}`}>{settings?.contact_email ?? "taropeuta@gmail.com"}</a></li>
            <li><a className="hover:text-offwhite" href={settings?.whatsapp_link ?? "#"} target="_blank" rel="noreferrer">{t.footer.whatsapp}</a></li>
            {settings?.instagram_url && <li><a className="hover:text-offwhite" href={settings.instagram_url} target="_blank" rel="noreferrer">{t.footer.instagram}</a></li>}
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs uppercase tracking-widest text-gold">Legal</p>
          <ul className="space-y-2 text-beige/90">
            <li><Link className="hover:text-offwhite" href={`/${lang}/policies/privacy`}>{t.footer.privacy}</Link></li>
            <li><Link className="hover:text-offwhite" href={`/${lang}/policies/terms`}>{t.footer.terms}</Link></li>
            <li><Link className="hover:text-offwhite" href={`/${lang}/policies/cancellation`}>{t.footer.cancellation}</Link></li>
          </ul>
        </div>
      </div>
      <div className="gold-rule" />
      <p className="py-6 text-center text-xs text-beige/50">© {new Date().getFullYear()} Taropeuta</p>
    </footer>
  );
}
