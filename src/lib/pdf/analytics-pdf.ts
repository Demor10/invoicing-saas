import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { wrapText } from "./wrap-text";
import type { AnalyticsReport } from "@/lib/analytics";
import { formatTotals } from "@/lib/money";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export async function generateAnalyticsPdf(params: {
  report: AnalyticsReport;
  businessName: string;
  aiNarrative: string | null;
}): Promise<Uint8Array> {
  const { report, businessName, aiNarrative } = params;
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

  // --- Trend bar chart (revenue vs expenses per bucket) ---
  if (report.timeSeries.length > 0) {
    page.drawText(`Trend (${report.currency})`, { x: MARGIN, y, size: 11, font: bold });
    y -= 15;
    const chartTop = y;
    const chartHeight = 140;
    const chartBottom = chartTop - chartHeight;
    const maxValue = Math.max(
      1,
      ...report.timeSeries.map((p) => Math.max(p.revenue, p.expenses))
    );
    const bucketWidth = CONTENT_WIDTH / report.timeSeries.length;
    const barWidth = Math.min(14, bucketWidth / 3);

    page.drawLine({
      start: { x: MARGIN, y: chartBottom },
      end: { x: PAGE_WIDTH - MARGIN, y: chartBottom },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    report.timeSeries.forEach((point, i) => {
      const centerX = MARGIN + bucketWidth * i + bucketWidth / 2;
      const revenueHeight = (point.revenue / maxValue) * chartHeight;
      const expenseHeight = (point.expenses / maxValue) * chartHeight;

      page.drawRectangle({
        x: centerX - barWidth - 1,
        y: chartBottom,
        width: barWidth,
        height: Math.max(0, revenueHeight),
        color: rgb(0.07, 0.09, 0.15),
      });
      page.drawRectangle({
        x: centerX + 1,
        y: chartBottom,
        width: barWidth,
        height: Math.max(0, expenseHeight),
        color: rgb(0.86, 0.15, 0.15),
      });

      if (report.timeSeries.length <= 20) {
        const label = point.label;
        const labelWidth = font.widthOfTextAtSize(label, 7);
        page.drawText(label, {
          x: centerX - labelWidth / 2,
          y: chartBottom - 12,
          size: 7,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    });

    y = chartBottom - 30;
    page.drawRectangle({ x: MARGIN, y: y + 4, width: 8, height: 8, color: rgb(0.07, 0.09, 0.15) });
    page.drawText("Revenue", { x: MARGIN + 12, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawRectangle({ x: MARGIN + 70, y: y + 4, width: 8, height: 8, color: rgb(0.86, 0.15, 0.15) });
    page.drawText("Expenses", { x: MARGIN + 82, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 25;
  }

  // --- Category breakdowns (paid tier only — caller passes empty arrays otherwise) ---
  if (report.salesByCategory.length > 0 || report.expensesByCategory.length > 0) {
    if (y < MARGIN + 150) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    ({ page, y } = drawCategoryList(pdfDoc, page, font, bold, "Revenue by category", report.salesByCategory, y));
    ({ page, y } = drawCategoryList(pdfDoc, page, font, bold, "Expenses by category", report.expensesByCategory, y));
  }

  // --- AI narrative (paid tier only) ---
  if (aiNarrative) {
    if (y < MARGIN + 100) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText("AI Analysis", { x: MARGIN, y, size: 12, font: bold });
    y -= 18;
    for (const paragraph of aiNarrative.split("\n").filter(Boolean)) {
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
  }

  return pdfDoc.save();
}

function drawCategoryList(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  title: string,
  items: { category: string; amount: number }[],
  startY: number
): { page: PDFPage; y: number } {
  let y = startY;
  if (items.length === 0) return { page, y };

  page.drawText(title, { x: MARGIN, y, size: 11, font: bold });
  y -= 15;
  for (const item of items.slice(0, 10)) {
    if (y < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(item.category, { x: MARGIN + 10, y, size: 9, font });
    const amountText = item.amount.toFixed(2);
    page.drawText(amountText, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(amountText, 9),
      y,
      size: 9,
      font,
    });
    y -= 13;
  }
  y -= 12;
  return { page, y };
}
