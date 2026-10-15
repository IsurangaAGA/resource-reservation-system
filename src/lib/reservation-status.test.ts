import { describe, expect, it } from "vitest";
import { canCancel, canReschedule, getReservationPhase } from "./reservation-status";

const now = new Date("2026-10-15T10:00:00Z");
const reservation = (status: "CONFIRMED" | "CANCELLED" | "COMPLETED", start: string, end: string) => ({
  status,
  startTime: new Date(`2026-10-15T${start}:00Z`),
  endTime: new Date(`2026-10-15T${end}:00Z`),
});

describe("getReservationPhase", () => {
  it.each([
    ["future confirmed", reservation("CONFIRMED", "11:00", "12:00"), "UPCOMING"],
    ["started confirmed", reservation("CONFIRMED", "09:30", "10:30"), "IN_PROGRESS"],
    ["ended confirmed", reservation("CONFIRMED", "08:00", "09:00"), "COMPLETED"],
    ["ends exactly now", reservation("CONFIRMED", "09:00", "10:00"), "COMPLETED"],
    ["cancelled future", reservation("CANCELLED", "11:00", "12:00"), "CANCELLED"],
    ["explicitly completed", reservation("COMPLETED", "11:00", "12:00"), "COMPLETED"],
  ] as const)("%s → %s", (_label, r, phase) => {
    expect(getReservationPhase(r, now)).toBe(phase);
  });

  it("allows cancelling only active bookings and rescheduling only future ones", () => {
    expect([canCancel("UPCOMING"), canCancel("IN_PROGRESS"), canCancel("COMPLETED"), canCancel("CANCELLED")]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect([canReschedule("UPCOMING"), canReschedule("IN_PROGRESS")]).toEqual([true, false]);
  });
});
