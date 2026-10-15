import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminOnly } from "@/components/auth/access";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceFilters } from "@/components/resources/resource-filters";
import { RESOURCE_STATUSES, RESOURCE_TYPES, type ResourceStatus, type ResourceType } from "@/lib/constants";
import { isAdmin, requireUser } from "@/lib/auth/dal";
import { firstParam } from "@/lib/page-helpers";
import { listResources } from "@/lib/services/resources";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  return (
    <>
      <PageHeader
        title="Resources"
        description="Meeting rooms, equipment and vehicles available for booking."
        actions={
          <AdminOnly>
            <LinkButton href="/resources/new">Add resource</LinkButton>
          </AdminOnly>
        }
      />
      <Suspense fallback={<ResourceGridSkeleton />}>
        <FilteredResources searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FilteredResources({ searchParams }: { searchParams: PageProps<"/resources">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = firstParam(params.q)?.trim() || undefined;
  const typeParam = firstParam(params.type);
  const statusParam = firstParam(params.status);
  // Ignore unknown filter values instead of failing the page.
  const type = RESOURCE_TYPES.includes(typeParam as ResourceType) ? (typeParam as ResourceType) : undefined;
  const status = RESOURCE_STATUSES.includes(statusParam as ResourceStatus) ? (statusParam as ResourceStatus) : undefined;

  const resources = await listResources({ q, type, status });
  const filtered = Boolean(q || type || status);

  return (
    <>
      <ResourceFilters q={q} type={type} status={status} />
      {resources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white">
          <EmptyState
            title={filtered ? "No resources match these filters" : "No resources yet"}
            description={
              filtered
                ? "Try a different search or clear the filters."
                : isAdmin(user)
                  ? "Add your first meeting room, piece of equipment or vehicle."
                  : "An administrator has not added any resources yet."
            }
            action={!filtered && isAdmin(user) && <LinkButton href="/resources/new">Add resource</LinkButton>}
          />
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {resources.length} resource{resources.length === 1 ? "" : "s"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ResourceGridSkeleton() {
  return (
    <>
      <Skeleton className="mb-6 h-20 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    </>
  );
}
