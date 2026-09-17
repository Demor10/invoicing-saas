import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">
        Invoicing & Proposals, made simple
      </h1>
      <p className="max-w-md text-gray-600">
        Send professional invoices and proposals to your clients and get paid
        online — no spreadsheets required.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
