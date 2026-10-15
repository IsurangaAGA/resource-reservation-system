import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { isAdmin, requireUser } from "@/lib/auth/dal";
import { dateToWallTime } from "@/lib/datetime";
import { defaultBookingSlot, firstParam } from "@/lib/page-helpers";
import { findNextFreeSlot } from "@/lib/services/reservations";
import { listResources } from "@/lib/services/resources";
import { listUsers } from "@/lib/services/users";

export const metadata: Metadata = { title: "New reservation" };

const DEFAULT_DURATION_MS = 60 * 60_000;

export default function NewReservationPage({ searchParams }: PageProps<"/reservations/new">) {
  return (
    <>
      <PageHeader
        title="New reservation"
        description="Pick a resource and a time. Overlapping bookings are rejected automatically."
        back={{ href: "/", label: "Dashboard" }}
      />
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
        <BookingForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BookingForm({ searchParams }: { searchParams: PageProps<"/reservations/new">["searchParams"] }) {
  const user = await requireUser();
  const admin = isAdmin(user);
  const requested = firstParam((await searchParams).resourceId);
  const [resources, users, slot] = await Promise.all([
    listResources(),
    admin ? listUsers() : Promise.resolve([{ id: user.id, name: user.name, department: user.department }]),
    defaultBookingSlot(),
  ]);

  const bookable = resources.filter((r) => r.status === "AVAILABLE");
  if (bookable.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState
          title="No resources can be booked right now"
          description={
            admin
              ? "Add a resource or set an existing one back to Available."
              : "All resources are under maintenance or retired. Please check back later."
          }
          action={admin && <LinkButton href="/resources/new">Add resource</LinkButton>}
        />
      </div>
    );
  }

  const resourceId = bookable.some((r) => r.id === requested) ? requested! : "";
  let { startTime, endTime } = slot;
  if (resourceId) {
    // Suggest the first free hour for the chosen resource instead of a slot that already clashes.
    const start = await findNextFreeSlot(resourceId, slot.start, DEFAULT_DURATION_MS);
    startTime = dateToWallTime(start);
    endTime = dateToWallTime(new Date(start.getTime() + DEFAULT_DURATION_MS));
  }

  return (
    <ReservationForm
      mode="create"
      resources={resources.map(({ id, name, type, location, status, capacity }) => ({ id, name, type, location, status, capacity }))}
      users={users}
      canChooseUser={admin}
      minStart={slot.minStart}
      initial={{ resourceId, userId: user.id, startTime, endTime }}
    />
  );
}
