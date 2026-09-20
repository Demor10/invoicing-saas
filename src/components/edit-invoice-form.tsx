"use client";

import { useRouter } from "next/navigation";
import { InvoiceForm } from "@/components/invoice-form";
import type { InvoiceFormValues, InvoiceFormInput } from "@/lib/validation/invoice";

export function EditInvoiceForm({
  invoiceId,
  clients,
  defaultValues,
}: {
  invoiceId: string;
  clients: { id: string; name: string }[];
  defaultValues: InvoiceFormInput;
}) {
  const router = useRouter();

  const onSubmit = async (values: InvoiceFormValues) => {
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Something went wrong. Please try again.";
    }

    router.push(`/invoices/${invoiceId}`);
    router.refresh();
  };

  return <InvoiceForm clients={clients} defaultValues={defaultValues} onSubmit={onSubmit} />;
}
