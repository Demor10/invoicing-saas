import { prisma } from "@/lib/prisma";

export type TransactionSample = {
  type: "sale" | "expense";
  description: string;
  amount: number;
  category: string | null;
  date: Date;
};

// Sampling by largest amount rather than most-recent or random: a single
// unusually large expense or sale is far more likely to explain a period's
// swing than an arbitrary recent one, which matters for the "why did this
// happen" (diagnostic) section of the analysis.
export async function sampleTransactionDescriptions(
  userId: string,
  start: Date,
  end: Date,
  limitPerType = 15
): Promise<TransactionSample[]> {
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { amount: "desc" },
      take: limitPerType,
      select: { description: true, amount: true, category: true, date: true },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { amount: "desc" },
      take: limitPerType,
      select: { description: true, amount: true, category: true, date: true },
    }),
  ]);

  return [
    ...sales.map((s) => ({ type: "sale" as const, ...s })),
    ...expenses.map((e) => ({ type: "expense" as const, ...e })),
  ];
}
