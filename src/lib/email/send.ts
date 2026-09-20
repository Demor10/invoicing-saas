import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type SendEmailResult = { success: true } | { success: false; error: string };

// Deliberately never throws — a failed email should never be the reason a
// "mark as sent" action fails outright. Callers check `.success` and decide
// how to surface it (see the send/route.ts handlers, which still mark the
// invoice/proposal as sent either way and report the email result separately).
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    return {
      success: false,
      error: "Email sending isn't configured yet (RESEND_API_KEY is missing).",
    };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    return {
      success: false,
      error: "Email sending isn't configured yet (EMAIL_FROM is missing).",
    };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error sending email.",
    };
  }
}
