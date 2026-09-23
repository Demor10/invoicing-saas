import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
} from "docx";
import type { AnalyticsReport } from "@/lib/analytics";
import { formatTotals } from "@/lib/money";

export async function generateAnalyticsDocx(params: {
  report: AnalyticsReport;
  businessName: string;
  aiNarrative: string | null;
}): Promise<Buffer> {
  const { report, businessName, aiNarrative } = params;

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

  if (report.salesByCategory.length > 0) {
    children.push(new Paragraph({ text: "Revenue by category", heading: HeadingLevel.HEADING_2 }));
    children.push(
      dataTable(
        ["Category", `Amount (${report.currency})`],
        report.salesByCategory.map((c) => [c.category, c.amount.toFixed(2)])
      )
    );
    children.push(new Paragraph({ text: "" }));
  }

  if (report.expensesByCategory.length > 0) {
    children.push(new Paragraph({ text: "Expenses by category", heading: HeadingLevel.HEADING_2 }));
    children.push(
      dataTable(
        ["Category", `Amount (${report.currency})`],
        report.expensesByCategory.map((c) => [c.category, c.amount.toFixed(2)])
      )
    );
    children.push(new Paragraph({ text: "" }));
  }

  if (aiNarrative) {
    children.push(new Paragraph({ text: "AI Analysis", heading: HeadingLevel.HEADING_2 }));
    for (const paragraph of aiNarrative.split("\n").filter(Boolean)) {
      children.push(new Paragraph({ text: paragraph }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
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
