import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { ReservationItem } from "@/components/reservations/reservation-item";
import { requireUser } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { firstParam } from "@/lib/page-helpers";
import { listReservations } from "@/lib/services/reservations";
import { getResourceSummary } from "@/lib/services/resources";

export const metadata: Metadata = { title: "Reservations" };

const SCOPES = [
  { value: "upcoming", label: "Active & upcoming" },
  { value: "past", label: "History" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
] as const;
type Scope = (typeof SCOPES)[number]["value"];

const PAGE_SIZE = 20;

export default function ReservationsPage({ searchParams }: PageProps<"/reservations">) {
  return (
    <>
      <PageHeader
        title="Reservations"
        description="Track, reschedule and cancel bookings across all resources."
        actions={<LinkButton href="/reservations/new">New reservation</LinkButton>}
      />
      <Suspense fallback={<Card><ListSkeleton rows={6} /></Card>}>
        <ReservationList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ReservationList({ searchParams }: { searchParams: PageProps<"/reservations">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const mine = firstParam(params.mine) === "1";
  const scopeParam = firstParam(params.scope);
  const scope: Scope = SCOPES.some((s) => s.value === scopeParam) ? (scopeParam as Scope) : "upcoming";
  const resourceId = firstParam(params.resourceId) || undefined;
  const page = Math.max(1, Number.parseInt(firstParam(params.page) ?? "1", 10) || 1);

  await connection();
  const now = new Date();
  const [{ items, total }, resource] = await Promise.all([
    listReservations({
      scope,
      resourceId,
      userId: mine ? user.id : undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    resourceId ? getResourceSummary(resourceId) : null,
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (next: { scope?: Scope; page?: number; resourceId?: string | null; mine?: boolean }) => {
    const query = new URLSearchParams();
    query.set("scope", next.scope ?? scope);
    if (next.mine ?? mine) query.set("mine", "1");
    const rid = next.resourceId === null ? undefined : (next.resourceId ?? resourceId);
    if (rid) query.set("resourceId", rid);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    return `/reservations?${query}`;
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-sm max-sm:w-full" aria-label="Filter reservations">
          {SCOPES.map((s) => (
            <Link
              key={s.value}
              href={href({ scope: s.value })}
              aria-current={s.value === scope ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-center font-medium whitespace-nowrap max-sm:flex-1 sm:px-3",
                s.value === scope ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm" role="group" aria-label="Whose reservations">
            {[
              { label: "Everyone", value: false },
              { label: "Only mine", value: true },
            ].map((option) => (
              <Link
                key={option.label}
                href={href({ mine: option.value, page: 1 })}
                aria-current={option.value === mine ? "true" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium whitespace-nowrap",
                  option.value === mine ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
        {resource && (
          <p className="text-sm text-slate-600">
            Showing <span className="font-medium text-slate-900">{resource.name}</span> only ·{" "}
            <Link href={href({ resourceId: null })} className="font-medium text-indigo-600 hover:text-indigo-500">
              Show all resources
            </Link>
          </p>
        )}
        </div>
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            title={
              scope === "upcoming"
                ? mine
                  ? "You have no active or upcoming reservations"
                  : "No active or upcoming reservations"
                : "No reservations here"
            }
            description={scope === "upcoming" ? "Book a resource and it will appear here." : undefined}
            action={scope === "upcoming" && <LinkButton href="/reservations/new">New reservation</LinkButton>}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((reservation) => (
              <ReservationItem key={reservation.id} reservation={reservation} now={now} viewer={user} />
            ))}
          </ul>
        )}
      </Card>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <p>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          {pageCount > 1 && (
            <div className="flex gap-2">
              {page > 1 && (
                <LinkButton href={href({ page: page - 1 })} variant="secondary" size="sm">
                  Previous
                </LinkButton>
              )}
              {page < pageCount && (
                <LinkButton href={href({ page: page + 1 })} variant="secondary" size="sm">
                  Next
                </LinkButton>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
