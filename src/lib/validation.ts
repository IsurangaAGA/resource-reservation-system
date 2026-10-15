import { z } from "zod";
import { BOOKING_RULES, RESOURCE_STATUSES, RESOURCE_TYPES } from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

/** ISO-8601 instant with an explicit offset, e.g. 2026-10-15T04:30:00.000Z. */
const instant = z.iso
  .datetime({ offset: true, error: "Must be an ISO-8601 date-time with a time zone" })
  .transform((value) => new Date(value));

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export const resourceCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  type: z.enum(RESOURCE_TYPES),
  description: optionalText(1000),
  location: z.string().trim().min(2, "Location is required").max(150),
  capacity: z.number().int().positive().max(10_000).nullish().transform((v) => v ?? null),
  status: z.enum(RESOURCE_STATUSES).default("AVAILABLE"),
});

export const resourceUpdateSchema = resourceCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export const resourceQuerySchema = z.object({
  type: z.enum(RESOURCE_TYPES).optional(),
  status: z.enum(RESOURCE_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

/** Returns why a start/end pair is not a valid booking length, or null if it is. */
export function timeRangeError(startTime: Date, endTime: Date): string | null {
  const minutes = (endTime.getTime() - startTime.getTime()) / 60_000;
  if (minutes <= 0) return "End time must be after the start time";
  if (minutes < BOOKING_RULES.minDurationMinutes) {
    return `Reservations must be at least ${BOOKING_RULES.minDurationMinutes} minutes long`;
  }
  if (minutes > BOOKING_RULES.maxDurationDays * 1440) {
    return `Reservations cannot be longer than ${BOOKING_RULES.maxDurationDays} days`;
  }
  return null;
}

function refineTimeRange(data: { startTime?: unknown; endTime?: unknown }, ctx: z.RefinementCtx) {
  // Zod may still run this after a field failed to parse, so only compare real dates.
  if (!(data.startTime instanceof Date) || !(data.endTime instanceof Date)) return;
  const message = timeRangeError(data.startTime, data.endTime);
  if (message) ctx.addIssue({ code: "custom", path: ["endTime"], message });
}

const timeRange = z.object({ startTime: instant, endTime: instant }).superRefine(refineTimeRange);

export const reservationCreateSchema = z
  .object({
    resourceId: z.string().min(1, "Choose a resource"),
    /** Defaults to the signed-in user; only administrators may book for someone else. */
    userId: z.string().min(1).optional(),
    title: z.string().trim().min(2, "Give the booking a short title").max(120),
    notes: optionalText(1000),
  })
  .and(timeRange);

/** PATCH accepts either a reschedule/edit or a cancellation, never both. */
export const reservationUpdateSchema = z.union([
  z.object({ status: z.literal("CANCELLED") }).strict(),
  z
    .object({
      title: z.string().trim().min(2).max(120).optional(),
      notes: optionalText(1000).optional(),
      startTime: instant.optional(),
      endTime: instant.optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update")
    .refine(
      (data) => (data.startTime === undefined) === (data.endTime === undefined),
      "startTime and endTime must be changed together",
    )
    .superRefine(refineTimeRange),
], { error: 'Send either {"status":"CANCELLED"} or the fields to edit (title, notes, startTime, endTime), not both' });

export const reservationQuerySchema = z.object({
  resourceId: z.string().optional(),
  userId: z.string().optional(),
  /** upcoming: not yet ended & confirmed; past: ended or completed; cancelled; all. */
  scope: z.enum(["upcoming", "past", "cancelled", "all"]).default("all"),
  from: instant.optional(),
  to: instant.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

export const passwordRule = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Include at least one letter and one number");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(128),
});

const profileFields = {
  name: z.string().trim().min(2, "Enter your full name").max(80),
  department: optionalText(80),
};

export const registerSchema = z
  .object({ ...profileFields, email, password: passwordRule, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const profileSchema = z.object(profileFields);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one",
  });

export const userRoleUpdateSchema = z.object({ role: z.enum(["ADMIN", "MEMBER"]) }).strict();

export type ResourceCreateInput = z.infer<typeof resourceCreateSchema>;
export type ResourceUpdateInput = z.infer<typeof resourceUpdateSchema>;
export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
export type ReservationUpdateInput = z.infer<typeof reservationUpdateSchema>;
export type ReservationQuery = z.infer<typeof reservationQuerySchema>;
