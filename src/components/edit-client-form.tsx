"use client";

import { useRouter } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import type { ClientFormValues } from "@/lib/validation/client";

export function EditClientForm({
  clientId,
  defaultValues,
}: {
  clientId: string;
  defaultValues: ClientFormValues;
}) {
  const router = useRouter();

  const onSubmit = async (values: ClientFormValues) => {
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Something went wrong. Please try again.";
    }

    router.push("/clients");
    router.refresh();
  };

  return (
    <ClientForm defaultValues={defaultValues} onSubmit={onSubmit} submitLabel="Save changes" />
  );
}
