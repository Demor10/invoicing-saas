"use client";

import { useRouter } from "next/navigation";
import { ProposalForm } from "@/components/proposal-form";
import type { ProposalFormValues, ProposalFormInput } from "@/lib/validation/proposal";

export function EditProposalForm({
  proposalId,
  clients,
  defaultValues,
}: {
  proposalId: string;
  clients: { id: string; name: string }[];
  defaultValues: ProposalFormInput;
}) {
  const router = useRouter();

  const onSubmit = async (values: ProposalFormValues) => {
    const res = await fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error ?? "Something went wrong. Please try again.";
    }

    router.push(`/proposals/${proposalId}`);
    router.refresh();
  };

  return (
    <ProposalForm clients={clients} defaultValues={defaultValues} onSubmit={onSubmit} />
  );
}
