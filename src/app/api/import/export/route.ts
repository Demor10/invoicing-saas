import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isPaidUser } from "@/lib/subscription";
import { buildEntriesFromRows } from "@/lib/import/build-entries";
import { computeAnalyticsFromEntries, type MoneyEntry } from "@/lib/analytics";
import { generateAnalyticsPdf } from "@/lib/pdf/analytics-pdf";
import { generateAnalyticsDocx } from "@/lib/docs/analytics-docx";
import { generateAnalyticsXlsx } from "@/lib/excel/analytics-xlsx";

const requestSchema = z.object({
  rows: z.array(z.array(z.string())),
  mapping: z.object({
    date: z.number().nullable(),
    description: z.number().nullable(),
    amount: z.number().nullable(),
    category: z.number().nullable(),
  }),
  currency: z.string().min(1).default("USD"),
  type: z.enum(["sale", "expense"]),
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

  const { rows, mapping, currency, type, format } = parsed.data;

  if (mapping.date === null || mapping.description === null || mapping.amount === null) {
    return NextResponse.json(
      { error: "Date, description, and amount columns must all be mapped." },
      { status: 400 }
    );
  }

  const { valid } = buildEntriesFromRows(rows, mapping, currency);
  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid rows to export." }, { status: 400 });
  }

  const entries: MoneyEntry[] = valid.map((e) => ({
    amount: e.amount,
    currency: e.currency,
    date: new Date(e.date),
    category: e.category,
  }));
  const dates = entries.map((e) => e.date.getTime());
  const start = new Date(Math.min(...dates));
  const end = new Date(Math.max(...dates));

  const report =
    type === "sale"
      ? computeAnalyticsFromEntries(entries, [], start, end)
      : computeAnalyticsFromEntries([], entries, start, end);

  // No AI narrative or forecast here, deliberately — this matches exactly
  // what the one-off "Analyze" view shows on screen. Adding extra content
  // to the export that isn't visible in the app would be confusing.
  const businessName = "File analysis";

  if (format === "pdf") {
    const pdfBytes = await generateAnalyticsPdf({ report, businessName, insights: null, forecast: null });
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="file-analysis.pdf"`,
      },
    });
  }

  if (format === "word") {
    const buffer = await generateAnalyticsDocx({ report, businessName, insights: null, forecast: null });
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="file-analysis.docx"`,
      },
    });
  }

  const buffer = await generateAnalyticsXlsx({ report, businessName, insights: null, forecast: null });
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="file-analysis.xlsx"`,
    },
  });
}
