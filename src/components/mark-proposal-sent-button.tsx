"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkProposalSentButton({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (!confirm("Mark this proposal as sent? It can no longer be edited afterward.")) return;

    setIsSubmitting(true);
    setError(null);

    const res = await fetch(`/api/proposals/${proposalId}/send`, { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update proposal.");
      setIsSubmitting(false);
      return;
    }

    const data = await res.json().catch(() => null);
    if (data?.emailResult?.success === false) {
      alert(
        `Proposal marked as sent, but the email couldn't be delivered:\n${data.emailResult.error}\n\nYou can retry from the proposal page using "Resend email."`
      );
    }

    router.refresh();
  };

  return (
    <div>
      <button
        onClick={onClick}
        disabled={isSubmitting}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isSubmitting ? "Updating..." : "Mark as sent"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
