import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteMoneyEntryButton } from "@/components/delete-money-entry-button";
import { groupByCurrency, formatTotals } from "@/lib/money";

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sales = await prisma.sale.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  const totals = groupByCurrency(
    sales,
    (s) => s.amount,
    (s) => s.currency
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ad-hoc sales not tied to a formal invoice.
          </p>
        </div>
        <Link
          href="/sales/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Record sale
        </Link>
      </div>

      {sales.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          No sales recorded yet.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-gray-600">
            Total recorded:{" "}
            <span className="font-semibold text-gray-900">{formatTotals(totals)}</span>
          </p>
          <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
            {sales.map((sale) => (
              <li key={sale.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{sale.description}</p>
                  <p className="text-sm text-gray-500">
                    {sale.date.toLocaleDateString()}
                    {sale.category ? ` · ${sale.category}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {sale.currency} {sale.amount.toFixed(2)}
                  </span>
                  <Link
                    href={`/sales/${sale.id}/edit`}
                    className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
                  >
                    Edit
                  </Link>
                  <DeleteMoneyEntryButton
                    deleteUrl={`/api/sales/${sale.id}`}
                    label="sale"
                    redirectTo="/sales"
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
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
