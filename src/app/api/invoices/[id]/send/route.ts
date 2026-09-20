import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json(updated);
}
