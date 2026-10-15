import "server-only";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppError } from "./errors";
import { dateToWallTime, roundUp } from "./datetime";

/** Awaits a service call, rendering the 404 page if the record does not exist. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

/** Default booking slot: the next half hour, lasting one hour. */
export async function defaultBookingSlot() {
  await connection();
  const start = roundUp(new Date(), 30);
  return {
    start,
    minStart: dateToWallTime(start),
    startTime: dateToWallTime(start),
    endTime: dateToWallTime(new Date(start.getTime() + 60 * 60_000)),
  };
}

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
