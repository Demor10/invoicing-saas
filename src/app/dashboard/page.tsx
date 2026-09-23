import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDashboard, formatTotals } from "@/lib/dashboard";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, invoices] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, businessName: true },
    }),
    prisma.invoice.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        currency: true,
        dueDate: true,
        paidAt: true,
        client: { select: { id: true, name: true } },
      },
    }),
  ]);

  const { outstandingTotals, overdueTotals, paidThisMonthTotals, clientBreakdown, dueSoon, recentInvoices } =
    computeDashboard(invoices);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </h1>
          {user?.businessName && (
            <p className="mt-1 text-sm text-gray-600">{user.businessName}</p>
          )}
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Log out
          </button>
        </form>
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          href="/clients"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Manage clients
        </Link>
        <Link
          href="/invoices"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View invoices
        </Link>
        <Link
          href="/invoices/new"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          New invoice
        </Link>
        <Link
          href="/proposals"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Proposals
        </Link>
        <Link
          href="/sales"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Sales
        </Link>
        <Link
          href="/expenses"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Expenses
        </Link>
        <Link
          href="/analytics"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Analytics
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Outstanding</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatTotals(outstandingTotals)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Overdue</p>
          <p className="mt-1 text-lg font-semibold text-red-600">
            {formatTotals(overdueTotals)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Paid this month</p>
          <p className="mt-1 text-lg font-semibold text-green-700">
            {formatTotals(paidThisMonthTotals)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-900">Due soon</h2>
        {dueSoon.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nothing outstanding right now.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
            {dueSoon.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50"
                >
                  <span className="text-gray-900">
                    #{invoice.number} — {invoice.client.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-gray-600">
                      {invoice.currency} {invoice.total.toFixed(2)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        invoice.daysUntilDue < 0
                          ? STATUS_STYLES.OVERDUE
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {invoice.daysUntilDue < 0
                        ? `${Math.abs(invoice.daysUntilDue)}d overdue`
                        : invoice.daysUntilDue === 0
                          ? "Due today"
                          : `Due in ${invoice.daysUntilDue}d`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-900">Outstanding by client</h2>
        {clientBreakdown.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No outstanding balances.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
            {clientBreakdown.map((entry) => (
              <li
                key={entry.clientId}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-gray-900">{entry.name}</span>
                <span className="text-gray-600">{formatTotals(entry.totals)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent invoices</h2>
          <Link href="/invoices" className="text-sm text-gray-600 underline hover:text-gray-900">
            View all
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No invoices yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
            {recentInvoices.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50"
                >
                  <span className="text-gray-900">
                    #{invoice.number} — {invoice.client.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-gray-600">
                      {invoice.currency} {invoice.total.toFixed(2)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}
                    >
                      {invoice.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
