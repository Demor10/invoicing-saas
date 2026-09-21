import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditMoneyEntryForm } from "@/components/edit-money-entry-form";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const sale = await prisma.sale.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Edit sale</h1>
      <div className="mt-6">
        <EditMoneyEntryForm
          kind="sale"
          apiUrl={`/api/sales/${sale.id}`}
          redirectTo="/sales"
          defaultValues={{
            date: sale.date.toISOString().slice(0, 10),
            description: sale.description,
            amount: sale.amount,
            currency: sale.currency,
            category: sale.category ?? "",
          }}
        />
      </div>
    </div>
  );
}
