import ExcelJS from "exceljs";
import type { AnalyticsReport, CategoryBreakdownPoint } from "@/lib/analytics";
import type { AnalyticsInsights } from "@/lib/ai/types";
import type { Forecast } from "@/lib/forecast";
import { formatTotals } from "@/lib/money";
import { renderGroupedBarChartPng, renderSingleSeriesBarChartPng } from "@/lib/charts/render-bar-chart";

const SECTIONS: { key: keyof AnalyticsInsights; title: string }[] = [
  { key: "descriptive", title: "Descriptive Analytics — What Happened" },
  { key: "diagnostic", title: "Diagnostic Analytics — Why It Happened" },
  { key: "predictive", title: "Predictive Analytics — What's Likely Next" },
  { key: "prescriptive", title: "Prescriptive Analytics — What To Do" },
];

export async function generateAnalyticsXlsx(params: {
  report: AnalyticsReport;
  businessName: string;
  insights: AnalyticsInsights | null;
  forecast: Forecast | null;
}): Promise<Buffer> {
  const { report, businessName, insights, forecast } = params;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName;
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "metric", width: 24 },
    { header: "Value", key: "value", width: 30 },
  ];
  summary.getRow(1).font = { bold: true };
  summary.addRow({ metric: "Business", value: businessName });
  summary.addRow({
    metric: "Period",
    value: `${report.range.start.toLocaleDateString()} - ${report.range.end.toLocaleDateString()}`,
  });
  summary.addRow({ metric: "Revenue", value: formatTotals(report.revenueTotals) });
  summary.addRow({ metric: "Expenses", value: formatTotals(report.expenseTotals) });
  summary.addRow({ metric: "Net profit/loss", value: formatTotals(report.profitTotals) });
  if (forecast) {
    summary.addRow({ metric: "", value: "" });
    summary.addRow({ metric: "Projected next period revenue", value: forecast.projectedRevenue.toFixed(2) });
    summary.addRow({ metric: "Projected next period expenses", value: forecast.projectedExpenses.toFixed(2) });
    summary.addRow({ metric: "Projected next period profit", value: forecast.projectedProfit.toFixed(2) });
    summary.addRow({ metric: "Projection confidence", value: forecast.confidence });
  }

  if (report.timeSeries.length > 0) {
    const trend = workbook.addWorksheet("Trend");
    trend.columns = [
      { header: "Period", key: "period", width: 16 },
      { header: `Revenue (${report.currency})`, key: "revenue", width: 18 },
      { header: `Expenses (${report.currency})`, key: "expenses", width: 18 },
      { header: `Profit (${report.currency})`, key: "profit", width: 18 },
    ];
    trend.getRow(1).font = { bold: true };
    for (const point of report.timeSeries) {
      trend.addRow({
        period: point.label,
        revenue: round2(point.revenue),
        expenses: round2(point.expenses),
        profit: round2(point.profit),
      });
    }
    trend.addRow({});
    trend.addRow({ period: "(Chart: dark = revenue, red = expenses — see rows above for exact values)" });
    const chartPng = renderGroupedBarChartPng({
      seriesA: report.timeSeries.map((p) => p.revenue),
      seriesB: report.timeSeries.map((p) => p.expenses),
    });
    addImage(workbook, trend, chartPng, trend.rowCount + 1, 500, 220);
  }

  addCategorySheet(workbook, "Revenue by category", report.salesByCategory, report.currency, [17, 24, 39]);
  addCategorySheet(workbook, "Expenses by category", report.expensesByCategory, report.currency, [220, 38, 38]);

  if (insights) {
    const notes = workbook.addWorksheet("AI Analysis");
    notes.columns = [{ header: "Analysis", key: "text", width: 100 }];
    notes.getRow(1).font = { bold: true };

    for (const section of SECTIONS) {
      const text = insights[section.key];
      if (!text) continue;

      const titleRow = notes.addRow({ text: section.title });
      titleRow.font = { bold: true };

      if (section.key === "predictive" && forecast) {
        const row = notes.addRow({
          text: `Projected ${forecast.nextPeriodLabel}: revenue ${forecast.projectedRevenue.toFixed(2)}, expenses ${forecast.projectedExpenses.toFixed(2)}, profit ${forecast.projectedProfit.toFixed(2)} (confidence: ${forecast.confidence})`,
        });
        row.font = { italic: true, color: { argb: "FF666666" } };
        row.alignment = { wrapText: true, vertical: "top" };
      }

      for (const paragraph of text.split("\n").filter(Boolean)) {
        const row = notes.addRow({ text: paragraph });
        row.alignment = { wrapText: true, vertical: "top" };
      }
      notes.addRow({});
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addCategorySheet(
  workbook: ExcelJS.Workbook,
  title: string,
  items: CategoryBreakdownPoint[],
  currency: string,
  color: [number, number, number]
) {
  if (items.length === 0) return;
  const sheet = workbook.addWorksheet(title.slice(0, 31)); // Excel sheet-name length limit
  sheet.columns = [
    { header: "Category", key: "category", width: 28 },
    { header: `Amount (${currency})`, key: "amount", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const item of items) {
    sheet.addRow({ category: item.category, amount: round2(item.amount) });
  }
  sheet.addRow({});
  const chartPng = renderSingleSeriesBarChartPng({ values: items.map((c) => c.amount), color });
  addImage(workbook, sheet, chartPng, sheet.rowCount + 1, 450, Math.max(90, items.length * 24));
}

function addImage(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  png: Buffer,
  startRow: number,
  width: number,
  height: number
) {
  // Works around a @types/node internal quirk where Buffer<T>'s own generic
  // overloads disagree with each other on this TypeScript/Node types
  // version. Not a real runtime issue — exceljs receives the exact same
  // bytes either way, this only silences a type-checker-only false alarm.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageId = workbook.addImage({ buffer: png as any, extension: "png" });
  sheet.addImage(imageId, {
    tl: { col: 0, row: startRow },
    ext: { width, height },
  });
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
