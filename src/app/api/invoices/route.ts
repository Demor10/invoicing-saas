import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validation/invoice";
import { calculateInvoiceTotals, calculateLineAmount } from "@/lib/invoice-calculations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    include: { client: { select: { name: true, email: true } } },
    orderBy: { number: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Make sure the client actually belongs to this user — otherwise anyone
  // could invoice against a client id they found or guessed.
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { subtotal, taxAmount, total } = calculateInvoiceTotals(lineItems, taxRate);

  const invoice = await prisma.$transaction(async (tx) => {
    // Atomically claim the next invoice number. The UPDATE takes a row lock,
    // so two concurrent requests from the same user can't collide on the
    // same number.
    const updatedUser = await tx.user.update({
      where: { id: session.user.id },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { nextInvoiceNumber: true },
    });
    const number = updatedUser.nextInvoiceNumber - 1;

    return tx.invoice.create({
      data: {
        userId: session.user.id,
        clientId,
        number,
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

  return NextResponse.json(invoice, { status: 201 });
}
