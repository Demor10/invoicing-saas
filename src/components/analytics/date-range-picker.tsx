import Link from "next/link";
import type { RangePreset } from "@/lib/date-ranges";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

export function DateRangePicker({
  currentPreset,
  customStart,
  customEnd,
}: {
  currentPreset: RangePreset;
  customStart?: string;
  customEnd?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <Link
          key={preset.value}
          href={`/analytics?preset=${preset.value}`}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            currentPreset === preset.value
              ? "bg-gray-900 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {preset.label}
        </Link>
      ))}

      <form action="/analytics" method="get" className="flex items-center gap-2">
        <input type="hidden" name="preset" value="custom" />
        <input
          type="date"
          name="start"
          defaultValue={customStart}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="date"
          name="end"
          defaultValue={customEnd}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            currentPreset === "custom"
              ? "bg-gray-900 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Apply
        </button>
      </form>
    </div>
  );
}
