import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { AccessDenied } from "@/components/auth/access";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { canManageReservation, requireUser } from "@/lib/auth/dal";
import { dateToWallTime } from "@/lib/datetime";
import { defaultBookingSlot, orNotFound } from "@/lib/page-helpers";
import { canReschedule, getReservationPhase, PHASE_LABELS } from "@/lib/reservation-status";
import { getReservation } from "@/lib/services/reservations";

export const metadata: Metadata = { title: "Reschedule reservation" };

export default function EditReservationPage({ params }: PageProps<"/reservations/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
      <EditReservation params={params} />
    </Suspense>
  );
}

async function EditReservation({ params }: Pick<PageProps<"/reservations/[id]/edit">, "params">) {
  const user = await requireUser();
  const { id } = await params;
  const [reservation, slot] = await Promise.all([orNotFound(getReservation(id)), defaultBookingSlot()]);
  await connection();
  const phase = getReservationPhase(reservation, new Date());

  const header = (
    <PageHeader
      title="Reschedule reservation"
      description={`${reservation.title} · ${reservation.resource.name}`}
      back={{ href: "/reservations", label: "Reservations" }}
    />
  );

  if (!canManageReservation(user, reservation)) {
    return (
      <>
        {header}
        <AccessDenied message="You can only reschedule your own reservations." />
      </>
    );
  }

  return (
    <>
      {header}
      {canReschedule(phase) ? (
        <ReservationForm
          mode="edit"
          reservationId={reservation.id}
          resources={[{ ...reservation.resource, capacity: null }]}
          users={[{ id: reservation.user.id, name: reservation.user.name, department: reservation.user.department }]}
          canChooseUser={false}
          minStart={slot.minStart}
          initial={{
            resourceId: reservation.resourceId,
            userId: reservation.userId,
            title: reservation.title,
            notes: reservation.notes ?? "",
            startTime: dateToWallTime(reservation.startTime),
            endTime: dateToWallTime(reservation.endTime),
          }}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white">
          <EmptyState
            title={`This reservation is ${PHASE_LABELS[phase].toLowerCase()}`}
            description="Only reservations that have not started yet can be rescheduled."
            action={
              <LinkButton href="/reservations" variant="secondary">
                Back to reservations
              </LinkButton>
            }
          />
        </div>
      )}
    </>
  );
}
