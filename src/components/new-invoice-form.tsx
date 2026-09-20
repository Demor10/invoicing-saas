"use client";

import { useRouter } from "next/navigation";
import { InvoiceForm } from "@/components/invoice-form";
import type { InvoiceFormValues } from "@/lib/validation/invoice";

export function NewInvoiceForm({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();

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
    router.push(`/invoices/${invoice.id}`);
    router.refresh();
  };

  return <InvoiceForm clients={clients} onSubmit={onSubmit} />;
}
