import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isPaidUser } from "@/lib/subscription";
import { ImportWizard } from "@/components/import/import-wizard";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const paid = await isPaidUser(session.user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Import & analyze a file</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload a CSV or Excel file of sales or expenses — import it into your records, or just
        analyze it as a one-off without saving anything.
      </p>

      {paid ? (
        <div className="mt-6">
          <ImportWizard />
        </div>
      ) : (
        <div className="mt-8 rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          File upload and analysis is a paid-plan feature.
        </div>
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
