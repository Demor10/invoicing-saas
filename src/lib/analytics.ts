import { prisma } from "@/lib/prisma";
import { groupByCurrency, type CurrencyTotal } from "@/lib/money";
import { pickGranularity, bucketKey, bucketLabel, type Granularity } from "@/lib/date-ranges";

export type TimeSeriesPoint = {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export type CategoryBreakdownPoint = { category: string; amount: number };

export type MoneyEntry = {
  amount: number;
  currency: string;
  date: Date;
  category?: string | null;
};

export type AnalyticsReport = {
  range: { start: Date; end: Date };
  // The single currency driving the chart/category data below — combining
  // different currencies into one bar chart would produce a meaningless
  // number, so we pick whichever currency has the most transaction volume
  // and note if anything else was excluded. Top-line totals (revenueTotals
  // etc.) are still correct per-currency.
  currency: string;
  otherCurrenciesExcluded: boolean;
  revenueTotals: CurrencyTotal[];
  expenseTotals: CurrencyTotal[];
  profitTotals: CurrencyTotal[];
  timeSeries: TimeSeriesPoint[];
  granularity: Granularity;
  salesByCategory: CategoryBreakdownPoint[];
  expensesByCategory: CategoryBreakdownPoint[];
};

// Pure aggregation logic — no database access, so it works equally for a
// user's real Sales/Expenses/PAID invoices (see computeAnalytics below) and
// for one-off uploaded-file data that's never touched the database (see
// src/lib/import). Keeping this pure also makes it directly testable.
export function computeAnalyticsFromEntries(
  revenueEntries: MoneyEntry[],
  expenseEntries: MoneyEntry[],
  start: Date,
  end: Date
): AnalyticsReport {
  const revenueTotals = groupByCurrency(
    revenueEntries,
    (e) => e.amount,
    (e) => e.currency
  );
  const expenseTotals = groupByCurrency(
    expenseEntries,
    (e) => e.amount,
    (e) => e.currency
  );

  const profitTotals: CurrencyTotal[] = revenueTotals.map((rt) => ({
    currency: rt.currency,
    amount: rt.amount - (expenseTotals.find((et) => et.currency === rt.currency)?.amount ?? 0),
  }));
  for (const et of expenseTotals) {
    if (!profitTotals.some((pt) => pt.currency === et.currency)) {
      profitTotals.push({ currency: et.currency, amount: -et.amount });
    }
  }

  const volumeByCurrency = new Map<string, number>();
  for (const e of [...revenueEntries, ...expenseEntries]) {
    volumeByCurrency.set(e.currency, (volumeByCurrency.get(e.currency) ?? 0) + Math.abs(e.amount));
  }
  const currencies = Array.from(volumeByCurrency.keys());
  const dominantCurrency =
    [...currencies].sort((a, b) => volumeByCurrency.get(b)! - volumeByCurrency.get(a)!)[0] ??
    "USD";
  const otherCurrenciesExcluded = currencies.length > 1;

  const granularity = pickGranularity(start, end);

  const buckets = new Map<string, TimeSeriesPoint>();
  const getBucket = (date: Date) => {
    const key = bucketKey(date, granularity);
    let point = buckets.get(key);
    if (!point) {
      point = { key, label: bucketLabel(key, granularity), revenue: 0, expenses: 0, profit: 0 };
      buckets.set(key, point);
    }
    return point;
  };

  for (const entry of revenueEntries) {
    if (entry.currency !== dominantCurrency) continue;
    getBucket(entry.date).revenue += entry.amount;
  }
  for (const entry of expenseEntries) {
    if (entry.currency !== dominantCurrency) continue;
    getBucket(entry.date).expenses += entry.amount;
  }
  for (const point of buckets.values()) {
    point.profit = point.revenue - point.expenses;
  }

  const timeSeries = Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));

  const salesByCategory = groupCategoryTotals(
    revenueEntries.filter((e) => e.currency === dominantCurrency)
  );
  const expensesByCategory = groupCategoryTotals(
    expenseEntries.filter((e) => e.currency === dominantCurrency)
  );

  return {
    range: { start, end },
    currency: dominantCurrency,
    otherCurrenciesExcluded,
    revenueTotals,
    expenseTotals,
    profitTotals,
    timeSeries,
    granularity,
    salesByCategory,
    expensesByCategory,
  };
}

export async function computeAnalytics(
  userId: string,
  start: Date,
  end: Date
): Promise<AnalyticsReport> {
  const [sales, expenses, paidInvoicesRaw] = await Promise.all([
    prisma.sale.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.expense.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.invoice.findMany({
      where: { userId, status: "PAID", paidAt: { gte: start, lte: end } },
      select: { total: true, currency: true, paidAt: true },
    }),
  ]);

  // Defensive filter: a PAID invoice should always have paidAt set (the
  // Stripe webhook we'll build later sets both together), but don't assume
  // it under a non-null cast — just skip anything inconsistent.
  const paidInvoices = paidInvoicesRaw.filter(
    (i): i is typeof i & { paidAt: Date } => i.paidAt !== null
  );

  const revenueEntries: MoneyEntry[] = [
    ...sales.map((s) => ({ amount: s.amount, currency: s.currency, date: s.date, category: s.category })),
    ...paidInvoices.map((i) => ({ amount: i.total, currency: i.currency, date: i.paidAt })),
  ];
  const expenseEntries: MoneyEntry[] = expenses.map((e) => ({
    amount: e.amount,
    currency: e.currency,
    date: e.date,
    category: e.category,
  }));

  return computeAnalyticsFromEntries(revenueEntries, expenseEntries, start, end);
}

function groupCategoryTotals(
  entries: { category?: string | null; amount: number }[]
): CategoryBreakdownPoint[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const category = entry.category?.trim() || "Uncategorized";
    map.set(category, (map.get(category) ?? 0) + entry.amount);
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
