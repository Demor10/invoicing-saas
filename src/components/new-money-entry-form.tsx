"use client";

import { useRouter } from "next/navigation";
import { MoneyEntryForm } from "@/components/money-entry-form";
import type { MoneyEntryFormValues } from "@/lib/validation/money-entry";

export function NewMoneyEntryForm({
  kind,
  apiBase,
  redirectTo,
}: {
  kind: "sale" | "expense";
  apiBase: string;
  redirectTo: string;
}) {
  const router = useRouter();

  const onSubmit = async (values: MoneyEntryFormValues) => {
    const res = await fetch(apiBase, {
      method: "POST",
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

  return <MoneyEntryForm kind={kind} onSubmit={onSubmit} />;
}
