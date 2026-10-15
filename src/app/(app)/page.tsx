import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/form";
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { AdminOnly } from "@/components/auth/access";
import { AvailabilityBadge, NextBookingText } from "@/components/status-badges";
import { ReservationItem } from "@/components/reservations/reservation-item";
import { requireUser } from "@/lib/auth/dal";
import { RESOURCE_TYPE_LABELS } from "@/lib/constants";
import { formatDate, zonedHour } from "@/lib/datetime";
import { firstParam } from "@/lib/page-helpers";
import { getDashboardData } from "@/lib/services/dashboard";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Suspense
          fallback={
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
              <Skeleton className="mt-2 h-4 w-56" />
            </div>
          }
        >
          <Greeting />
        </Suspense>
        <div className="flex flex-wrap gap-2">
          <AdminOnly>
            <LinkButton href="/resources/new" variant="secondary">
              Add resource
            </LinkButton>
          </AdminOnly>
          <LinkButton href="/reservations/new">New reservation</LinkButton>
        </div>
      </div>
      <Suspense fallback={null}>
        <WelcomeBanner searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

async function Greeting() {
  const user = await requireUser();
  const { now } = await getDashboardData(user.id);
  const hour = zonedHour(now);
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {salutation}, {user.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-slate-500">Here is what is happening on {formatDate(now)}.</p>
    </div>
  );
}

async function WelcomeBanner({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  if (firstParam((await searchParams).welcome) !== "1") return null;
  const user = await requireUser();
  return (
    <div className="mb-6">
      <Alert tone="info" title={`Welcome to ResourceHub, ${user.name.split(" ")[0]}!`}>
        {user.role === "ADMIN"
          ? "You are the first user, so you have administrator access. Start by adding the resources people can book."
          : "Browse the resources and make your first reservation — overlapping bookings are blocked automatically."}
      </Alert>
    </div>
  );
}

async function DashboardContent() {
  const user = await requireUser();
  const { now, stats, resources, activeAndUpcoming, history } = await getDashboardData(user.id);
  const activeResources = resources.filter((r) => r.status !== "RETIRED");

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Available now" value={stats.availableNow} detail={`of ${stats.totalResources} resources`} tone="text-emerald-600" />
        <Stat label="In use now" value={stats.inUseNow} detail={`${stats.underMaintenance} under maintenance`} tone="text-amber-600" />
        <Stat label="Bookings this week" value={stats.upcomingThisWeek} detail="next 7 days, all resources" tone="text-indigo-600" />
        <Stat
          label="Your upcoming"
          value={stats.myUpcoming}
          detail={<Link href="/reservations?mine=1" className="text-indigo-600 hover:text-indigo-500">View my reservations →</Link>}
          tone="text-slate-800"
        />
      </dl>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader
            title="Active & upcoming reservations"
            description="Bookings in progress or still to come"
            action={
              <Link href="/reservations" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                View all
              </Link>
            }
          />
          {activeAndUpcoming.length === 0 ? (
            <EmptyState
              title="No upcoming reservations"
              description="Everything is free. Book a resource to get started."
              action={<LinkButton href="/reservations/new">New reservation</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeAndUpcoming.map((reservation) => (
                <ReservationItem key={reservation.id} reservation={reservation} now={now} viewer={user} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader
            title="Resource availability"
            description="Live status right now"
            action={
              <Link href="/resources" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Browse
              </Link>
            }
          />
          {activeResources.length === 0 ? (
            <EmptyState
              title="No resources yet"
              description={user.role === "ADMIN" ? "Add the rooms, equipment and vehicles people can book." : "An administrator has not added any resources yet."}
              action={user.role === "ADMIN" && <LinkButton href="/resources/new">Add resource</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeResources.map((resource) => (
                <li key={resource.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/resources/${resource.id}`} className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600">
                      {resource.name}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {RESOURCE_TYPE_LABELS[resource.type]} ·{" "}
                      {resource.currentReservation ? (
                        `Booked by ${resource.currentReservation.user.id === user.id ? "you" : resource.currentReservation.user.name}`
                      ) : (
                        <NextBookingText reservation={resource.nextReservation} />
                      )}
                    </p>
                  </div>
                  <AvailabilityBadge status={resource.status} currentReservation={resource.currentReservation} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent history"
          description="Recently completed and cancelled reservations"
          action={
            <Link href="/reservations?scope=past" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Full history
            </Link>
          }
        />
        {history.length === 0 ? (
          <EmptyState title="No booking history yet" description="Completed and cancelled reservations will appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((reservation) => (
              <ReservationItem key={reservation.id} reservation={reservation} now={now} viewer={user} showActions={false} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, detail, tone }: { label: string; value: number; detail: ReactNode; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className={`mt-2 text-3xl font-semibold tracking-tight ${tone}`}>{value}</dd>
      <dd className="mt-1 text-xs text-slate-400">{detail}</dd>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <ListSkeleton rows={5} />
        </Card>
        <Card>
          <ListSkeleton rows={5} />
        </Card>
      </div>
    </div>
  );
}
