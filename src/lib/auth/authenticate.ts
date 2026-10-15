import "server-only";
import { headers } from "next/headers";
import { findUserForLogin } from "@/lib/services/users";
import { verifyAgainstDummy, verifyPassword } from "./password";
import { clearAttempts, isRateLimited, recordAttempt } from "./rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export type AuthResult = { ok: true; userId: string } | { ok: false; reason: "invalid" | "rate_limited"; message: string };

/**
 * Checks credentials with brute-force protection (5 failures per IP + email per
 * 15 minutes) and constant-ish timing for unknown accounts. Shared by the login
 * form and the JSON login endpoint.
 */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const key = `login:${await clientIp()}:${email}`;
  if (isRateLimited(key, MAX_FAILURES)) {
    return { ok: false, reason: "rate_limited", message: "Too many failed attempts. Please wait 15 minutes and try again." };
  }

  const user = await findUserForLogin(email);
  const valid = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
  if (!user || !valid) {
    recordAttempt(key, WINDOW_MS);
    return { ok: false, reason: "invalid", message: "Incorrect email or password." };
  }

  clearAttempts(key);
  return { ok: true, userId: user.id };
}
