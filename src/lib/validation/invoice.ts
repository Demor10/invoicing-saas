import { z } from "zod";

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  rate: z.coerce.number().min(0, "Can't be negative"),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().min(1).default("USD"),
  taxRate: z.coerce.number().min(0, "Can't be negative").max(100, "Can't exceed 100%"),
  notes: z.string().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1, "Add at least one line item"),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type InvoiceFormInput = z.input<typeof invoiceSchema>;
export type InvoiceLineItemValues = z.infer<typeof invoiceLineItemSchema>;
