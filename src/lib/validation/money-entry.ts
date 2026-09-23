import { z } from "zod";

// Shared shape for both Sale and Expense — they're structurally identical
// simple ledger entries, just stored in different tables.
export const moneyEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Must be greater than 0"),
  currency: z.string().min(1).default("USD"),
  category: z.string().optional(),
});

export type MoneyEntryFormValues = z.infer<typeof moneyEntrySchema>;
export type MoneyEntryFormInput = z.input<typeof moneyEntrySchema>;

// For adding several entries in one sitting (e.g. logging three sales at
// once) without navigating back to the dashboard between each one.
export const multiMoneyEntrySchema = z.object({
  entries: z.array(moneyEntrySchema).min(1, "Add at least one entry"),
});

export type MultiMoneyEntryValues = z.infer<typeof multiMoneyEntrySchema>;
export type MultiMoneyEntryInput = z.input<typeof multiMoneyEntrySchema>;
