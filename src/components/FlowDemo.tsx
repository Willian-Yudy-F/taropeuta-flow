"use client";

import { useMemo, useState } from "react";
import { demoEnquiries, fallbackReviews, type IntakeReview } from "@/lib/demoEnquiries";

type Decision = "pending" | "approved" | "rejected";
type ApiSource = "fixture" | "meta" | "safety-rule";

const sourceLabels: Record<ApiSource, string> = {
  fixture: "Labelled demo fixture",
  meta: "Generated with Meta AI",
  "safety-rule": "Local safety rule",
};

export default function FlowDemo({ compact = false }: { compact?: boolean }) {
  const [selectedId, setSelectedId] = useState(demoEnquiries[0].id);
  const [reviews, setReviews] = useState(fallbackReviews);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [sources, setSources] = useState<Record<string, ApiSource>>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const enquiry = demoEnquiries.find((item) => item.id === selectedId)!;
  const review = reviews[selectedId];
  const decision = decisions[selectedId] ?? "pending";

  const metrics = useMemo(() => ({
    total: demoEnquiries.length,
    pending: demoEnquiries.filter((item) => (decisions[item.id] ?? "pending") === "pending").length,
    approved: Object.values(decisions).filter((value) => value === "approved").length,
    highRisk: Object.values(reviews).filter((item) => item.riskLevel === "high").length,
  }), [decisions, reviews]);

  async function analyse() {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/meta/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryId: selectedId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      setReviews((current) => ({ ...current, [selectedId]: data.review }));
      setSources((current) => ({ ...current, [selectedId]: data.source }));
      setNotice(data.notice ?? "Analysis completed. Review the draft before approving it.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not analyse this enquiry.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(value: string) {
    setReviews((current) => ({
      ...current,
      [selectedId]: { ...current[selectedId], replyDraft: value } as IntakeReview,
    }));
  }

  return (
    <section className={`overflow-hidden rounded-2xl border border-gold/25 bg-navy-dark/80 shadow-2xl ${compact ? "" : "my-12"}`}>
      <div className="border-b border-gold/20 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Meta Client Journey Hub</p>
            <h2 className="mt-2 font-display text-3xl text-offwhite">Social Inbox</h2>
            <p className="mt-2 max-w-2xl text-sm text-beige/75">Synthetic enquiries from Meta channels, organised by AI and controlled by the practitioner.</p>
          </div>
          <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-beige">Demo data only</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Total", metrics.total], ["Awaiting review", metrics.pending],
            ["Approved", metrics.approved], ["High-risk flags", metrics.highRisk],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-gold/15 bg-navy-deep/70 p-4">
              <strong className="font-display text-3xl text-offwhite">{value}</strong>
              <p className="mt-1 text-xs text-beige/65">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-gold/20 lg:border-b-0 lg:border-r">
          {demoEnquiries.map((item) => {
            const itemReview = reviews[item.id];
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                onClick={() => { setSelectedId(item.id); setNotice(""); }}
                className={`w-full border-b border-gold/10 p-5 text-left transition ${active ? "bg-gold/10" : "hover:bg-white/[0.03]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-offwhite">{item.name}</strong>
                  <span className="text-[10px] uppercase tracking-widest text-gold">{item.channel}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-beige/70">{item.message}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded-full bg-navy-deep px-2 py-1 text-beige/75">{itemReview.intent}</span>
                  <span className={`rounded-full px-2 py-1 ${itemReview.riskLevel === "high" ? "bg-red-950 text-red-200" : itemReview.riskLevel === "attention" ? "bg-amber-950 text-amber-200" : "bg-navy-deep text-beige/75"}`}>{itemReview.riskLevel} risk</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-offwhite">AI Intake Review</h3>
              <p className="text-xs text-beige/60">{enquiry.name} · {enquiry.channel} · {enquiry.receivedAt}</p>
            </div>
            <span className="rounded-full border border-gold/20 px-3 py-1 text-[10px] text-beige/70">{sourceLabels[sources[selectedId] ?? "fixture"]}</span>
          </div>

          <blockquote className="mt-5 rounded-xl border border-gold/15 bg-navy-deep/60 p-4 text-sm leading-relaxed text-beige/85">{enquiry.message}</blockquote>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ReviewField label="Intent" value={review.intent} />
            <ReviewField label="Service interest" value={review.serviceInterest} />
            <ReviewField label="Journey stage" value={review.journeyStage} />
            <ReviewField label="Missing information" value={review.missingInformation.join(" · ") || "None"} />
          </div>
          <div className="mt-4"><ReviewField label="Administrative summary" value={review.summary} /></div>
          <div className="mt-4"><ReviewField label="Recommended next step" value={review.nextStep} /></div>

          <label className="label mt-6" htmlFor="reply-draft">Reply draft · human review required</label>
          <textarea id="reply-draft" rows={5} className="input leading-relaxed" value={review.replyDraft} onChange={(event) => updateDraft(event.target.value)} />

          {notice && <p className="mt-3 text-xs text-beige/70">{notice}</p>}
          <p className="mt-3 text-xs text-beige/55">Nothing is sent automatically. The practitioner remains responsible for every client-facing message.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-gold disabled:opacity-50" disabled={loading || review.riskLevel === "high"} onClick={analyse}>{loading ? "Analysing…" : "Analyse with Meta AI"}</button>
            <button className="btn-ghost" onClick={() => setDecisions((current) => ({ ...current, [selectedId]: "approved" }))} disabled={review.riskLevel === "high"}>Approve draft</button>
            <button className="btn-ghost" onClick={() => setDecisions((current) => ({ ...current, [selectedId]: "rejected" }))}>Reject</button>
            <span className="self-center text-xs uppercase tracking-widest text-gold">{decision}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-gold">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-beige/85">{value}</p>
    </div>
  );
}
