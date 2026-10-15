import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { ReservationPhaseBadge } from "@/components/status-badges";
import { CancelReservationButton } from "./cancel-reservation-button";
import { canManageReservation, type SessionUser } from "@/lib/auth/dal";
import { formatDuration, formatRange } from "@/lib/datetime";
import { canCancel, canReschedule, getReservationPhase } from "@/lib/reservation-status";
import type { ReservationWithRelations } from "@/lib/services/reservations";

export function ReservationItem({
  reservation,
  now,
  viewer,
  showResource = true,
  showActions = true,
}: {
  reservation: ReservationWithRelations;
  now: Date;
  viewer: Pick<SessionUser, "id" | "role">;
  showResource?: boolean;
  showActions?: boolean;
}) {
  const phase = getReservationPhase(reservation, now);
  const { resource, user } = reservation;
  const isOwn = user.id === viewer.id;
  const manageable = showActions && canManageReservation(viewer, reservation);

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-slate-900">{reservation.title}</p>
          <ReservationPhaseBadge phase={phase} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {formatRange(reservation.startTime, reservation.endTime)}
          <span className="text-slate-400"> · {formatDuration(reservation.startTime, reservation.endTime)}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {showResource && (
            <>
              <Link href={`/resources/${resource.id}`} className="font-medium text-slate-700 hover:text-indigo-600">
                {resource.name}
              </Link>
              {" · "}
            </>
          )}
          {isOwn ? (
            <span className="font-medium text-indigo-600">Booked by you</span>
          ) : (
            <>
              Booked by {user.name}
              {user.department && ` (${user.department})`}
            </>
          )}
        </p>
        {reservation.notes && <p className="mt-1 line-clamp-2 text-xs text-slate-500 italic">{reservation.notes}</p>}
      </div>
      {manageable && (canReschedule(phase) || canCancel(phase)) && (
        <div className="flex shrink-0 items-start gap-1 sm:justify-end">
          {canReschedule(phase) && (
            <LinkButton href={`/reservations/${reservation.id}/edit`} variant="ghost" size="sm">
              Reschedule
            </LinkButton>
          )}
          {canCancel(phase) && <CancelReservationButton reservationId={reservation.id} />}
        </div>
      )}
    </li>
  );
}
