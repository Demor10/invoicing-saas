"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    if (!confirm(`Delete ${clientName}? This can't be undone.`)) return;

    setIsDeleting(true);
    setError(null);

    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete client.");
      setIsDeleting(false);
      return;
    }

    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="text-sm font-medium text-red-600 underline hover:text-red-800 disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
