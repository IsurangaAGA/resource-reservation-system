import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  registerSchema,
  reservationCreateSchema,
  reservationUpdateSchema,
  resourceCreateSchema,
  timeRangeError,
} from "./validation";

const booking = (start: string, end: string) => ({
  resourceId: "res_1",
  title: "Team sync",
  startTime: start,
  endTime: end,
});

describe("reservation time rules", () => {
  it("accepts a normal booking and converts timestamps to Dates", () => {
    const result = reservationCreateSchema.safeParse(booking("2026-10-16T04:30:00Z", "2026-10-16T05:30:00Z"));
    expect(result.success).toBe(true);
    expect(result.data?.startTime).toBeInstanceOf(Date);
  });

  it("requires an explicit time zone offset", () => {
    expect(reservationCreateSchema.safeParse(booking("2026-10-16T10:00", "2026-10-16T11:00")).success).toBe(false);
  });

  it.each([
    ["end before start", "2026-10-16T05:00:00Z", "2026-10-16T04:00:00Z", "End time must be after the start time"],
    ["zero length", "2026-10-16T05:00:00Z", "2026-10-16T05:00:00Z", "End time must be after the start time"],
    ["too short", "2026-10-16T05:00:00Z", "2026-10-16T05:10:00Z", "at least 15 minutes"],
    ["too long", "2026-10-01T05:00:00Z", "2026-10-20T05:00:00Z", "longer than 14 days"],
  ])("rejects %s", (_label, start, end, message) => {
    const result = reservationCreateSchema.safeParse(booking(start, end));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(message);
    expect(timeRangeError(new Date(start), new Date(end))).toContain(message);
  });
});

describe("reservation updates", () => {
  it("accepts a cancellation on its own", () => {
    expect(reservationUpdateSchema.safeParse({ status: "CANCELLED" }).success).toBe(true);
  });

  it("rejects mixing cancellation with edits", () => {
    expect(reservationUpdateSchema.safeParse({ status: "CANCELLED", title: "x" }).success).toBe(false);
  });

  it("requires start and end to change together", () => {
    expect(reservationUpdateSchema.safeParse({ startTime: "2026-10-16T05:00:00Z" }).success).toBe(false);
  });

  it("applies duration rules when rescheduling", () => {
    const result = reservationUpdateSchema.safeParse({
      startTime: "2026-10-16T05:00:00Z",
      endTime: "2026-10-16T04:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("resources", () => {
  it("defaults status and normalises optional fields", () => {
    const result = resourceCreateSchema.parse({ name: "  Room 1 ", type: "MEETING_ROOM", location: "L1", description: "" });
    expect(result).toMatchObject({ name: "Room 1", status: "AVAILABLE", description: null, capacity: null });
  });

  it("rejects unknown types", () => {
    expect(resourceCreateSchema.safeParse({ name: "Boat", type: "BOAT", location: "Harbour" }).success).toBe(false);
  });
});

describe("accounts", () => {
  const valid = { name: "Dilan J", email: "  Dilan@Example.COM ", department: "", password: "Welcome2026", confirmPassword: "Welcome2026" };

  it("normalises email to lower case", () => {
    expect(registerSchema.parse(valid).email).toBe("dilan@example.com");
  });

  it.each([
    ["too short", "abc1"],
    ["no digit", "onlyletters"],
    ["no letter", "1234567890"],
  ])("rejects a password that is %s", (_label, password) => {
    expect(registerSchema.safeParse({ ...valid, password, confirmPassword: password }).success).toBe(false);
  });

  it("requires matching confirmation", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "Different1" });
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("requires a new password that differs from the current one", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "Welcome2026",
      newPassword: "Welcome2026",
      confirmPassword: "Welcome2026",
    });
    expect(result.success).toBe(false);
  });
});
