import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, businessName: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
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

      <p className="mt-8 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        The full dashboard (invoices, totals) is built in a later step.
      </p>

      <Link
        href="/clients"
        className="mt-4 inline-block rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Manage clients
      </Link>
    </div>
  );
}
