import ExcelJS from "exceljs";
import type { AnalyticsReport } from "@/lib/analytics";
import { formatTotals } from "@/lib/money";

export async function generateAnalyticsXlsx(params: {
  report: AnalyticsReport;
  businessName: string;
  aiNarrative: string | null;
}): Promise<Buffer> {
  const { report, businessName, aiNarrative } = params;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName;
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "metric", width: 24 },
    { header: "Value", key: "value", width: 24 },
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
  }

  addCategorySheet(workbook, "Revenue by category", report.salesByCategory, report.currency);
  addCategorySheet(workbook, "Expenses by category", report.expensesByCategory, report.currency);

  if (aiNarrative) {
    const notes = workbook.addWorksheet("AI Analysis");
    notes.columns = [{ header: "Analysis", key: "text", width: 100 }];
    notes.getRow(1).font = { bold: true };
    for (const paragraph of aiNarrative.split("\n").filter(Boolean)) {
      const row = notes.addRow({ text: paragraph });
      row.alignment = { wrapText: true, vertical: "top" };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addCategorySheet(
  workbook: ExcelJS.Workbook,
  title: string,
  items: { category: string; amount: number }[],
  currency: string
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
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
