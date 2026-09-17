import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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
        The real dashboard (invoices, clients, totals) is built in a later
        step — this confirms auth, onboarding, and the session are all wired
        up correctly.
      </p>
    </div>
  );
}
