"use client";

import { useState } from "react";

export function PublicLinkField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (e.g. insecure context) — the link is still
      // visible as text for the user to select manually.
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
      />
      <button
        onClick={onCopy}
        type="button"
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
