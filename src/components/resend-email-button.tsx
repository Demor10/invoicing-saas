"use client";

import { useState } from "react";

export function ResendEmailButton({ resendUrl }: { resendUrl: string }) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const onClick = async () => {
    setIsSending(true);
    setMessage(null);

    const res = await fetch(resendUrl, { method: "POST" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setMessage({ type: "error", text: data?.error ?? "Failed to resend email." });
    } else if (data?.emailResult?.success === false) {
      setMessage({ type: "error", text: data.emailResult.error });
    } else {
      setMessage({ type: "success", text: "Email sent." });
    }

    setIsSending(false);
  };

  return (
    <div>
      <button
        onClick={onClick}
        disabled={isSending}
        className="text-sm font-medium text-gray-700 underline hover:text-gray-900 disabled:opacity-50"
      >
        {isSending ? "Sending..." : "Resend email"}
      </button>
      {message && (
        <p
          className={`mt-1 text-xs ${message.type === "error" ? "text-red-600" : "text-green-700"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
