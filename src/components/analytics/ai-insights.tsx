"use client";

import { useEffect, useState } from "react";

export function AiInsights({ queryString }: { queryString: string }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "ready"; text: string }
  >({ status: "loading" });

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
        setState({ status: "ready", text: data.text });
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
    <div className="space-y-3 text-sm leading-relaxed text-gray-800">
      {state.text.split("\n").filter(Boolean).map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}
