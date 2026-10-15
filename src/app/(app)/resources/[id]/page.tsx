import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Card, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { AvailabilityBadge, ReservationPhaseBadge, ResourceTypeBadge } from "@/components/status-badges";
import { DeleteResourceButton } from "@/components/resources/delete-resource-button";
import { CancelReservationButton } from "@/components/reservations/cancel-reservation-button";
import { canManageReservation, isAdmin, requireUser } from "@/lib/auth/dal";
import { formatDuration, formatRange } from "@/lib/datetime";
import { orNotFound } from "@/lib/page-helpers";
import { canReschedule, getReservationPhase } from "@/lib/reservation-status";
import { getResource } from "@/lib/services/resources";

export const metadata: Metadata = { title: "Resource" };

export default function ResourcePage({ params, searchParams }: PageProps<"/resources/[id]">) {
  return (
    <Suspense fallback={<ResourceSkeleton />}>
      <ResourceDetails params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ResourceDetails({ params, searchParams }: PageProps<"/resources/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { booked } = await searchParams;
  await connection();
  const now = new Date();
  const resource = await orNotFound(getResource(id));
  const current = resource.upcomingReservations.find((r) => r.startTime <= now) ?? null;

  return (
    <>
      <PageHeader
        title={resource.name}
        back={{ href: "/resources", label: "Resources" }}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <ResourceTypeBadge type={resource.type} />
            <AvailabilityBadge status={resource.status} currentReservation={current} />
          </div>
        }
        actions={
          <>
            {resource.status === "AVAILABLE" && (
              <LinkButton href={`/reservations/new?resourceId=${resource.id}`}>Book this resource</LinkButton>
            )}
            {isAdmin(user) && (
              <>
                <LinkButton href={`/resources/${resource.id}/edit`} variant="secondary">
                  Edit
                </LinkButton>
                <DeleteResourceButton resourceId={resource.id} resourceName={resource.name} />
              </>
            )}
          </>
        }
      />

      {booked && (
        <div className="mb-6">
          <Alert tone="info" title="Reservation saved">
            The booking is confirmed and appears in the schedule below.
          </Alert>
        </div>
      )}
      {resource.status !== "AVAILABLE" && (
        <div className="mb-6">
          <Alert tone="warning" title={`This resource is ${resource.status === "MAINTENANCE" ? "under maintenance" : "retired"}`}>
            New bookings are blocked until an administrator sets its status back to Available.
            {resource.upcomingReservations.length > 0 && " Existing bookings below may need to be cancelled or moved."}
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader title="Details" />
          <dl className="divide-y divide-slate-100 text-sm">
            <Detail label="Location" value={resource.location} />
            <Detail label="Capacity" value={resource.capacity ? `${resource.capacity}` : "—"} />
            <Detail label="Total bookings" value={`${resource.totalReservations}`} />
            <div className="px-5 py-3">
              <dt className="text-slate-500">Description</dt>
              <dd className="mt-1 whitespace-pre-line text-slate-800">{resource.description || "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Schedule"
            description="Confirmed bookings in progress or upcoming"
            action={
              <LinkButton href={`/reservations?scope=all&resourceId=${resource.id}`} variant="ghost" size="sm">
                Full history
              </LinkButton>
            }
          />
          {resource.upcomingReservations.length === 0 ? (
            <EmptyState title="Nothing booked" description="This resource is free for the foreseeable future." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {resource.upcomingReservations.map((reservation) => {
                const phase = getReservationPhase({ ...reservation, status: "CONFIRMED" }, now);
                return (
                  <li key={reservation.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-900">{reservation.title}</p>
                        <ReservationPhaseBadge phase={phase} />
                      </div>
                      <p className="text-sm text-slate-600">
                        {formatRange(reservation.startTime, reservation.endTime)}
                        <span className="text-slate-400"> · {formatDuration(reservation.startTime, reservation.endTime)}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {reservation.user.id === user.id ? (
                          <span className="font-medium text-indigo-600">Booked by you</span>
                        ) : (
                          `Booked by ${reservation.user.name}`
                        )}
                      </p>
                    </div>
                    {canManageReservation(user, { userId: reservation.user.id }) && (
                    <div className="flex shrink-0 gap-1">
                      {canReschedule(phase) && (
                        <LinkButton href={`/reservations/${reservation.id}/edit`} variant="ghost" size="sm">
                          Reschedule
                        </LinkButton>
                      )}
                      <CancelReservationButton reservationId={reservation.id} />
                    </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function ResourceSkeleton() {
  return (
    <>
      <Skeleton className="mb-8 h-14 w-72" />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-xl" />
        <Card>
          <ListSkeleton rows={4} />
        </Card>
      </div>
    </>
  );
}
