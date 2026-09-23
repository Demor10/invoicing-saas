"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InvoiceForm } from "@/components/invoice-form";
import type { InvoiceFormValues } from "@/lib/validation/invoice";

export function NewInvoiceForm({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  // Bumping this remounts InvoiceForm fresh (react-hook-form's internal
  // state resets), which is a simpler and lower-risk way to clear the form
  // after each save than adding an imperative reset API to InvoiceForm
  // itself. The already-tested single-invoice form is untouched.
  const [resetKey, setResetKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<{ id: string; number: number } | null>(null);

  const onSubmit = async (values: InvoiceFormValues) => {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Something went wrong. Please try again.";
    }

    const invoice = await res.json();
    setLastSaved({ id: invoice.id, number: invoice.number });
    setResetKey((key) => key + 1);
    router.refresh();
  };

  return (
    <div>
      {lastSaved && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <span className="text-green-800">Invoice #{lastSaved.number} saved.</span>
          <Link href={`/invoices/${lastSaved.id}`} className="font-medium text-green-800 underline">
            View it
          </Link>
        </div>
      )}
      <InvoiceForm key={resetKey} clients={clients} onSubmit={onSubmit} />
    </div>
  );
}
