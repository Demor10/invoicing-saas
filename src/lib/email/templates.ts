function baseTemplate(bodyHtml: string): string {
  // Inline styles throughout — email clients strip <style> blocks and
  // classes unpredictably, so this is the one place in the app where
  // Tailwind-style classes genuinely wouldn't work.
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">
        Sent via Invoicing &amp; Proposals
      </p>
    </div>
  `;
}

export function invoiceEmailHtml(params: {
  businessName: string;
  clientName: string;
  invoiceNumber: number;
  total: string;
  dueDate: string;
  url: string;
}): string {
  return baseTemplate(`
    <h2 style="font-size: 18px; margin-bottom: 8px;">
      Invoice #${params.invoiceNumber} from ${escapeHtml(params.businessName)}
    </h2>
    <p style="font-size: 14px; line-height: 1.5;">
      Hi ${escapeHtml(params.clientName)},<br /><br />
      You've received a new invoice for <strong>${params.total}</strong>, due
      <strong>${params.dueDate}</strong>.
    </p>
    <a
      href="${params.url}"
      style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px;"
    >
      View &amp; pay invoice
    </a>
    <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
      Or copy this link: ${params.url}
    </p>
  `);
}

export function proposalEmailHtml(params: {
  businessName: string;
  clientName: string;
  proposalNumber: number;
  total: string;
  url: string;
}): string {
  return baseTemplate(`
    <h2 style="font-size: 18px; margin-bottom: 8px;">
      Proposal #${params.proposalNumber} from ${escapeHtml(params.businessName)}
    </h2>
    <p style="font-size: 14px; line-height: 1.5;">
      Hi ${escapeHtml(params.clientName)},<br /><br />
      ${escapeHtml(params.businessName)} has sent you a proposal for
      <strong>${params.total}</strong>. Review it and let them know if you'd like to
      move forward.
    </p>
    <a
      href="${params.url}"
      style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px;"
    >
      View proposal
    </a>
    <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
      Or copy this link: ${params.url}
    </p>
  `);
}

// Business/client names come from user input, so they're escaped before
// being interpolated into raw HTML — this is an email body, not a sandboxed
// browser context, but there's no reason to skip it.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
