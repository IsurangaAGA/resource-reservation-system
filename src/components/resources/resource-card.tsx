import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { AvailabilityBadge, NextBookingText, ResourceTypeBadge } from "@/components/status-badges";
import type { ResourceListItem } from "@/lib/services/resources";

export function ResourceCard({ resource }: { resource: ResourceListItem }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">
            <Link href={`/resources/${resource.id}`} className="hover:text-indigo-600">
              {resource.name}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {resource.location}
            {resource.capacity ? ` · ${resource.capacity} seats` : ""}
          </p>
        </div>
        <ResourceTypeBadge type={resource.type} />
      </div>

      {resource.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{resource.description}</p>}

      <div className="mt-4 flex flex-1 flex-col justify-end gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <AvailabilityBadge status={resource.status} currentReservation={resource.currentReservation} />
          {resource.status === "AVAILABLE" && <NextBookingText reservation={resource.nextReservation} />}
        </div>
        <div className="flex gap-2 border-t border-slate-100 pt-3">
          <LinkButton href={`/resources/${resource.id}`} variant="secondary" size="sm" className="flex-1">
            Details
          </LinkButton>
          {resource.status === "AVAILABLE" && (
            <LinkButton href={`/reservations/new?resourceId=${resource.id}`} size="sm" className="flex-1">
              Book
            </LinkButton>
          )}
        </div>
      </div>
    </article>
  );
}
