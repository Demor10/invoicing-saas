import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPaidUser } from "@/lib/subscription";
import { buildEntriesFromRows } from "@/lib/import/build-entries";
import { computeAnalyticsFromEntries, type MoneyEntry } from "@/lib/analytics";

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
  action: z.enum(["import", "analyze"]),
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

  const { rows, mapping, currency, type, action } = parsed.data;

  if (mapping.date === null || mapping.description === null || mapping.amount === null) {
    return NextResponse.json(
      { error: "Date, description, and amount columns must all be mapped." },
      { status: 400 }
    );
  }

  const { valid, skipped } = buildEntriesFromRows(rows, mapping, currency);

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found — check your column mapping.", skipped },
      { status: 400 }
    );
  }

  if (action === "import") {
    // Deliberately two separate branches rather than storing prisma.sale /
    // prisma.expense in one shared variable — Prisma's generated types often
    // reject calling .create() on a delegate held in a union-typed variable,
    // even when the two models are structurally identical, because each is
    // internally branded as a distinct type. Same reasoning as keeping
    // Invoice and Proposal code paths separate everywhere else in this app.
    const imported =
      type === "sale"
        ? (
            await prisma.$transaction(
              valid.map((entry) =>
                prisma.sale.create({
                  data: {
                    userId: session.user.id,
                    date: new Date(entry.date),
                    description: entry.description,
                    amount: entry.amount,
                    currency: entry.currency,
                    category: entry.category || null,
                  },
                })
              )
            )
          ).length
        : (
            await prisma.$transaction(
              valid.map((entry) =>
                prisma.expense.create({
                  data: {
                    userId: session.user.id,
                    date: new Date(entry.date),
                    description: entry.description,
                    amount: entry.amount,
                    currency: entry.currency,
                    category: entry.category || null,
                  },
                })
              )
            )
          ).length;

    return NextResponse.json({ imported, skipped });
  }

  // action === "analyze": a one-off look at just this file's data, isolated
  // from the user's existing records — not blended with their real Sales/
  // Expenses. Uses the file's own date span rather than a picked range.
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

  return NextResponse.json({ report, skipped });
}
