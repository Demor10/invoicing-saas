// Builds a full, shareable URL (e.g. for a client-facing invoice link).
// Set NEXT_PUBLIC_APP_URL in .env once you have a real domain (or a stable
// local URL) — falls back to localhost for dev.
export function getPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
