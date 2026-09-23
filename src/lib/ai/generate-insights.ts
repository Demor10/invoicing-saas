import { GeminiProvider } from "@/lib/ai/providers/gemini";
import type { InsightsProvider, InsightsResult } from "@/lib/ai/types";
import type { AnalyticsReport } from "@/lib/analytics";
import { formatTotals } from "@/lib/money";

function getProvider(): InsightsProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return new GeminiProvider(apiKey, model);
}

function buildPrompt(report: AnalyticsReport, businessName: string): string {
  const trendLines = report.timeSeries
    .map((p) => `${p.label}: revenue ${p.revenue.toFixed(2)}, expenses ${p.expenses.toFixed(2)}, profit ${p.profit.toFixed(2)}`)
    .join("\n");

  const topExpenseCategories = report.expensesByCategory
    .slice(0, 5)
    .map((c) => `${c.category}: ${c.amount.toFixed(2)}`)
    .join(", ") || "none recorded";

  const topSalesCategories = report.salesByCategory
    .slice(0, 5)
    .map((c) => `${c.category}: ${c.amount.toFixed(2)}`)
    .join(", ") || "none recorded";

  return `You are a professional financial analyst writing a short report for a small business owner named "${businessName}".

Data for the period ${report.range.start.toDateString()} to ${report.range.end.toDateString()} (currency: ${report.currency}):

Total revenue: ${formatTotals(report.revenueTotals)}
Total expenses: ${formatTotals(report.expenseTotals)}
Net profit/loss: ${formatTotals(report.profitTotals)}

Revenue by sales category: ${topSalesCategories}
Expenses by category: ${topExpenseCategories}

Trend over time (${report.granularity}ly buckets):
${trendLines || "No transactions in this period."}

Write a concise (3-5 short paragraphs) narrative analysis in plain business language, not bullet points. Cover: (1) the overall financial picture and whether it's a profit or loss, (2) any notable trend over the period (growing, shrinking, volatile, flat), (3) which categories are driving revenue or costs the most, and (4) one or two concrete, practical suggestions. Do not invent numbers not given above. Do not use markdown formatting.`;
}

export async function generateAnalyticsInsights(
  report: AnalyticsReport,
  businessName: string
): Promise<InsightsResult> {
  const provider = getProvider();
  if (!provider) {
    return {
      success: false,
      error: "AI insights aren't configured yet (GEMINI_API_KEY is missing).",
    };
  }

  try {
    const text = await provider.generateNarrative(buildPrompt(report, businessName));
    return { success: true, text };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error generating insights.",
    };
  }
}
