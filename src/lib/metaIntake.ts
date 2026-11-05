import { z } from "zod";
import type { DemoEnquiry, IntakeReview } from "@/lib/demoEnquiries";

const ReviewSchema = z.object({
  intent: z.string().min(1),
  serviceInterest: z.string().min(1),
  summary: z.string().min(1),
  missingInformation: z.array(z.string()),
  nextStep: z.string().min(1),
  replyDraft: z.string().min(1),
  journeyStage: z.string().min(1),
  riskLevel: z.enum(["low", "attention", "high"]),
  requiresHumanReview: z.literal(true),
});

const SYSTEM_PROMPT = `You are the administrative intake assistant for Taropeuta, a reflective tarot and astrology practice.

Your role is administrative only. Organise enquiries, identify missing booking information, propose a next step, and draft a reply for practitioner review.

Rules:
- Never draw, choose, or interpret tarot cards.
- Never predict a relationship, health, legal, financial, or life outcome.
- Never diagnose or present the service as therapy.
- If the message suggests immediate danger or self-harm, set riskLevel to high, journeyStage to Human review required, and do not write a normal sales reply.
- Every draft requires human approval and nothing is sent automatically.
- Use the same language as the client's message.
- Return JSON only, without Markdown.

Required JSON keys: intent, serviceInterest, summary, missingInformation, nextStep, replyDraft, journeyStage, riskLevel, requiresHumanReview.
requiresHumanReview must always be true.`;

function extractJson(value: string) {
  const cleaned = value.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last < first) throw new Error("Meta returned no JSON object");
  return JSON.parse(cleaned.slice(first, last + 1));
}

export async function analyseWithMeta(enquiry: DemoEnquiry): Promise<IntakeReview> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("MODEL_API_KEY is not configured");

  const response = await fetch("https://api.meta.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "muse-spark-1.3-contributor",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            enquiryId: enquiry.id,
            channel: enquiry.channel,
            clientName: enquiry.name,
            message: enquiry.message,
          }),
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Meta API returned ${response.status}: ${detail.slice(0, 180)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Meta returned an empty answer");
  }

  return ReviewSchema.parse(extractJson(content));
}
