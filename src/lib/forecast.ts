import type { TimeSeriesPoint } from "@/lib/analytics";

export type Forecast = {
  nextPeriodLabel: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
  // How much of the historical variance the trend line actually explains.
  // Low confidence with few data points or volatile numbers — surfaced so
  // the narrative (and the UI) can caveat appropriately rather than stating
  // a projection as if it were certain.
  confidence: "low" | "medium" | "high";
};

// Ordinary least-squares fit of y = a + b*x over the bucket index, projected
// one bucket past the last one. Deliberately simple and explainable rather
// than a fancier model — a small business's month-to-month numbers rarely
// justify more sophistication, and a transparent method is easier to trust
// (and to explain to the user) than a black box.
function linearRegression(values: number[]): { intercept: number; slope: number; rSquared: number } {
  const n = values.length;
  if (n === 0) return { intercept: 0, slope: 0, rSquared: 0 };
  if (n === 1) return { intercept: values[0], slope: 0, rSquared: 0 };

  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = values.reduce((s, y) => s + y, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - meanY) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { intercept, slope, rSquared };
}

export function computeForecast(timeSeries: TimeSeriesPoint[]): Forecast | null {
  if (timeSeries.length < 3) {
    // Not enough points for a trend line to mean anything.
    return null;
  }

  const revenueFit = linearRegression(timeSeries.map((p) => p.revenue));
  const expensesFit = linearRegression(timeSeries.map((p) => p.expenses));
  const nextIndex = timeSeries.length;

  const projectedRevenue = Math.max(0, revenueFit.intercept + revenueFit.slope * nextIndex);
  const projectedExpenses = Math.max(0, expensesFit.intercept + expensesFit.slope * nextIndex);

  const avgRSquared = (revenueFit.rSquared + expensesFit.rSquared) / 2;
  let confidence: Forecast["confidence"] =
    avgRSquared > 0.5 ? "high" : avgRSquared > 0.2 ? "medium" : "low";
  // A clean-looking fit through very few points is easy to get by chance —
  // cap it down a level rather than reporting false certainty, but don't
  // override a genuinely poor fit's "low" rating with anything higher.
  if (timeSeries.length < 5 && confidence === "high") {
    confidence = "medium";
  }

  return {
    nextPeriodLabel: "next period",
    projectedRevenue: round2(projectedRevenue),
    projectedExpenses: round2(projectedExpenses),
    projectedProfit: round2(projectedRevenue - projectedExpenses),
    confidence,
  };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
