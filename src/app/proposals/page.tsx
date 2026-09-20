import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

export default async function ProposalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: { userId: session.user.id },
    include: { client: { select: { name: true } } },
    orderBy: { number: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Proposals</h1>
        <Link
          href="/proposals/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          New proposal
        </Link>
      </div>

      {proposals.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          No proposals yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-200 rounded-md border border-gray-200">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <Link
                href={`/proposals/${proposal.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{proposal.number} — {proposal.client.name}
                  </p>
                  {proposal.expiryDate && (
                    <p className="text-sm text-gray-500">
                      Expires {proposal.expiryDate.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">
                    {proposal.currency} {proposal.total.toFixed(2)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[proposal.status]}`}
                  >
                    {proposal.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/dashboard"
        className="mt-6 inline-block text-sm text-gray-600 underline hover:text-gray-900"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
