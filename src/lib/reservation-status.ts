import type { ReservationStatus } from "./constants";

/** What a reservation means to a person right now, derived from status and time. */
export type ReservationPhase = "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export function getReservationPhase(
  reservation: { status: ReservationStatus; startTime: Date; endTime: Date },
  now: Date,
): ReservationPhase {
  if (reservation.status === "CANCELLED") return "CANCELLED";
  if (reservation.status === "COMPLETED" || reservation.endTime <= now) return "COMPLETED";
  if (reservation.startTime <= now) return "IN_PROGRESS";
  return "UPCOMING";
}

export const PHASE_LABELS: Record<ReservationPhase, string> = {
  UPCOMING: "Upcoming",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Only confirmed reservations that have not ended can be cancelled. */
export const canCancel = (phase: ReservationPhase) => phase === "UPCOMING" || phase === "IN_PROGRESS";

/** Times can only be changed before the reservation starts. */
export const canReschedule = (phase: ReservationPhase) => phase === "UPCOMING";
