import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/validation/proposal";
import { calculateInvoiceTotals, calculateLineAmount } from "@/lib/invoice-calculations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const proposals = await prisma.proposal.findMany({
    where: { userId: session.user.id },
    include: { client: { select: { name: true, email: true } } },
    orderBy: { number: "desc" },
  });

  return NextResponse.json(proposals);
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

  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { clientId, expiryDate, currency, taxRate, notes, lineItems } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { subtotal, taxAmount, total } = calculateInvoiceTotals(lineItems, taxRate);

  const proposal = await prisma.$transaction(async (tx) => {
    // Same atomic-claim pattern as invoice numbering — see
    // src/app/api/invoices/route.ts for why this is safe under concurrency.
    const updatedUser = await tx.user.update({
      where: { id: session.user.id },
      data: { nextProposalNumber: { increment: 1 } },
      select: { nextProposalNumber: true },
    });
    const number = updatedUser.nextProposalNumber - 1;

    return tx.proposal.create({
      data: {
        userId: session.user.id,
        clientId,
        number,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
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

  return NextResponse.json(proposal, { status: 201 });
}
