export type CurrencyTotal = { currency: string; amount: number };

export function addToTotals(totals: CurrencyTotal[], currency: string, amount: number) {
  const existing = totals.find((t) => t.currency === currency);
  if (existing) {
    existing.amount += amount;
  } else {
    totals.push({ currency, amount });
  }
}

export function groupByCurrency<T>(
  items: T[],
  getAmount: (item: T) => number,
  getCurrency: (item: T) => string
): CurrencyTotal[] {
  const totals: CurrencyTotal[] = [];
  for (const item of items) {
    addToTotals(totals, getCurrency(item), getAmount(item));
  }
  return totals;
}

// Only used to rank/compare by rough size — treats all currencies as equal,
// which is wrong across currencies but fine as a sort key for the common
// case of a single-currency user.
export function sumAcrossCurrencies(totals: CurrencyTotal[]) {
  return totals.reduce((sum, t) => sum + t.amount, 0);
}

export function formatTotals(totals: CurrencyTotal[]): string {
  if (totals.length === 0) return "—";
  return totals.map((t) => `${t.currency} ${t.amount.toFixed(2)}`).join(", ");
}
