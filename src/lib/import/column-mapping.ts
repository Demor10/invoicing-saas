export type FieldMapping = {
  date: number | null;
  description: number | null;
  amount: number | null;
  category: number | null;
};

const KEYWORDS: Record<keyof FieldMapping, string[]> = {
  date: ["date", "transaction date", "day", "when"],
  description: ["description", "desc", "item", "memo", "note", "details", "name"],
  amount: ["amount", "value", "total", "price", "sum", "cost"],
  category: ["category", "type", "tag", "class", "group"],
};

// Best-effort guess by header name, case-insensitive exact-then-substring
// match. The UI always lets the user override this — it's a starting point,
// not a requirement to get right.
export function guessColumnMapping(headers: string[]): FieldMapping {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  const mapping: FieldMapping = { date: null, description: null, amount: null, category: null };

  for (const field of Object.keys(KEYWORDS) as (keyof FieldMapping)[]) {
    const keywords = KEYWORDS[field];

    // Exact match first
    let index = normalized.findIndex((h) => keywords.includes(h));
    // Fall back to substring match
    if (index === -1) {
      index = normalized.findIndex((h) => keywords.some((k) => h.includes(k)));
    }
    if (index !== -1) {
      mapping[field] = index;
    }
  }

  return mapping;
}
