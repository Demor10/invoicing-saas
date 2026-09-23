"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { TimeSeriesPoint } from "@/lib/analytics";

export function RevenueChart({ data }: { data: TimeSeriesPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-gray-400">
        No transactions in this period yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => (typeof value === "number" ? value.toFixed(2) : String(value ?? ""))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
