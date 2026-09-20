import { z } from "zod";
import { invoiceLineItemSchema } from "@/lib/validation/invoice";

// Line items work identically to invoices (description/qty/rate), so we
// reuse that schema rather than duplicating it.
export const proposalSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  expiryDate: z.string().optional(),
  currency: z.string().min(1).default("USD"),
  taxRate: z.coerce.number().min(0, "Can't be negative").max(100, "Can't exceed 100%"),
  notes: z.string().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1, "Add at least one line item"),
});

export type ProposalFormValues = z.infer<typeof proposalSchema>;
export type ProposalFormInput = z.input<typeof proposalSchema>;
