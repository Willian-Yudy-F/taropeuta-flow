export default function FAQ({ items, lang }: { items: any[]; lang: "en" | "pt" }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-gold/15">
      {items.map((f) => (
        <details key={f.id} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl text-offwhite">
            {lang === "pt" ? f.question_pt : f.question_en}
            <span aria-hidden className="text-gold transition group-open:rotate-45">＋</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-beige/85">{lang === "pt" ? f.answer_pt : f.answer_en}</p>
        </details>
      ))}
    </div>
  );
}
