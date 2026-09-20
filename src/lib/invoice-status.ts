import type { InvoiceStatus } from "@prisma/client";

// The stored `status` field only flips SENT -> OVERDUE via a scheduled job
// we haven't built yet (needs a cron trigger — see README). Until then, this
// computes an overdue *display* label on the fly so the UI isn't wrong in
// the meantime, without misrepresenting what's actually persisted.
export function getDisplayStatus(status: InvoiceStatus, dueDate: Date): InvoiceStatus {
  if (status === "SENT" && dueDate.getTime() < Date.now()) {
    return "OVERDUE";
  }
  return status;
}
