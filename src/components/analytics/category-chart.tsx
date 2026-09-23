"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { CategoryBreakdownPoint } from "@/lib/analytics";

export function CategoryChart({
  data,
  color,
}: {
  data: CategoryBreakdownPoint[];
  color: string;
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-gray-400">
        Nothing recorded in this period.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={110} />
        <Tooltip
          formatter={(value) => (typeof value === "number" ? value.toFixed(2) : String(value ?? ""))}
        />
        <Bar dataKey="amount" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
