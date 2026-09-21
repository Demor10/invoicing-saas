import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moneyEntrySchema } from "@/lib/validation/money-entry";

async function getOwnedSale(saleId: string, userId: string) {
  return prisma.sale.findFirst({ where: { id: saleId, userId } });
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
  const sale = await getOwnedSale(id, session.user.id);
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  return NextResponse.json(sale);
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
  const existing = await getOwnedSale(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = moneyEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { date, description, amount, currency, category } = parsed.data;

  const sale = await prisma.sale.update({
    where: { id },
    data: {
      date: new Date(date),
      description,
      amount,
      currency,
      category: category || null,
    },
  });

  return NextResponse.json(sale);
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
  const existing = await getOwnedSale(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  await prisma.sale.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
