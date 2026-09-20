import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteClientButton } from "@/components/delete-client-button";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
        <Link
          href="/clients/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add client
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
          No clients yet. Add one to start sending invoices and proposals.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-200 rounded-md border border-gray-200">
          {clients.map((client) => (
            <li
              key={client.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{client.name}</p>
                <p className="text-sm text-gray-500">{client.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/clients/${client.id}/edit`}
                  className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
                >
                  Edit
                </Link>
                <DeleteClientButton clientId={client.id} clientName={client.name} />
              </div>
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
