import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validation/invoice";
import { calculateInvoiceTotals, calculateLineAmount } from "@/lib/invoice-calculations";

async function getOwnedInvoice(invoiceId: string, userId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, client: true },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getOwnedInvoice(id, session.user.id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedInvoice(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft invoices can be edited. This one has already been sent." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { clientId, dueDate, currency, taxRate, notes, lineItems } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { subtotal, taxAmount, total } = calculateInvoiceTotals(lineItems, taxRate);

  // Replace all line items rather than trying to diff/merge them — simpler
  // and correct, since a full edit form always submits the complete set.
  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });

    return tx.invoice.update({
      where: { id },
      data: {
        clientId,
        dueDate: new Date(dueDate),
        currency,
        taxRate,
        notes,
        subtotal,
        taxAmount,
        total,
        lineItems: {
          create: lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: calculateLineAmount(item),
            sortOrder: index,
          })),
        },
      },
      include: { lineItems: true },
    });
  });

  return NextResponse.json(invoice);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedInvoice(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft invoices can be deleted. This one has already been sent." },
      { status: 409 }
    );
  }

  await prisma.invoice.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
