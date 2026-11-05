import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get("service");
  const date = req.nextUrl.searchParams.get("date");
  if (!service || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }
  try {
    const result = await getAvailableSlots(service, date);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ slots: [] });
  }
}
