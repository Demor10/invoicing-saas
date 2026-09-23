import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPaidUser } from "@/lib/subscription";
import { computeAnalytics } from "@/lib/analytics";
import { generateAnalyticsInsights } from "@/lib/ai/generate-insights";
import { resolveRange, type RangePreset } from "@/lib/date-ranges";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isPaidUser(session.user.id))) {
    return NextResponse.json(
      { error: "AI insights are a paid-plan feature." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const preset = (url.searchParams.get("preset") as RangePreset) || "month";
  const customStart = url.searchParams.get("start") ?? undefined;
  const customEnd = url.searchParams.get("end") ?? undefined;
  const { start, end } = resolveRange(preset, customStart, customEnd);

  const [user, report] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { businessName: true } }),
    computeAnalytics(session.user.id, start, end),
  ]);

  const result = await generateAnalyticsInsights(report, user?.businessName ?? "your business");

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ text: result.text });
}
