import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    include: { client: { select: { name: true } } },
    orderBy: { number: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
        <Link
          href="/invoices/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          New invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          No invoices yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-200 rounded-md border border-gray-200">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{invoice.number} — {invoice.client.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Due {invoice.dueDate.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">
                    {invoice.currency} {invoice.total.toFixed(2)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}
                  >
                    {invoice.status}
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
