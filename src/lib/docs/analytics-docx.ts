import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
} from "docx";
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

export async function generateAnalyticsDocx(params: {
  report: AnalyticsReport;
  businessName: string;
  insights: AnalyticsInsights | null;
  forecast: Forecast | null;
}): Promise<Buffer> {
  const { report, businessName, insights, forecast } = params;

  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: businessName, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Financial Analysis Report — ${report.range.start.toLocaleDateString()} to ${report.range.end.toLocaleDateString()}`,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({ text: "" }),

    summaryRow("Revenue", formatTotals(report.revenueTotals)),
    summaryRow("Expenses", formatTotals(report.expenseTotals)),
    summaryRow("Net profit/loss", formatTotals(report.profitTotals)),
    new Paragraph({ text: "" }),
  ];

  if (report.timeSeries.length > 0) {
    children.push(new Paragraph({ text: "Trend", heading: HeadingLevel.HEADING_2 }));
    const chartPng = renderGroupedBarChartPng({
      seriesA: report.timeSeries.map((p) => p.revenue),
      seriesB: report.timeSeries.map((p) => p.expenses),
    });
    children.push(chartImageParagraph(chartPng, 500, 214));
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "■ ", color: "111827", bold: true }),
          new TextRun({ text: "Revenue   " }),
          new TextRun({ text: "■ ", color: "DC2626", bold: true }),
          new TextRun({ text: "Expenses" }),
        ],
      })
    );
    children.push(new Paragraph({ text: "" }));
    children.push(
      dataTable(
        ["Period", `Revenue (${report.currency})`, `Expenses (${report.currency})`, `Profit (${report.currency})`],
        report.timeSeries.map((p) => [
          p.label,
          p.revenue.toFixed(2),
          p.expenses.toFixed(2),
          p.profit.toFixed(2),
        ])
      )
    );
    children.push(new Paragraph({ text: "" }));
  }

  pushCategorySection(children, "Revenue by category", report.salesByCategory, report.currency, [17, 24, 39]);
  pushCategorySection(children, "Expenses by category", report.expensesByCategory, report.currency, [220, 38, 38]);

  if (insights) {
    for (const section of SECTIONS) {
      const text = insights[section.key];
      if (!text) continue;

      children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 }));

      if (section.key === "predictive" && forecast) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                italics: true,
                color: "666666",
                text: `Projected ${forecast.nextPeriodLabel}: revenue ${forecast.projectedRevenue.toFixed(2)}, expenses ${forecast.projectedExpenses.toFixed(2)}, profit ${forecast.projectedProfit.toFixed(2)} (confidence: ${forecast.confidence})`,
              }),
            ],
          })
        );
      }

      for (const paragraph of text.split("\n").filter(Boolean)) {
        children.push(new Paragraph({ text: paragraph }));
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

function pushCategorySection(
  children: (Paragraph | Table)[],
  title: string,
  items: CategoryBreakdownPoint[],
  currency: string,
  color: [number, number, number]
) {
  if (items.length === 0) return;
  children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }));
  const chartPng = renderSingleSeriesBarChartPng({ values: items.map((c) => c.amount), color });
  children.push(chartImageParagraph(chartPng, 450, Math.max(90, items.length * 20)));
  children.push(new Paragraph({ text: "" }));
  children.push(
    dataTable(
      ["Category", `Amount (${currency})`],
      items.map((c) => [c.category, c.amount.toFixed(2)])
    )
  );
  children.push(new Paragraph({ text: "" }));
}

function chartImageParagraph(png: Buffer, width: number, height: number): Paragraph {
  return new Paragraph({
    children: [
      new ImageRun({
        type: "png",
        data: png,
        transformation: { width, height },
      }),
    ],
  });
}

function summaryRow(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value }),
    ],
  });
}

function dataTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        })
    ),
  });

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell) => new TableCell({ children: [new Paragraph(cell)] })),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}
