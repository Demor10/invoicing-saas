import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MarkProposalSentButton } from "@/components/mark-proposal-sent-button";
import { DeleteProposalButton } from "@/components/delete-proposal-button";
import { PublicLinkField } from "@/components/public-link-field";
import { getPublicUrl } from "@/lib/public-url";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, client: true },
  });

  if (!proposal) notFound();

  const publicUrl = getPublicUrl(`/proposal/${proposal.publicToken}`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Proposal #{proposal.number}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {proposal.client.name} · {proposal.client.email}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[proposal.status]}`}
        >
          {proposal.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Issue date</p>
          <p className="text-gray-900">{proposal.issueDate.toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Expires</p>
          <p className="text-gray-900">
            {proposal.expiryDate ? proposal.expiryDate.toLocaleDateString() : "No expiry"}
          </p>
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Rate</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {proposal.lineItems.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2 text-gray-900">{item.description}</td>
              <td className="py-2 text-gray-700">{item.quantity}</td>
              <td className="py-2 text-gray-700">{item.rate.toFixed(2)}</td>
              <td className="py-2 text-right text-gray-900">{item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>
            {proposal.currency} {proposal.subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax ({proposal.taxRate}%)</span>
          <span>
            {proposal.currency} {proposal.taxAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>
            {proposal.currency} {proposal.total.toFixed(2)}
          </span>
        </div>
      </div>

      {proposal.notes && (
        <div className="mt-6 text-sm">
          <p className="text-gray-500">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-gray-900">{proposal.notes}</p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/proposals"
          className="text-sm text-gray-600 underline hover:text-gray-900"
        >
          ← Back to proposals
        </Link>

        <div className="flex items-center gap-4">
          {proposal.status === "DRAFT" && (
            <>
              <Link
                href={`/proposals/${proposal.id}/edit`}
                className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
              >
                Edit
              </Link>
              <DeleteProposalButton
                proposalId={proposal.id}
                proposalNumber={proposal.number}
              />
              <MarkProposalSentButton proposalId={proposal.id} />
            </>
          )}
        </div>
      </div>

      {proposal.status !== "DRAFT" && (
        <div className="mt-6 rounded-md border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700">Client-facing link</p>
          <p className="mt-1 text-xs text-gray-500">
            Anyone with this link can view and respond to the proposal — no login required.
          </p>
          <div className="mt-3">
            <PublicLinkField url={publicUrl} />
          </div>
          {proposal.status === "ACCEPTED" && (
            <p className="mt-2 text-xs text-green-700">
              Accepted{proposal.acceptedAt ? ` on ${proposal.acceptedAt.toLocaleDateString()}` : ""}.
            </p>
          )}
          {proposal.status === "DECLINED" && (
            <p className="mt-2 text-xs text-red-600">Declined by the client.</p>
          )}
        </div>
      )}
    </div>
  );
}
