import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProposalResponseButtons } from "@/components/proposal-response-buttons";

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      user: {
        select: { businessName: true, businessAddress: true, businessLogoUrl: true },
      },
    },
  });

  if (!proposal || proposal.status === "DRAFT") {
    notFound();
  }

  // This is a Server Component that renders fresh per request, so evaluating
  // "now" at request time is correct here, not a stale-render risk.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isExpired =
    proposal.status === "SENT" && proposal.expiryDate !== null && proposal.expiryDate.getTime() < now;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between border-b border-gray-200 pb-6">
        <div>
          {proposal.user.businessLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- external, unknown-dimension logo URLs supplied by the user
            <img
              src={proposal.user.businessLogoUrl}
              alt={proposal.user.businessName ?? "Business logo"}
              className="mb-2 h-10 w-auto object-contain"
            />
          )}
          <p className="text-lg font-semibold text-gray-900">
            {proposal.user.businessName ?? "Proposal"}
          </p>
          {proposal.user.businessAddress && (
            <p className="whitespace-pre-wrap text-sm text-gray-500">
              {proposal.user.businessAddress}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isExpired ? "bg-gray-100 text-gray-700" : (STATUS_STYLES[proposal.status] ?? "bg-gray-100 text-gray-700")
          }`}
        >
          {isExpired ? "EXPIRED" : proposal.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Proposal</p>
          <p className="text-gray-900">#{proposal.number}</p>
        </div>
        <div>
          <p className="text-gray-500">Prepared for</p>
          <p className="text-gray-900">{proposal.client.name}</p>
          <p className="text-gray-500">{proposal.client.email}</p>
        </div>
        {proposal.expiryDate && (
          <div>
            <p className="text-gray-500">Expires</p>
            <p className="text-gray-900">{proposal.expiryDate.toLocaleDateString()}</p>
          </div>
        )}
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

      <div className="mt-8 rounded-md border border-dashed border-gray-300 p-4 text-center text-sm">
        {proposal.status === "ACCEPTED" && (
          <p className="text-green-700">
            You accepted this proposal
            {proposal.acceptedAt ? ` on ${proposal.acceptedAt.toLocaleDateString()}` : ""}.
          </p>
        )}
        {proposal.status === "DECLINED" && <p className="text-gray-600">You declined this proposal.</p>}
        {proposal.status === "SENT" && isExpired && (
          <p className="text-gray-600">This proposal has expired.</p>
        )}
        {proposal.status === "SENT" && !isExpired && (
          <ProposalResponseButtons token={proposal.publicToken} />
        )}
      </div>
    </div>
  );
}
