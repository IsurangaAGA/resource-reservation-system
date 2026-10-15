// Time-zone aware helpers shared by server and client. All instants are stored
// in UTC; wall-clock values are always interpreted in APP_TIME_ZONE so that the
// server and every browser agree on what "10:00" means.
import { APP_TIME_ZONE } from "./constants";

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function zonedParts(date: Date, timeZone: string): Parts {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  const out: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return out as Parts;
}

/** Milliseconds the zone is ahead of UTC at the given instant. */
function zoneOffset(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-15T09:30" (as typed into <input type="datetime-local">) → UTC Date. */
export function wallTimeToDate(value: string, timeZone = APP_TIME_ZONE): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Apply the offset, then re-check once in case the guess crossed a DST boundary.
  let result = guess - zoneOffset(new Date(guess), timeZone);
  result = guess - zoneOffset(new Date(result), timeZone);
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** UTC Date → "2026-10-15T09:30" for a datetime-local input. */
export function dateToWallTime(date: Date, timeZone = APP_TIME_ZONE) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Hour of day (0–23) in the organisation's time zone. */
export function zonedHour(date: Date, timeZone = APP_TIME_ZONE) {
  return zonedParts(date, timeZone).hour;
}

/** Rounds up to the next multiple of `minutes` (e.g. next half hour). */
export function roundUp(date: Date, minutes: number) {
  const step = minutes * 60_000;
  return new Date(Math.ceil(date.getTime() / step) * step);
}

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatDateTime = (date: Date) => dateTimeFormat.format(date);
export const formatDate = (date: Date) => dateFormat.format(date);
export const formatTime = (date: Date) => timeFormat.format(date);

function sameZonedDay(a: Date, b: Date) {
  const pa = zonedParts(a, APP_TIME_ZONE);
  const pb = zonedParts(b, APP_TIME_ZONE);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** "Thu 15 Oct, 10:00 – 11:30" or "Thu 15 Oct, 10:00 – Fri 16 Oct, 09:00". */
export function formatRange(start: Date, end: Date) {
  return sameZonedDay(start, end)
    ? `${formatDateTime(start)} – ${formatTime(end)}`
    : `${formatDateTime(start)} – ${formatDateTime(end)}`;
}

export function formatDuration(start: Date, end: Date) {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}m`].filter(Boolean).join(" ") || "0m";
}

/** Do the half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap? */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}
