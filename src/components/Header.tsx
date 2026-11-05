import Link from "next/link";
import LangSwitcher from "./LangSwitcher";
import type { Locale } from "@/lib/i18n";

export default function Header({ lang, t }: { lang: Locale; t: any }) {
  const links = [
    { href: `/${lang}`, label: t.nav.home },
    { href: `/${lang}/about`, label: t.nav.about },
    { href: `/${lang}/services`, label: t.nav.services },
    { href: `/${lang}/flow-demo`, label: t.nav.flow },
    { href: `/${lang}/contact`, label: t.nav.contact },
  ];
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href={`/${lang}`} className="font-display text-2xl tracking-wide text-offwhite">
        Taropeuta<span className="text-gold">.</span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-beige md:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="transition hover:text-offwhite">{l.label}</Link>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <LangSwitcher lang={lang} />
        <Link href={`/${lang}/booking`} className="btn-gold hidden md:inline-block">{t.nav.book}</Link>
      </div>
    </header>
  );
}
