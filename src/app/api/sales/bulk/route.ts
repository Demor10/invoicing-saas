import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { multiMoneyEntrySchema } from "@/lib/validation/money-entry";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = multiMoneyEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // All-or-nothing: if any entry is somehow invalid at this point, none of
  // them are saved, rather than silently creating a partial batch.
  const sales = await prisma.$transaction(
    parsed.data.entries.map((entry) =>
      prisma.sale.create({
        data: {
          userId: session.user.id,
          date: new Date(entry.date),
          description: entry.description,
          amount: entry.amount,
          currency: entry.currency,
          category: entry.category || null,
        },
      })
    )
  );

  return NextResponse.json(sales, { status: 201 });
}
