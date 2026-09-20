import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewInvoiceForm } from "@/components/new-invoice-form";

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">New invoice</h1>
        <p className="mt-4 text-sm text-gray-600">
          You need at least one client before creating an invoice.
        </p>
        <Link
          href="/clients/new"
          className="mt-4 inline-block rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add a client
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">New invoice</h1>
      <div className="mt-6">
        <NewInvoiceForm clients={clients} />
      </div>
    </div>
  );
}
