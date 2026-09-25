import { moneyEntrySchema, type MoneyEntryFormValues } from "@/lib/validation/money-entry";
import type { FieldMapping } from "@/lib/import/column-mapping";

export type BuildEntriesResult = {
  valid: MoneyEntryFormValues[];
  skipped: { rowNumber: number; reason: string }[];
};

// Parses a date cell that could be an ISO string, a locale date string, or
// (from Excel) already-normalized to YYYY-MM-DD by parse-file.ts. Returns
// null rather than throwing on anything unparseable, so the caller can skip
// just that one row instead of failing the whole import.
function parseDateCell(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const asDate = new Date(trimmed);
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString().slice(0, 10);
}

function parseAmountCell(value: string): number | null {
  // Strip common currency symbols/thousands separators (e.g. "$1,234.56")
  // before parsing — spreadsheet exports very often format amounts this way.
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function buildEntriesFromRows(
  rows: string[][],
  mapping: FieldMapping,
  defaultCurrency: string
): BuildEntriesResult {
  const valid: MoneyEntryFormValues[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row itself

    const dateCell = mapping.date !== null ? row[mapping.date] : undefined;
    const descriptionCell = mapping.description !== null ? row[mapping.description] : undefined;
    const amountCell = mapping.amount !== null ? row[mapping.amount] : undefined;
    const categoryCell = mapping.category !== null ? row[mapping.category] : undefined;

    if (!dateCell || !descriptionCell || !amountCell) {
      skipped.push({ rowNumber, reason: "Missing date, description, or amount" });
      return;
    }

    const date = parseDateCell(dateCell);
    if (!date) {
      skipped.push({ rowNumber, reason: `Unrecognized date: "${dateCell}"` });
      return;
    }

    const amount = parseAmountCell(amountCell);
    if (amount === null || amount <= 0) {
      skipped.push({ rowNumber, reason: `Invalid amount: "${amountCell}"` });
      return;
    }

    const candidate = {
      date,
      description: descriptionCell.trim(),
      amount,
      currency: defaultCurrency,
      category: categoryCell?.trim() || undefined,
    };

    const parsed = moneyEntrySchema.safeParse(candidate);
    if (!parsed.success) {
      skipped.push({
        rowNumber,
        reason: parsed.error.issues[0]?.message ?? "Invalid row",
      });
      return;
    }

    valid.push(parsed.data);
  });

  return { valid, skipped };
}
