import { prisma } from "@/lib/prisma";
import { isPaidUser } from "@/lib/subscription";
import { computeAnalytics, type AnalyticsReport } from "@/lib/analytics";
import { generateAnalyticsInsights } from "@/lib/ai/generate-insights";
import { resolveRange, type RangePreset } from "@/lib/date-ranges";

export async function prepareExportData(
  userId: string,
  searchParams: URLSearchParams
): Promise<{ report: AnalyticsReport; businessName: string; aiNarrative: string | null }> {
  const preset = (searchParams.get("preset") as RangePreset) || "month";
  const customStart = searchParams.get("start") ?? undefined;
  const customEnd = searchParams.get("end") ?? undefined;
  const { start, end } = resolveRange(preset, customStart, customEnd);

  const [user, paid, report] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { businessName: true } }),
    isPaidUser(userId),
    computeAnalytics(userId, start, end),
  ]);

  const businessName = user?.businessName ?? "Business";

  // Same gate as the on-screen analytics page: free users get the summary
  // and trend, not category breakdowns or the AI narrative. Rather than
  // duplicating that check in each export route, it's applied once here by
  // stripping the gated pieces before they ever reach a generator.
  if (!paid) {
    return {
      report: { ...report, salesByCategory: [], expensesByCategory: [] },
      businessName,
      aiNarrative: null,
    };
  }

  const insights = await generateAnalyticsInsights(report, businessName);
  return {
    report,
    businessName,
    aiNarrative: insights.success ? insights.text : null,
  };
}
