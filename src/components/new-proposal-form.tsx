"use client";

import { useRouter } from "next/navigation";
import { ProposalForm } from "@/components/proposal-form";
import type { ProposalFormValues } from "@/lib/validation/proposal";

export function NewProposalForm({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();

  const onSubmit = async (values: ProposalFormValues) => {
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Something went wrong. Please try again.";
    }

    const proposal = await res.json();
    router.push(`/proposals/${proposal.id}`);
    router.refresh();
  };

  return <ProposalForm clients={clients} onSubmit={onSubmit} />;
}
