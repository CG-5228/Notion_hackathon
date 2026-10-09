/**
 * UX-only helpers. These NEVER grant access — the server re-checks the confirmed
 * auth email against the admin allowlist (public.university_domains) on every call.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns the exact domain after the last "@", or null if not a plausible email. */
export function emailDomain(raw: string): string | null {
  const email = normalizeEmail(raw);
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const domain = email.slice(at + 1);
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return null;
  return domain;
}

/** Well-known personal providers — rejected early for a friendlier message. Not a trust signal. */
export const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com",
  "icloud.com", "me.com", "proton.me", "protonmail.com", "aol.com", "gmx.com", "eircom.net",
]);

export function isObviouslyPersonal(raw: string): boolean {
  const d = emailDomain(raw);
  return d !== null && PERSONAL_DOMAINS.has(d);
}
