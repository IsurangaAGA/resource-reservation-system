import "server-only";
import { connection } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, type ConflictSummary } from "@/lib/errors";
import { BOOKING_RULES } from "@/lib/constants";
import { roundUp } from "@/lib/datetime";
import { canManageReservation, isAdmin, type SessionUser } from "@/lib/auth/dal";
import type { ReservationCreateInput, ReservationQuery, ReservationUpdateInput } from "@/lib/validation";

type Db = Prisma.TransactionClient | typeof prisma;

export const reservationInclude = {
  resource: { select: { id: true, name: true, type: true, location: true, status: true } },
  user: { select: { id: true, name: true, email: true, department: true } },
} satisfies Prisma.ReservationInclude;

export type ReservationWithRelations = Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>;

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

/**
 * Finds CONFIRMED reservations on the resource whose time range overlaps
 * [start, end). Ranges are half-open, so a booking ending at 11:00 does not
 * conflict with one starting at 11:00. Overlap: existing.start < end AND existing.end > start.
 */
export function findConflicts(db: Db, resourceId: string, start: Date, end: Date, excludeId?: string) {
  return db.reservation.findMany({
    where: {
      resourceId,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, title: true, startTime: true, endTime: true, user: { select: { name: true } } },
    orderBy: { startTime: "asc" },
    take: 10,
  });
}

function conflictError(conflicts: Awaited<ReturnType<typeof findConflicts>>) {
  const summaries: ConflictSummary[] = conflicts.map((c) => ({
    id: c.id,
    title: c.title,
    startTime: c.startTime.toISOString(),
    endTime: c.endTime.toISOString(),
    bookedBy: c.user.name,
  }));
  return new AppError(
    "RESERVATION_CONFLICT",
    conflicts.length === 1
      ? "This resource is already booked for part of the requested time."
      : `This resource has ${conflicts.length} overlapping bookings in the requested time.`,
    { conflicts: summaries },
  );
}

/** True when PostgreSQL's reservations_no_overlap exclusion constraint rejected a write. */
function isOverlapViolation(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const cause = (error.meta?.driverAdapterError as { cause?: { originalCode?: string } } | undefined)?.cause;
  return cause?.originalCode === "23P01";
}

function assertWithinBookingWindow(start: Date, now: Date) {
  const earliest = now.getTime() - BOOKING_RULES.pastToleranceMinutes * 60_000;
  if (start.getTime() < earliest) {
    throw new AppError("VALIDATION_ERROR", "Reservations cannot start in the past", {
      fieldErrors: { startTime: "Start time is in the past" },
    });
  }
  const latest = now.getTime() + BOOKING_RULES.maxAdvanceDays * 86_400_000;
  if (start.getTime() > latest) {
    throw new AppError("VALIDATION_ERROR", `Reservations can be made at most ${BOOKING_RULES.maxAdvanceDays} days ahead`, {
      fieldErrors: { startTime: "Too far in the future" },
    });
  }
}

/**
 * Locks the resource row for the rest of the transaction, then verifies it is
 * bookable and free. The row lock serialises concurrent bookings of the same
 * resource, so the conflict check cannot be invalidated by a parallel insert.
 * The database exclusion constraint remains as a final safety net.
 */
async function assertResourceBookable(
  tx: Prisma.TransactionClient,
  resourceId: string,
  start: Date,
  end: Date,
  excludeId?: string,
) {
  const [resource] = await tx.$queryRaw<{ name: string; status: string }[]>`
    SELECT name, status::text AS status FROM resources WHERE id = ${resourceId} FOR UPDATE`;
  if (!resource) {
    throw new AppError("NOT_FOUND", "Resource not found", { fieldErrors: { resourceId: "Resource not found" } });
  }
  if (resource.status !== "AVAILABLE") {
    throw new AppError(
      "RESOURCE_UNAVAILABLE",
      `${resource.name} is currently ${resource.status === "MAINTENANCE" ? "under maintenance" : "retired"} and cannot be booked.`,
      { fieldErrors: { resourceId: "This resource cannot be booked right now" } },
    );
  }
  const conflicts = await findConflicts(tx, resourceId, start, end, excludeId);
  if (conflicts.length > 0) throw conflictError(conflicts);
}

/** Runs a booking write, translating a constraint-level overlap into a 409 with details. */
async function withOverlapGuard<T>(
  write: () => Promise<T>,
  conflictScope: { resourceId: string; start: Date; end: Date; excludeId?: string },
) {
  try {
    return await write();
  } catch (error) {
    if (!isOverlapViolation(error)) throw error;
    const { resourceId, start, end, excludeId } = conflictScope;
    throw conflictError(await findConflicts(prisma, resourceId, start, end, excludeId));
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export async function createReservation(actor: SessionUser, input: ReservationCreateInput) {
  const { resourceId, title, notes, startTime, endTime } = input;
  const userId = input.userId ?? actor.id;
  if (userId !== actor.id && !isAdmin(actor)) {
    throw new AppError("FORBIDDEN", "Only administrators can book on behalf of someone else.");
  }
  assertWithinBookingWindow(startTime, new Date());

  return withOverlapGuard(
    () =>
      prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
          throw new AppError("VALIDATION_ERROR", "The selected person does not exist", {
            fieldErrors: { userId: "Unknown user" },
          });
        }
        await assertResourceBookable(tx, resourceId, startTime, endTime);
        return tx.reservation.create({
          data: { resourceId, userId, title, notes, startTime, endTime },
          include: reservationInclude,
        });
      }),
    { resourceId, start: startTime, end: endTime },
  );
}

export async function updateReservation(actor: SessionUser, id: string, input: ReservationUpdateInput) {
  const now = new Date();
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) throw new AppError("NOT_FOUND", "Reservation not found");
  if (!canManageReservation(actor, existing)) {
    throw new AppError("FORBIDDEN", "You can only change your own reservations.");
  }

  if ("status" in input) {
    if (existing.status !== "CONFIRMED") {
      throw new AppError("INVALID_STATE", `This reservation is already ${existing.status.toLowerCase()}.`);
    }
    if (existing.endTime <= now) {
      throw new AppError("INVALID_STATE", "This reservation has already ended and cannot be cancelled.");
    }
    // Conditional update guards against a concurrent cancellation.
    const { count } = await prisma.reservation.updateMany({
      where: { id, status: "CONFIRMED" },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    if (count === 0) throw new AppError("INVALID_STATE", "This reservation was already cancelled.");
    return prisma.reservation.findUniqueOrThrow({ where: { id }, include: reservationInclude });
  }

  if (existing.status !== "CONFIRMED") {
    throw new AppError("INVALID_STATE", `A ${existing.status.toLowerCase()} reservation cannot be edited.`);
  }

  const { startTime, endTime, title, notes } = input;
  if (!startTime || !endTime) {
    return prisma.reservation.update({ where: { id }, data: { title, notes }, include: reservationInclude });
  }

  if (existing.startTime <= now) {
    throw new AppError("INVALID_STATE", "A reservation that has already started cannot be rescheduled.");
  }
  // Duration rules were already checked by the schema; apply the booking window too.
  assertWithinBookingWindow(startTime, now);

  return withOverlapGuard(
    () =>
      prisma.$transaction(async (tx) => {
        await assertResourceBookable(tx, existing.resourceId, startTime, endTime, id);
        return tx.reservation.update({
          where: { id },
          data: { title, notes, startTime, endTime },
          include: reservationInclude,
        });
      }),
    { resourceId: existing.resourceId, start: startTime, end: endTime, excludeId: id },
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listReservations(query: ReservationQuery) {
  await connection();
  const now = new Date();

  const scopeWhere: Record<ReservationQuery["scope"], Prisma.ReservationWhereInput> = {
    upcoming: { status: "CONFIRMED", endTime: { gt: now } },
    past: { OR: [{ status: "COMPLETED" }, { status: "CONFIRMED", endTime: { lte: now } }] },
    cancelled: { status: "CANCELLED" },
    all: {},
  };

  const where: Prisma.ReservationWhereInput = {
    AND: [
      scopeWhere[query.scope],
      query.resourceId ? { resourceId: query.resourceId } : {},
      query.userId ? { userId: query.userId } : {},
      // Window filter returns anything overlapping [from, to).
      query.to ? { startTime: { lt: query.to } } : {},
      query.from ? { endTime: { gt: query.from } } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: reservationInclude,
      orderBy: { startTime: query.scope === "upcoming" ? "asc" : "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

/**
 * Earliest start at or after `from` (on a `stepMinutes` boundary) where a booking
 * of `durationMs` fits between the resource's existing confirmed bookings.
 */
export async function findNextFreeSlot(resourceId: string, from: Date, durationMs: number, stepMinutes = 15) {
  const bookings = await prisma.reservation.findMany({
    where: { resourceId, status: "CONFIRMED", endTime: { gt: from } },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
    take: 200,
  });
  let start = from;
  for (const booking of bookings) {
    if (booking.startTime.getTime() >= start.getTime() + durationMs) break;
    if (booking.endTime > start) start = roundUp(booking.endTime, stepMinutes);
  }
  return start;
}

export async function getReservation(id: string) {
  await connection();
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: reservationInclude });
  if (!reservation) throw new AppError("NOT_FOUND", "Reservation not found");
  return reservation;
}
