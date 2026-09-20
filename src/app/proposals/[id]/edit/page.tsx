import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditProposalForm } from "@/components/edit-proposal-form";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!proposal) notFound();

  if (proposal.status !== "DRAFT") {
    redirect(`/proposals/${proposal.id}`);
  }

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">
        Edit proposal #{proposal.number}
      </h1>
      <div className="mt-6">
        <EditProposalForm
          proposalId={proposal.id}
          clients={clients}
          defaultValues={{
            clientId: proposal.clientId,
            expiryDate: proposal.expiryDate
              ? proposal.expiryDate.toISOString().slice(0, 10)
              : "",
            currency: proposal.currency,
            taxRate: proposal.taxRate,
            notes: proposal.notes ?? "",
            lineItems: proposal.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
            })),
          }}
        />
      </div>
    </div>
  );
}
