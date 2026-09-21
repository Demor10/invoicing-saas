"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteMoneyEntryButton({
  deleteUrl,
  label,
  redirectTo,
}: {
  deleteUrl: string;
  label: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    if (!confirm(`Delete this ${label}? This can't be undone.`)) return;

    setIsDeleting(true);
    setError(null);

    const res = await fetch(deleteUrl, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Failed to delete ${label}.`);
      setIsDeleting(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="text-sm font-medium text-red-600 underline hover:text-red-800 disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
