import { NextResponse } from "next/server";
import { demoEnquiries, fallbackReviews } from "@/lib/demoEnquiries";
import { analyseWithMeta } from "@/lib/metaIntake";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const enquiry = demoEnquiries.find((item) => item.id === body.enquiryId);
    if (!enquiry) {
      return NextResponse.json({ error: "Unknown demo enquiry" }, { status: 400 });
    }

    // High-risk messages never go through the normal generation flow.
    if (fallbackReviews[enquiry.id].riskLevel === "high") {
      return NextResponse.json({
        review: fallbackReviews[enquiry.id],
        source: "safety-rule",
        model: null,
      });
    }

    try {
      const review = await analyseWithMeta(enquiry);
      return NextResponse.json({
        review,
        source: "meta",
        model: "muse-spark-1.3-contributor",
      });
    } catch (error) {
      console.error("Meta intake fallback:", error);
      return NextResponse.json({
        review: fallbackReviews[enquiry.id],
        source: "fixture",
        model: null,
        notice: "Meta was unavailable, so the labelled demo fixture was used.",
      });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
