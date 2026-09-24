import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { wrapText } from "./wrap-text";
import type { AnalyticsReport, CategoryBreakdownPoint } from "@/lib/analytics";
import type { AnalyticsInsights } from "@/lib/ai/types";
import type { Forecast } from "@/lib/forecast";
import { formatTotals } from "@/lib/money";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const SECTIONS: { key: keyof AnalyticsInsights; title: string }[] = [
  { key: "descriptive", title: "Descriptive Analytics — What Happened" },
  { key: "diagnostic", title: "Diagnostic Analytics — Why It Happened" },
  { key: "predictive", title: "Predictive Analytics — What's Likely Next" },
  { key: "prescriptive", title: "Prescriptive Analytics — What To Do" },
];

export async function generateAnalyticsPdf(params: {
  report: AnalyticsReport;
  businessName: string;
  insights: AnalyticsInsights | null;
  forecast: Forecast | null;
}): Promise<Uint8Array> {
  const { report, businessName, insights, forecast } = params;
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(businessName, { x: MARGIN, y, size: 16, font: bold });
  const rangeLabel = `${report.range.start.toLocaleDateString()} - ${report.range.end.toLocaleDateString()}`;
  page.drawText(rangeLabel, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(rangeLabel, 10),
    y: y + 3,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 20;
  page.drawText("Financial Analysis Report", { x: MARGIN, y, size: 12, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;

  // --- Summary ---
  const summaryRows: [string, string][] = [
    ["Revenue", formatTotals(report.revenueTotals)],
    ["Expenses", formatTotals(report.expenseTotals)],
    ["Net profit/loss", formatTotals(report.profitTotals)],
  ];
  for (const [label, value] of summaryRows) {
    page.drawText(label, { x: MARGIN, y, size: 11, font: bold });
    page.drawText(value, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(value, 11),
      y,
      size: 11,
      font,
    });
    y -= 18;
  }
  y -= 15;

  // --- Trend bar chart (revenue vs expenses per bucket) — vector-drawn with
  // real text labels, since pdf-lib can do that natively (Word/Excel can't
  // as easily, which is why those use a separate raster chart instead). ---
  if (report.timeSeries.length > 0) {
    page.drawText(`Trend (${report.currency})`, { x: MARGIN, y, size: 11, font: bold });
    y -= 15;
    ({ page, y } = drawGroupedBarChart(
      pdfDoc,
      page,
      font,
      y,
      report.timeSeries.map((p) => ({ label: p.label, a: p.revenue, b: p.expenses })),
      { a: rgb(0.07, 0.09, 0.15), b: rgb(0.86, 0.15, 0.15) },
      ["Revenue", "Expenses"]
    ));
    y -= 15;
  }

  // --- Category breakdowns (paid tier only — caller passes empty arrays otherwise) ---
  if (report.salesByCategory.length > 0) {
    if (y < MARGIN + 200) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText("Revenue by category", { x: MARGIN, y, size: 11, font: bold });
    y -= 15;
    ({ page, y } = drawHorizontalBarChart(pdfDoc, page, font, y, report.salesByCategory, rgb(0.07, 0.09, 0.15)));
    y -= 15;
  }

  if (report.expensesByCategory.length > 0) {
    if (y < MARGIN + 200) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText("Expenses by category", { x: MARGIN, y, size: 11, font: bold });
    y -= 15;
    ({ page, y } = drawHorizontalBarChart(pdfDoc, page, font, y, report.expensesByCategory, rgb(0.86, 0.15, 0.15)));
    y -= 15;
  }

  // --- AI analysis: four labeled sections in order ---
  if (insights) {
    for (const section of SECTIONS) {
      const text = insights[section.key];
      if (!text) continue;

      if (y < MARGIN + 100) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      page.drawText(section.title, { x: MARGIN, y, size: 12, font: bold });
      y -= 18;

      if (section.key === "predictive" && forecast) {
        const line = `Projected ${forecast.nextPeriodLabel}: revenue ${forecast.projectedRevenue.toFixed(2)}, expenses ${forecast.projectedExpenses.toFixed(2)}, profit ${forecast.projectedProfit.toFixed(2)} (confidence: ${forecast.confidence})`;
        for (const wrapped of wrapText(line, font, 9, CONTENT_WIDTH)) {
          page.drawText(wrapped, { x: MARGIN, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
          y -= 12;
        }
        y -= 6;
      }

      for (const paragraph of text.split("\n").filter(Boolean)) {
        for (const line of wrapText(paragraph, font, 9, CONTENT_WIDTH)) {
          if (y < MARGIN) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN;
          }
          page.drawText(line, { x: MARGIN, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
          y -= 12;
        }
        y -= 6;
      }
      y -= 10;
    }
  }

  return pdfDoc.save();
}

function drawGroupedBarChart(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  startY: number,
  points: { label: string; a: number; b: number }[],
  colors: { a: ReturnType<typeof rgb>; b: ReturnType<typeof rgb> },
  legendLabels: [string, string]
): { page: PDFPage; y: number } {
  let y = startY;
  const chartHeight = 140;
  const chartBottom = y - chartHeight;
  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.a, p.b)));
  const bucketWidth = CONTENT_WIDTH / points.length;
  const barWidth = Math.min(14, bucketWidth / 3);

  page.drawLine({
    start: { x: MARGIN, y: chartBottom },
    end: { x: PAGE_WIDTH - MARGIN, y: chartBottom },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  points.forEach((point, i) => {
    const centerX = MARGIN + bucketWidth * i + bucketWidth / 2;
    const aHeight = (point.a / maxValue) * chartHeight;
    const bHeight = (point.b / maxValue) * chartHeight;

    page.drawRectangle({
      x: centerX - barWidth - 1,
      y: chartBottom,
      width: barWidth,
      height: Math.max(0, aHeight),
      color: colors.a,
    });
    page.drawRectangle({
      x: centerX + 1,
      y: chartBottom,
      width: barWidth,
      height: Math.max(0, bHeight),
      color: colors.b,
    });

    if (points.length <= 20) {
      const labelWidth = font.widthOfTextAtSize(point.label, 7);
      page.drawText(point.label, {
        x: centerX - labelWidth / 2,
        y: chartBottom - 12,
        size: 7,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  });

  y = chartBottom - 30;
  page.drawRectangle({ x: MARGIN, y: y + 4, width: 8, height: 8, color: colors.a });
  page.drawText(legendLabels[0], { x: MARGIN + 12, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawRectangle({ x: MARGIN + 70, y: y + 4, width: 8, height: 8, color: colors.b });
  page.drawText(legendLabels[1], { x: MARGIN + 82, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

  return { page, y: y - 10 };
}

function drawHorizontalBarChart(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  startY: number,
  items: CategoryBreakdownPoint[],
  color: ReturnType<typeof rgb>
): { page: PDFPage; y: number } {
  let y = startY;
  const rows = items.slice(0, 8);
  const maxValue = Math.max(1, ...rows.map((r) => r.amount));
  const labelWidth = 110;
  const valueWidth = 60;
  const barAreaWidth = CONTENT_WIDTH - labelWidth - valueWidth;
  const rowHeight = 18;

  for (const item of rows) {
    if (y < MARGIN + rowHeight) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    const label = item.category.length > 18 ? item.category.slice(0, 17) + "…" : item.category;
    page.drawText(label, { x: MARGIN, y, size: 8, font });

    const barWidth = (item.amount / maxValue) * barAreaWidth;
    page.drawRectangle({
      x: MARGIN + labelWidth,
      y: y - 3,
      width: Math.max(1, barWidth),
      height: 10,
      color,
    });

    const valueText = item.amount.toFixed(2);
    page.drawText(valueText, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(valueText, 8),
      y,
      size: 8,
      font,
    });

    y -= rowHeight;
  }

  return { page, y };
}
