import { sendEmail, type SendEmailResult } from "@/lib/email/send";
import { proposalEmailHtml } from "@/lib/email/templates";
import { getPublicUrl } from "@/lib/public-url";

export async function sendProposalEmail(proposal: {
  number: number;
  total: number;
  currency: string;
  publicToken: string;
  client: { name: string; email: string };
  user: { businessName: string | null };
}): Promise<SendEmailResult> {
  return sendEmail({
    to: proposal.client.email,
    subject: `Proposal #${proposal.number} from ${proposal.user.businessName ?? "your service provider"}`,
    html: proposalEmailHtml({
      businessName: proposal.user.businessName ?? "Your service provider",
      clientName: proposal.client.name,
      proposalNumber: proposal.number,
      total: `${proposal.currency} ${proposal.total.toFixed(2)}`,
      url: getPublicUrl(`/proposal/${proposal.publicToken}`),
    }),
  });
}
