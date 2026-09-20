import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
