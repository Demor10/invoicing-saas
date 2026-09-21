import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditMoneyEntryForm } from "@/components/edit-money-entry-form";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const expense = await prisma.expense.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Edit expense</h1>
      <div className="mt-6">
        <EditMoneyEntryForm
          kind="expense"
          apiUrl={`/api/expenses/${expense.id}`}
          redirectTo="/expenses"
          defaultValues={{
            date: expense.date.toISOString().slice(0, 10),
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
            category: expense.category ?? "",
          }}
        />
      </div>
    </div>
  );
}
