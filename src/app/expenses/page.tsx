import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteMoneyEntryButton } from "@/components/delete-money-entry-button";
import { groupByCurrency, formatTotals } from "@/lib/money";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  const totals = groupByCurrency(
    expenses,
    (e) => e.amount,
    (e) => e.currency
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Optional — track costs to see real profit/loss, not just revenue.
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Record expense
        </Link>
      </div>

      {expenses.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          No expenses recorded yet. This is entirely optional — skip it if you only
          want to track revenue.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-gray-600">
            Total recorded:{" "}
            <span className="font-semibold text-gray-900">{formatTotals(totals)}</span>
          </p>
          <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                  <p className="text-sm text-gray-500">
                    {expense.date.toLocaleDateString()}
                    {expense.category ? ` · ${expense.category}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {expense.currency} {expense.amount.toFixed(2)}
                  </span>
                  <Link
                    href={`/expenses/${expense.id}/edit`}
                    className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
                  >
                    Edit
                  </Link>
                  <DeleteMoneyEntryButton
                    deleteUrl={`/api/expenses/${expense.id}`}
                    label="expense"
                    redirectTo="/expenses"
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
