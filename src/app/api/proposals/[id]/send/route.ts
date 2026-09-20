import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendProposalEmail } from "@/lib/email/send-proposal-email";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id, userId: session.user.id },
    include: { client: true, user: { select: { businessName: true } } },
  });
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft proposals can be marked as sent." },
      { status: 409 }
    );
  }

  const updated = await prisma.proposal.update({
    where: { id },
    data: { status: "SENT" },
  });

  const emailResult = await sendProposalEmail(proposal);

  return NextResponse.json({ ...updated, emailResult });
}
