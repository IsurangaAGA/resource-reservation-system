import { describe, expect, it } from "vitest";
import {
  dateToWallTime,
  formatDuration,
  formatRange,
  intervalsOverlap,
  roundUp,
  wallTimeToDate,
  zonedHour,
} from "./datetime";

const at = (iso: string) => new Date(iso);

describe("wall-clock conversion", () => {
  it("interprets input in the organisation time zone (Asia/Colombo, UTC+5:30)", () => {
    expect(wallTimeToDate("2026-10-15T10:00")?.toISOString()).toBe("2026-10-15T04:30:00.000Z");
    expect(dateToWallTime(at("2026-10-15T04:30:00Z"))).toBe("2026-10-15T10:00");
  });

  it("round-trips across midnight", () => {
    const date = wallTimeToDate("2026-12-31T23:45")!;
    expect(dateToWallTime(date)).toBe("2026-12-31T23:45");
  });

  it("handles daylight-saving zones", () => {
    // New York switches from EDT (UTC-4) to EST (UTC-5) on 2026-11-01.
    expect(wallTimeToDate("2026-10-31T09:00", "America/New_York")?.toISOString()).toBe("2026-10-31T13:00:00.000Z");
    expect(wallTimeToDate("2026-11-02T09:00", "America/New_York")?.toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(wallTimeToDate("15/10/2026 10:00")).toBeNull();
    expect(wallTimeToDate("")).toBeNull();
  });

  it("reports the zoned hour", () => {
    expect(zonedHour(at("2026-10-15T04:30:00Z"))).toBe(10);
  });
});

describe("intervalsOverlap (half-open ranges)", () => {
  const a = [at("2026-10-15T10:00:00Z"), at("2026-10-15T11:00:00Z")] as const;

  it.each([
    ["partial overlap at start", "09:30", "10:30", true],
    ["partial overlap at end", "10:30", "11:30", true],
    ["fully inside", "10:15", "10:45", true],
    ["fully containing", "09:00", "12:00", true],
    ["identical", "10:00", "11:00", true],
    ["back-to-back after", "11:00", "12:00", false],
    ["back-to-back before", "09:00", "10:00", false],
    ["entirely before", "07:00", "08:00", false],
  ])("%s → %s", (_label, start, end, expected) => {
    const b = [at(`2026-10-15T${start}:00Z`), at(`2026-10-15T${end}:00Z`)] as const;
    expect(intervalsOverlap(a[0], a[1], b[0], b[1])).toBe(expected);
    expect(intervalsOverlap(b[0], b[1], a[0], a[1])).toBe(expected);
  });
});

describe("formatting helpers", () => {
  it("formats durations compactly", () => {
    expect(formatDuration(at("2026-10-15T10:00:00Z"), at("2026-10-15T10:30:00Z"))).toBe("30m");
    expect(formatDuration(at("2026-10-15T10:00:00Z"), at("2026-10-15T12:15:00Z"))).toBe("2h 15m");
    expect(formatDuration(at("2026-10-15T10:00:00Z"), at("2026-10-17T10:00:00Z"))).toBe("2d");
  });

  it("omits the repeated date for same-day ranges", () => {
    const sameDay = formatRange(at("2026-10-15T04:30:00Z"), at("2026-10-15T06:00:00Z"));
    expect(sameDay).toMatch(/15 Oct.*10:00 – 11:30$/);
    const multiDay = formatRange(at("2026-10-15T04:30:00Z"), at("2026-10-16T04:30:00Z"));
    expect(multiDay.match(/Oct/g)).toHaveLength(2);
  });

  it("rounds up to the next step", () => {
    expect(roundUp(at("2026-10-15T10:01:00Z"), 15).toISOString()).toBe("2026-10-15T10:15:00.000Z");
    expect(roundUp(at("2026-10-15T10:30:00Z"), 30).toISOString()).toBe("2026-10-15T10:30:00.000Z");
  });
});
