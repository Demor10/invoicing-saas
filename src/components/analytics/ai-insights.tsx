"use client";

import { useEffect, useState } from "react";

type AnalyticsInsights = {
  descriptive: string;
  diagnostic: string;
  predictive: string;
  prescriptive: string;
};

type Forecast = {
  nextPeriodLabel: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
  confidence: "low" | "medium" | "high";
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; insights: AnalyticsInsights; forecast: Forecast | null };

const SECTIONS: { key: keyof AnalyticsInsights; title: string; subtitle: string }[] = [
  { key: "descriptive", title: "Descriptive", subtitle: "What happened" },
  { key: "diagnostic", title: "Diagnostic", subtitle: "Why it happened" },
  { key: "predictive", title: "Predictive", subtitle: "What's likely next" },
  { key: "prescriptive", title: "Prescriptive", subtitle: "What to do about it" },
];

export function AiInsights({ queryString }: { queryString: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/analytics/insights?${queryString}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", message: data.error ?? "Failed to generate insights." });
          return;
        }
        setState({ status: "ready", insights: data.insights, forecast: data.forecast ?? null });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error", message: "Failed to generate insights." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  if (state.status === "loading") {
    return <p className="text-sm text-gray-400">Generating analysis...</p>;
  }

  if (state.status === "error") {
    return <p className="text-sm text-gray-500">{state.message}</p>;
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map(({ key, title, subtitle }) => {
        const text = state.insights[key];
        if (!text) return null;
        return (
          <div key={key}>
            <h3 className="text-sm font-semibold text-gray-900">
              {title} <span className="font-normal text-gray-400">— {subtitle}</span>
            </h3>
            <div className="mt-1 space-y-2 text-sm leading-relaxed text-gray-700">
              {text
                .split("\n")
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
            {key === "predictive" && state.forecast && (
              <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Projected {state.forecast.nextPeriodLabel}: revenue{" "}
                {state.forecast.projectedRevenue.toFixed(2)}, expenses{" "}
                {state.forecast.projectedExpenses.toFixed(2)}, profit{" "}
                {state.forecast.projectedProfit.toFixed(2)} — confidence: {state.forecast.confidence}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
