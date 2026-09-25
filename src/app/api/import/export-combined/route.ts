import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isPaidUser } from "@/lib/subscription";
import { buildEntriesFromRows } from "@/lib/import/build-entries";
import { computeAnalyticsFromEntries, type MoneyEntry } from "@/lib/analytics";
import { generateAnalyticsPdf } from "@/lib/pdf/analytics-pdf";
import { generateAnalyticsDocx } from "@/lib/docs/analytics-docx";
import { generateAnalyticsXlsx } from "@/lib/excel/analytics-xlsx";

const fileSchema = z.object({
  rows: z.array(z.array(z.string())),
  mapping: z.object({
    date: z.number().nullable(),
    description: z.number().nullable(),
    amount: z.number().nullable(),
    category: z.number().nullable(),
  }),
  currency: z.string().min(1).default("USD"),
  type: z.enum(["sale", "expense"]),
});

const requestSchema = z.object({
  files: z.array(fileSchema).min(1),
  format: z.enum(["pdf", "word", "excel"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPaidUser(session.user.id))) {
    return NextResponse.json(
      { error: "File upload analysis is a paid-plan feature." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const revenueEntries: MoneyEntry[] = [];
  const expenseEntries: MoneyEntry[] = [];

  for (const file of parsed.data.files) {
    if (file.mapping.date === null || file.mapping.description === null || file.mapping.amount === null) {
      continue;
    }
    const { valid } = buildEntriesFromRows(file.rows, file.mapping, file.currency);
    const target = file.type === "sale" ? revenueEntries : expenseEntries;
    for (const entry of valid) {
      target.push({
        amount: entry.amount,
        currency: entry.currency,
        date: new Date(entry.date),
        category: entry.category,
      });
    }
  }

  if (revenueEntries.length === 0 && expenseEntries.length === 0) {
    return NextResponse.json({ error: "No valid rows to export." }, { status: 400 });
  }

  const allDates = [...revenueEntries, ...expenseEntries].map((e) => e.date.getTime());
  const start = new Date(Math.min(...allDates));
  const end = new Date(Math.max(...allDates));
  const report = computeAnalyticsFromEntries(revenueEntries, expenseEntries, start, end);
  const businessName = `Combined analysis (${parsed.data.files.length} files)`;

  if (parsed.data.format === "pdf") {
    const pdfBytes = await generateAnalyticsPdf({ report, businessName, insights: null, forecast: null });
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="combined-analysis.pdf"`,
      },
    });
  }

  if (parsed.data.format === "word") {
    const buffer = await generateAnalyticsDocx({ report, businessName, insights: null, forecast: null });
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="combined-analysis.docx"`,
      },
    });
  }

  const buffer = await generateAnalyticsXlsx({ report, businessName, insights: null, forecast: null });
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="combined-analysis.xlsx"`,
    },
  });
}
