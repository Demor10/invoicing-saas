"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProposalResponseButtons({ token }: { token: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: "accept" | "decline") => {
    if (action === "decline" && !confirm("Decline this proposal?")) return;

    setIsSubmitting(action);
    setError(null);

    const res = await fetch(`/api/proposal/${token}/${action}`, { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setIsSubmitting(null);
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <div className="flex gap-3">
        <button
          onClick={() => respond("accept")}
          disabled={isSubmitting !== null}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isSubmitting === "accept" ? "Accepting..." : "Accept proposal"}
        </button>
        <button
          onClick={() => respond("decline")}
          disabled={isSubmitting !== null}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isSubmitting === "decline" ? "Declining..." : "Decline"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
