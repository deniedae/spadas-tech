/**
 * Utility for verifying administrator and owner privileges across Spadas Tech APIs and pages.
 * Supports ADMIN_EMAIL, ADMIN_EMAILS, or NEXT_PUBLIC_ADMIN_EMAIL env vars,
 * with fallback to default administrator email.
 */

export function getAdminEmails(): string[] {
  const envAdmins =
    process.env.ADMIN_EMAIL ||
    process.env.ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    "deniedae@gmail.com";

  return envAdmins
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  return admins.includes(email.toLowerCase().trim());
}
