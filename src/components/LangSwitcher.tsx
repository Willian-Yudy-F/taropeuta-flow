"use client";
import { usePathname, useRouter } from "next/navigation";

export default function LangSwitcher({ lang }: { lang: "en" | "pt" }) {
  const pathname = usePathname();
  const router = useRouter();
  const switchTo = (target: "en" | "pt") => {
    if (target === lang) return;
    const rest = pathname.replace(/^\/(en|pt)/, "");
    router.push(`/${target}${rest || ""}`);
  };
  return (
    <div role="group" aria-label="Language" className="flex overflow-hidden rounded-full border border-gold/40 text-xs">
      {(["pt", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-pressed={lang === l}
          className={`px-3 py-1.5 uppercase tracking-widest transition ${lang === l ? "bg-gold text-navy-deep" : "text-beige hover:text-offwhite"}`}
        >
          {l === "pt" ? "PT" : "EN"}
        </button>
      ))}
    </div>
  );
}
