import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isPaidUser } from "@/lib/subscription";
import { computeAnalytics } from "@/lib/analytics";
import { resolveRange, type RangePreset } from "@/lib/date-ranges";
import { formatTotals } from "@/lib/money";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { CategoryChart } from "@/components/analytics/category-chart";
import { ExportButtons } from "@/components/analytics/export-buttons";
import { AiInsights } from "@/components/analytics/ai-insights";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const preset = (params.preset as RangePreset) || "month";
  const { start, end } = resolveRange(preset, params.start, params.end);

  const [paid, report] = await Promise.all([
    isPaidUser(session.user.id),
    computeAnalytics(session.user.id, start, end),
  ]);

  const queryString = new URLSearchParams({
    preset,
    ...(params.start ? { start: params.start } : {}),
    ...(params.end ? { end: params.end } : {}),
  }).toString();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <ExportButtons queryString={queryString} />
      </div>

      <div className="mt-6">
        <DateRangePicker currentPreset={preset} customStart={params.start} customEnd={params.end} />
      </div>

      {report.otherCurrenciesExcluded && (
        <p className="mt-4 text-xs text-gray-400">
          Showing charts in {report.currency} (your most-used currency this period) — totals
          above still include every currency.
        </p>
      )}

      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Revenue</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatTotals(report.revenueTotals)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">Sales + paid invoices</p>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Expenses</p>
          <p className="mt-1 text-lg font-semibold text-red-600">
            {formatTotals(report.expenseTotals)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Net profit/loss</p>
          <p className="mt-1 text-lg font-semibold text-green-700">
            {formatTotals(report.profitTotals)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-900">Revenue, expenses & profit</h2>
        <div className="mt-3">
          <RevenueChart data={report.timeSeries} />
        </div>
      </div>

      {paid ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Revenue by category</h2>
              <div className="mt-3">
                <CategoryChart data={report.salesByCategory} color="#111827" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Expenses by category</h2>
              <div className="mt-3">
                <CategoryChart data={report.expensesByCategory} color="#dc2626" />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-900">AI analysis</h2>
            <div className="mt-3 rounded-md border border-gray-200 p-4">
              {/* key forces a fresh mount (and thus a fresh "loading" state)
                  whenever the selected date range changes, rather than
                  reusing the same instance and resetting state inside an
                  effect. */}
              <AiInsights key={queryString} queryString={queryString} />
            </div>
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          Category breakdowns and an AI-written analysis of your numbers are available on the
          paid plan.
        </div>
      )}

      <Link
        href="/dashboard"
        className="mt-8 inline-block text-sm text-gray-600 underline hover:text-gray-900"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
