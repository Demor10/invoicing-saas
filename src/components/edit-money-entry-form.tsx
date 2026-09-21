"use client";

import { useRouter } from "next/navigation";
import { MoneyEntryForm } from "@/components/money-entry-form";
import type { MoneyEntryFormValues, MoneyEntryFormInput } from "@/lib/validation/money-entry";

export function EditMoneyEntryForm({
  kind,
  apiUrl,
  redirectTo,
  defaultValues,
}: {
  kind: "sale" | "expense";
  apiUrl: string;
  redirectTo: string;
  defaultValues: MoneyEntryFormInput;
}) {
  const router = useRouter();

  const onSubmit = async (values: MoneyEntryFormValues) => {
    const res = await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Something went wrong. Please try again.";
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <MoneyEntryForm kind={kind} defaultValues={defaultValues} onSubmit={onSubmit} />
  );
}
