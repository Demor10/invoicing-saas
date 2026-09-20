import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditInvoiceForm } from "@/components/edit-invoice-form";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!invoice) notFound();

  // Editing a sent invoice would silently change what the client already
  // saw/paid against, so route them to the read-only view instead.
  if (invoice.status !== "DRAFT") {
    redirect(`/invoices/${invoice.id}`);
  }

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Edit invoice #{invoice.number}</h1>
      <div className="mt-6">
        <EditInvoiceForm
          invoiceId={invoice.id}
          clients={clients}
          defaultValues={{
            clientId: invoice.clientId,
            dueDate: invoice.dueDate.toISOString().slice(0, 10),
            currency: invoice.currency,
            taxRate: invoice.taxRate,
            notes: invoice.notes ?? "",
            lineItems: invoice.lineItems.map((item) => ({
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
