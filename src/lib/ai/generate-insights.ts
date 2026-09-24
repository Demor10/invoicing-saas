import { GeminiProvider } from "@/lib/ai/providers/gemini";
import type { InsightsProvider, InsightsResult, AnalyticsInsights } from "@/lib/ai/types";
import type { AnalyticsReport } from "@/lib/analytics";
import type { Forecast } from "@/lib/forecast";
import type { TransactionSample } from "@/lib/qualitative";
import { formatTotals } from "@/lib/money";

function getProvider(): InsightsProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return new GeminiProvider(apiKey, model);
}

// Section markers the prompt asks Gemini to use, and that the parser below
// looks for. Deliberately plain and unlikely to appear in normal prose, so
// splitting on them is reliable without needing the model to output JSON
// (which smaller/faster models sometimes get subtly wrong — free text with
// clear markers is more robust here).
const MARKERS = {
  descriptive: "[DESCRIPTIVE]",
  diagnostic: "[DIAGNOSTIC]",
  predictive: "[PREDICTIVE]",
  prescriptive: "[PRESCRIPTIVE]",
} as const;

function buildPrompt(
  report: AnalyticsReport,
  businessName: string,
  forecast: Forecast | null,
  samples: TransactionSample[]
): string {
  const trendLines = report.timeSeries
    .map(
      (p) =>
        `${p.label}: revenue ${p.revenue.toFixed(2)}, expenses ${p.expenses.toFixed(2)}, profit ${p.profit.toFixed(2)}`
    )
    .join("\n");

  const topExpenseCategories =
    report.expensesByCategory
      .slice(0, 5)
      .map((c) => `${c.category}: ${c.amount.toFixed(2)}`)
      .join(", ") || "none recorded";

  const topSalesCategories =
    report.salesByCategory
      .slice(0, 5)
      .map((c) => `${c.category}: ${c.amount.toFixed(2)}`)
      .join(", ") || "none recorded";

  const sampleLines =
    samples
      .map(
        (s) =>
          `${s.type === "sale" ? "Sale" : "Expense"} on ${s.date.toDateString()}: "${s.description}" (${s.category ?? "uncategorized"}, ${s.amount.toFixed(2)})`
      )
      .join("\n") || "No individual transactions recorded in this period.";

  const forecastLines = forecast
    ? `A simple linear-trend projection (not a guarantee) for ${forecast.nextPeriodLabel}: revenue ${forecast.projectedRevenue.toFixed(2)}, expenses ${forecast.projectedExpenses.toFixed(2)}, profit ${forecast.projectedProfit.toFixed(2)}. Confidence in this projection: ${forecast.confidence} (based on how much of the historical variance the trend line explains and how many data points are available).`
    : "Not enough data points in this period to compute a trend-based projection.";

  return `You are a professional financial analyst writing a structured report for a small business owner named "${businessName}".

QUANTITATIVE DATA for the period ${report.range.start.toDateString()} to ${report.range.end.toDateString()} (currency: ${report.currency}):

Total revenue: ${formatTotals(report.revenueTotals)}
Total expenses: ${formatTotals(report.expenseTotals)}
Net profit/loss: ${formatTotals(report.profitTotals)}

Revenue by sales category: ${topSalesCategories}
Expenses by category: ${topExpenseCategories}

Trend over time (${report.granularity}ly buckets):
${trendLines || "No transactions in this period."}

Precomputed statistical forecast (use these numbers as-is if you mention a projection — do not invent different ones):
${forecastLines}

QUALITATIVE DATA — the individual transactions with the largest amounts this period, which may reveal patterns the totals alone don't (recurring vendors, one-off anomalies, naming patterns suggesting a particular client or project):
${sampleLines}

Write your analysis in exactly four sections, in this order, each starting with its marker on its own line exactly as written below (including the brackets), followed by 1-3 short paragraphs in plain business language (no markdown, no bullet points):

${MARKERS.descriptive}
Descriptive analytics — what happened. Summarize the overall financial picture using the quantitative data: is it a profit or loss, how big, how does it break down by category.

${MARKERS.diagnostic}
Diagnostic analytics — why it happened. Use both the trend data and the qualitative transaction samples to explain likely drivers: specific categories, specific large transactions, or patterns in the descriptions. Be specific and reference actual items from the data given, not generic possibilities.

${MARKERS.predictive}
Predictive analytics — what's likely next. Use the precomputed forecast numbers given above (do not calculate your own). Clearly state the confidence level and what it means, and note if there isn't enough data for a meaningful projection.

${MARKERS.prescriptive}
Prescriptive analytics — what to do about it. Give 2-3 concrete, practical suggestions that follow logically from the descriptive and diagnostic findings above, not generic business advice.

Do not invent numbers not given above.`;
}

export function parseInsights(rawText: string): AnalyticsInsights {
  const positions = Object.entries(MARKERS)
    .map(([key, marker]) => ({ key: key as keyof AnalyticsInsights, index: rawText.indexOf(marker), marker }))
    .filter((p) => p.index !== -1)
    .sort((a, b) => a.index - b.index);

  // If the model didn't follow the marker format at all, fall back to
  // putting everything in "descriptive" rather than losing the response —
  // a slightly misfiled answer beats a blank section.
  if (positions.length === 0) {
    return { descriptive: rawText.trim(), diagnostic: "", predictive: "", prescriptive: "" };
  }

  const result: AnalyticsInsights = { descriptive: "", diagnostic: "", predictive: "", prescriptive: "" };
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index + positions[i].marker.length;
    const end = i + 1 < positions.length ? positions[i + 1].index : rawText.length;
    result[positions[i].key] = rawText.slice(start, end).trim();
  }
  return result;
}

export async function generateAnalyticsInsights(
  report: AnalyticsReport,
  businessName: string,
  forecast: Forecast | null,
  samples: TransactionSample[]
): Promise<InsightsResult> {
  const provider = getProvider();
  if (!provider) {
    return {
      success: false,
      error: "AI insights aren't configured yet (GEMINI_API_KEY is missing).",
    };
  }

  try {
    const rawText = await provider.generateNarrative(
      buildPrompt(report, businessName, forecast, samples)
    );
    return { success: true, insights: parseInsights(rawText) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error generating insights.",
    };
  }
}
