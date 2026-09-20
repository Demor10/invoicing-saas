import { sendEmail, type SendEmailResult } from "@/lib/email/send";
import { invoiceEmailHtml } from "@/lib/email/templates";
import { getPublicUrl } from "@/lib/public-url";

export async function sendInvoiceEmail(invoice: {
  number: number;
  total: number;
  currency: string;
  dueDate: Date;
  publicToken: string;
  client: { name: string; email: string };
  user: { businessName: string | null };
}): Promise<SendEmailResult> {
  return sendEmail({
    to: invoice.client.email,
    subject: `Invoice #${invoice.number} from ${invoice.user.businessName ?? "your service provider"}`,
    html: invoiceEmailHtml({
      businessName: invoice.user.businessName ?? "Your service provider",
      clientName: invoice.client.name,
      invoiceNumber: invoice.number,
      total: `${invoice.currency} ${invoice.total.toFixed(2)}`,
      dueDate: invoice.dueDate.toLocaleDateString(),
      url: getPublicUrl(`/invoice/${invoice.publicToken}`),
    }),
  });
}
