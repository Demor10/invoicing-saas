"use client";

import { useRouter } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import type { ClientFormValues } from "@/lib/validation/client";

export default function NewClientPage() {
  const router = useRouter();

  const onSubmit = async (values: ClientFormValues) => {
    const res = await fetch("/api/clients", {
      method: "POST",
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
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Add client</h1>
      <div className="mt-6">
        <ClientForm onSubmit={onSubmit} submitLabel="Add client" />
      </div>
    </div>
  );
}
