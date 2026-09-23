export type RangePreset = "today" | "week" | "month" | "year" | "custom";
export type Granularity = "day" | "week" | "month";

export function resolveRange(
  preset: RangePreset,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  switch (preset) {
    case "today":
      return { start: startOfToday, end: endOfToday };
    case "week": {
      const day = startOfToday.getDay(); // 0 = Sunday
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - day);
      return { start, end: endOfToday };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfToday };
    case "custom":
      return {
        start: customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1),
        end: customEnd ? new Date(customEnd) : endOfToday,
      };
  }
}

// Picks a sensible bucket size so a chart never renders 365 daily bars for a
// full-year view, nor a single bucket for a single day.
export function pickGranularity(start: Date, end: Date): Granularity {
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}

export function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === "day") {
    return date.toISOString().slice(0, 10);
  }
  if (granularity === "week") {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day); // normalize to the Sunday of that week
    return d.toISOString().slice(0, 10);
  }
  // month
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  const date = new Date(key);
  if (granularity === "week") {
    return `Wk of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
