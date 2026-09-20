import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const proposal = await prisma.proposal.findUnique({ where: { publicToken: token } });
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (proposal.status !== "SENT") {
    return NextResponse.json(
      { error: "This proposal can no longer be declined." },
      { status: 409 }
    );
  }

  const updated = await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "DECLINED" },
  });

  return NextResponse.json(updated);
}
