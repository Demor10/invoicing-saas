export type LineItemInput = {
  description: string;
  quantity: number;
  rate: number;
};

export function calculateLineAmount(item: LineItemInput): number {
  return round2(item.quantity * item.rate);
}

export function calculateInvoiceTotals(
  lineItems: LineItemInput[],
  taxRatePercent: number
) {
  const subtotal = round2(
    lineItems.reduce((sum, item) => sum + calculateLineAmount(item), 0)
  );
  const taxAmount = round2(subtotal * (taxRatePercent / 100));
  const total = round2(subtotal + taxAmount);

  return { subtotal, taxAmount, total };
}

// Avoid floating point artifacts like 19.999999999999996 in money totals.
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
