import type { InvoiceStatus } from "@prisma/client";

export type DashboardInvoice = {
  id: string;
  number: number;
  status: InvoiceStatus;
  total: number;
  currency: string;
  dueDate: Date;
  paidAt: Date | null;
  client: { id: string; name: string };
};

export type CurrencyTotal = { currency: string; amount: number };

function addToTotals(totals: CurrencyTotal[], currency: string, amount: number) {
  const existing = totals.find((t) => t.currency === currency);
  if (existing) {
    existing.amount += amount;
  } else {
    totals.push({ currency, amount });
  }
}

// Only used to rank the client breakdown by rough size — treats all
// currencies as equal, which is wrong across currencies but fine as a sort
// key for the common case of a single-currency freelancer.
function sumAcrossCurrencies(totals: CurrencyTotal[]) {
  return totals.reduce((sum, t) => sum + t.amount, 0);
}

export function formatTotals(totals: CurrencyTotal[]): string {
  if (totals.length === 0) return "—";
  return totals.map((t) => `${t.currency} ${t.amount.toFixed(2)}`).join(", ");
}

export function computeDashboard(invoices: DashboardInvoice[]) {
  const outstandingTotals: CurrencyTotal[] = [];
  const overdueTotals: CurrencyTotal[] = [];
  const paidThisMonthTotals: CurrencyTotal[] = [];
  const clientTotals = new Map<string, { name: string; totals: CurrencyTotal[] }>();

  const now = new Date();
  const isThisMonth = (d: Date) =>
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();

  for (const invoice of invoices) {
    if (invoice.status === "SENT") {
      addToTotals(outstandingTotals, invoice.currency, invoice.total);

      if (invoice.dueDate.getTime() < now.getTime()) {
        addToTotals(overdueTotals, invoice.currency, invoice.total);
      }

      const entry = clientTotals.get(invoice.client.id) ?? {
        name: invoice.client.name,
        totals: [] as CurrencyTotal[],
      };
      addToTotals(entry.totals, invoice.currency, invoice.total);
      clientTotals.set(invoice.client.id, entry);
    }

    if (invoice.status === "PAID" && invoice.paidAt && isThisMonth(invoice.paidAt)) {
      addToTotals(paidThisMonthTotals, invoice.currency, invoice.total);
    }
  }

  const dueSoon = invoices
    .filter((i) => i.status === "SENT")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 6)
    .map((i) => ({
      ...i,
      daysUntilDue: Math.ceil((i.dueDate.getTime() - now.getTime()) / 86_400_000),
    }));

  const clientBreakdown = Array.from(clientTotals.entries())
    .map(([clientId, { name, totals }]) => ({ clientId, name, totals }))
    .sort((a, b) => sumAcrossCurrencies(b.totals) - sumAcrossCurrencies(a.totals))
    .slice(0, 5);

  const recentInvoices = [...invoices].sort((a, b) => b.number - a.number).slice(0, 5);

  return {
    outstandingTotals,
    overdueTotals,
    paidThisMonthTotals,
    clientBreakdown,
    dueSoon,
    recentInvoices,
  };
}
