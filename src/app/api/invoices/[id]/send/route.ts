import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvoiceEmail } from "@/lib/email/send-invoice-email";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { client: true, user: { select: { businessName: true } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (invoice.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft invoices can be marked as sent." },
      { status: 409 }
    );
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: "SENT" },
  });

  // The status change is the important, durable part — it always happens.
  // Email delivery is reported alongside it but never rolls the status
  // change back, since a flaky email provider shouldn't block the workflow.
  const emailResult = await sendInvoiceEmail(invoice);

  return NextResponse.json({ ...updated, emailResult });
}
