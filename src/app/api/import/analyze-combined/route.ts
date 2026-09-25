import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isPaidUser } from "@/lib/subscription";
import { buildEntriesFromRows } from "@/lib/import/build-entries";
import { computeAnalyticsFromEntries, type MoneyEntry } from "@/lib/analytics";

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
});

// Repeated-analysis mode: unlike the single-file one-off, this merges every
// file uploaded so far in this session into one combined report — a sale
// file and an expense file together, for instance, giving a running
// profit/loss view that grows as more files are added, without saving
// anything to the database (same "not blended with real records" rule as
// the one-off path).
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
  const allSkipped: { fileIndex: number; rowNumber: number; reason: string }[] = [];

  parsed.data.files.forEach((file, fileIndex) => {
    if (file.mapping.date === null || file.mapping.description === null || file.mapping.amount === null) {
      allSkipped.push({ fileIndex, rowNumber: 0, reason: "Date, description, or amount column not mapped" });
      return;
    }
    const { valid, skipped } = buildEntriesFromRows(file.rows, file.mapping, file.currency);
    const target = file.type === "sale" ? revenueEntries : expenseEntries;
    for (const entry of valid) {
      target.push({
        amount: entry.amount,
        currency: entry.currency,
        date: new Date(entry.date),
        category: entry.category,
      });
    }
    for (const s of skipped) {
      allSkipped.push({ fileIndex, ...s });
    }
  });

  if (revenueEntries.length === 0 && expenseEntries.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found across the uploaded files.", skipped: allSkipped },
      { status: 400 }
    );
  }

  const allDates = [...revenueEntries, ...expenseEntries].map((e) => e.date.getTime());
  const start = new Date(Math.min(...allDates));
  const end = new Date(Math.max(...allDates));

  const report = computeAnalyticsFromEntries(revenueEntries, expenseEntries, start, end);

  return NextResponse.json({ report, skipped: allSkipped, fileCount: parsed.data.files.length });
}
