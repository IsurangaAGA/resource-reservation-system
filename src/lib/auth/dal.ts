import "server-only";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { getSessionUser, type SessionUser } from "./session";

// Data Access Layer: every page, Route Handler and Server Action authorises
// through these helpers, close to the data. The proxy check is only a UX shortcut.

export type { SessionUser };

export const getCurrentUser = getSessionUser;

export const isAdmin = (user: Pick<SessionUser, "role">) => user.role === "ADMIN";

/** For pages: returns the user or redirects to the login screen. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For Route Handlers: returns the user or throws 401/403 as JSON-friendly errors. */
export async function requireApiUser(options: { admin?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "You need to sign in to do this. Your session may have expired.");
  if (options.admin && !isAdmin(user)) {
    throw new AppError("FORBIDDEN", "Only administrators can perform this action.");
  }
  return user;
}

/** Can this user change or cancel the given reservation? */
export function canManageReservation(user: Pick<SessionUser, "id" | "role">, reservation: { userId: string }) {
  return isAdmin(user) || reservation.userId === user.id;
}
