import { prisma } from "@/lib/prisma";
import { isPaidUser } from "@/lib/subscription";
import { computeAnalytics, type AnalyticsReport } from "@/lib/analytics";
import { computeForecast, type Forecast } from "@/lib/forecast";
import { sampleTransactionDescriptions } from "@/lib/qualitative";
import { generateAnalyticsInsights } from "@/lib/ai/generate-insights";
import type { AnalyticsInsights } from "@/lib/ai/types";
import { resolveRange, type RangePreset } from "@/lib/date-ranges";

export async function prepareExportData(
  userId: string,
  searchParams: URLSearchParams
): Promise<{
  report: AnalyticsReport;
  businessName: string;
  insights: AnalyticsInsights | null;
  forecast: Forecast | null;
}> {
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
  const forecast = computeForecast(report.timeSeries);

  // Same gate as the on-screen analytics page: free users get the summary
  // and trend, not category breakdowns, the forecast, or the AI narrative.
  // Rather than duplicating that check in each export route, it's applied
  // once here by stripping the gated pieces before they reach a generator.
  if (!paid) {
    return {
      report: { ...report, salesByCategory: [], expensesByCategory: [] },
      businessName,
      insights: null,
      forecast: null,
    };
  }

  const samples = await sampleTransactionDescriptions(userId, start, end);
  const result = await generateAnalyticsInsights(report, businessName, forecast, samples);

  return {
    report,
    businessName,
    insights: result.success ? result.insights : null,
    forecast,
  };
}
