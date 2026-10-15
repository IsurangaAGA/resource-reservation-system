"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { AppError } from "@/lib/errors";
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from "@/lib/validation";
import {
  getPasswordHash,
  registerUser,
  setPassword,
  updateProfile,
} from "@/lib/services/users";
import { requireUser } from "./dal";
import { authenticate, clientIp } from "./authenticate";
import { verifyPassword } from "./password";
import { clearAttempts, isRateLimited, recordAttempt } from "./rate-limit";
import { safeNextPath } from "./redirect";
import { createSession, destroySession, revokeOtherSessions } from "./session";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back so non-secret inputs survive a failed submission. */
  values?: Record<string, string>;
};

const PASSWORD_WINDOW_MS = 15 * 60 * 1000;
const MAX_PASSWORD_FAILURES = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTRATIONS = 10;

function formValues(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));
}

function validate<S extends z.ZodType>(schema: S, input: unknown): { data: z.output<S> } | { state: FormState } {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    fieldErrors[String(issue.path[0] ?? "_form")] ??= issue.message;
  }
  return { state: { error: "Please correct the highlighted fields.", fieldErrors } };
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = validate(loginSchema, { email: formData.get("email"), password: formData.get("password") });
  if ("state" in parsed) return { ...parsed.state, values };

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: result.message, values };

  await createSession(result.userId);
  redirect(safeNextPath(formData.get("next")));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["name", "email", "department"]);
  const limiterKey = `register:${await clientIp()}`;
  if (isRateLimited(limiterKey, MAX_REGISTRATIONS)) {
    return { error: "Too many sign-ups from this network. Please try again later.", values };
  }

  const parsed = validate(registerSchema, {
    ...values,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if ("state" in parsed) return { ...parsed.state, values };

  let userId: string;
  try {
    ({ id: userId } = await registerUser(parsed.data));
  } catch (error) {
    if (error instanceof AppError) return { error: error.message, fieldErrors: error.extra.fieldErrors, values };
    throw error;
  }
  recordAttempt(limiterKey, REGISTER_WINDOW_MS);
  await createSession(userId);
  redirect("/?welcome=1");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["name", "department"]);
  const parsed = validate(profileSchema, values);
  if ("state" in parsed) return { ...parsed.state, values };

  await updateProfile(user.id, parsed.data);
  refresh();
  return { success: "Profile updated.", values };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = validate(changePasswordSchema, {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if ("state" in parsed) return parsed.state;

  const limiterKey = `password:${user.id}`;
  if (isRateLimited(limiterKey, MAX_PASSWORD_FAILURES)) {
    return { error: "Too many failed attempts. Please wait 15 minutes and try again." };
  }
  const hash = await getPasswordHash(user.id);
  if (!hash || !(await verifyPassword(parsed.data.currentPassword, hash))) {
    recordAttempt(limiterKey, PASSWORD_WINDOW_MS);
    return { error: "Your current password is incorrect.", fieldErrors: { currentPassword: "Incorrect password" } };
  }

  clearAttempts(limiterKey);
  await setPassword(user.id, parsed.data.newPassword);
  await revokeOtherSessions(user.id);
  return { success: "Password changed. Other devices have been signed out." };
}
