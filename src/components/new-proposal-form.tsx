"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProposalForm } from "@/components/proposal-form";
import type { ProposalFormValues } from "@/lib/validation/proposal";

export function NewProposalForm({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<{ id: string; number: number } | null>(null);

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
    setLastSaved({ id: proposal.id, number: proposal.number });
    setResetKey((key) => key + 1);
    router.refresh();
  };

  return (
    <div>
      {lastSaved && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <span className="text-green-800">Proposal #{lastSaved.number} saved.</span>
          <Link href={`/proposals/${lastSaved.id}`} className="font-medium text-green-800 underline">
            View it
          </Link>
        </div>
      )}
      <ProposalForm key={resetKey} clients={clients} onSubmit={onSubmit} />
    </div>
  );
}
