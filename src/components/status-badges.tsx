import { Badge, type BadgeTone } from "@/components/ui/badge";
import { RESOURCE_STATUS_LABELS, RESOURCE_TYPE_LABELS, type ResourceStatus, type ResourceType } from "@/lib/constants";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { PHASE_LABELS, type ReservationPhase } from "@/lib/reservation-status";

const RESOURCE_STATUS_TONES: Record<ResourceStatus, BadgeTone> = {
  AVAILABLE: "green",
  MAINTENANCE: "amber",
  RETIRED: "slate",
};

const PHASE_TONES: Record<ReservationPhase, BadgeTone> = {
  UPCOMING: "blue",
  IN_PROGRESS: "indigo",
  COMPLETED: "slate",
  CANCELLED: "red",
};

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <Badge tone={RESOURCE_STATUS_TONES[status]} dot>
      {RESOURCE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ResourceTypeBadge({ type }: { type: ResourceType }) {
  return <Badge tone="slate">{RESOURCE_TYPE_LABELS[type]}</Badge>;
}

export function ReservationPhaseBadge({ phase }: { phase: ReservationPhase }) {
  return (
    <Badge tone={PHASE_TONES[phase]} dot={phase === "IN_PROGRESS"}>
      {PHASE_LABELS[phase]}
    </Badge>
  );
}

/** Live availability: administrative status first, then current booking. */
export function AvailabilityBadge({
  status,
  currentReservation,
}: {
  status: ResourceStatus;
  currentReservation: { endTime: Date } | null;
}) {
  if (status !== "AVAILABLE") return <ResourceStatusBadge status={status} />;
  if (currentReservation) {
    return (
      <Badge tone="amber" dot>
        In use until {formatTime(currentReservation.endTime)}
      </Badge>
    );
  }
  return (
    <Badge tone="green" dot>
      Available now
    </Badge>
  );
}

export function NextBookingText({ reservation }: { reservation: { startTime: Date } | null }) {
  if (!reservation) return <span className="text-slate-400">No upcoming bookings</span>;
  return <span>Next booking {formatDateTime(reservation.startTime)}</span>;
}
