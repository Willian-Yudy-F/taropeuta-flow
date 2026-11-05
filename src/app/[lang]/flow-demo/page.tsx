import FlowDemo from "@/components/FlowDemo";
import { isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FlowDemoPage({ params: paramsPromise }: { params: Promise<{ lang: string }> }) {
  const params = await paramsPromise;
  if (!isLocale(params.lang)) notFound();
  const isPt = params.lang === "pt";

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 md:px-8">
      <header className="mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Meta Global AI Developer Hackathon</p>
        <h1 className="mt-5 font-display text-5xl leading-tight text-offwhite md:text-7xl">Taropeuta Flow</h1>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-beige/80 md:text-lg">
          {isPt
            ? "Uma central de jornada que transforma contatos dispersos em próximos passos claros, sem substituir o cuidado e a decisão da profissional."
            : "A client journey hub that turns scattered enquiries into clear next steps without replacing practitioner care and judgement."}
        </p>
      </header>

      <FlowDemo />

      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
        {[
          ["Meta-native", "Synthetic Instagram, WhatsApp and Facebook enquiries demonstrate the intended social-first workflow."],
          ["Human reviewed", "AI prepares administrative work; the practitioner edits and approves every client-facing draft."],
          ["Safe by design", "Prediction requests are reframed and immediate safety concerns leave the automated journey."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-xl border border-gold/20 bg-navy-dark/50 p-6">
            <h2 className="font-display text-2xl text-gold">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-beige/75">{body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
