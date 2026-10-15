/**
 * Only allow same-site relative paths as post-login destinations, so a crafted
 * ?next= link cannot bounce users to another site (open redirect).
 */
export function safeNextPath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/register")) return fallback;
  return value;
}
