import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/validation/proposal";
import { calculateInvoiceTotals, calculateLineAmount } from "@/lib/invoice-calculations";

async function getOwnedProposal(proposalId: string, userId: string) {
  return prisma.proposal.findFirst({
    where: { id: proposalId, userId },
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
  const proposal = await getOwnedProposal(id, session.user.id);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json(proposal);
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
  const existing = await getOwnedProposal(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft proposals can be edited. This one has already been sent." },
      { status: 409 }
    );
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
    await tx.proposalLineItem.deleteMany({ where: { proposalId: id } });

    return tx.proposal.update({
      where: { id },
      data: {
        clientId,
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

  return NextResponse.json(proposal);
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
  const existing = await getOwnedProposal(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft proposals can be deleted. This one has already been sent." },
      { status: 409 }
    );
  }

  await prisma.proposal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
