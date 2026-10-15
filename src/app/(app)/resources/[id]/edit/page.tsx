import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/auth/access";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceForm } from "@/components/resources/resource-form";
import { isAdmin, requireUser } from "@/lib/auth/dal";
import { orNotFound } from "@/lib/page-helpers";
import { getResource } from "@/lib/services/resources";

export const metadata: Metadata = { title: "Edit resource" };

export default function EditResourcePage({ params }: PageProps<"/resources/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-2xl rounded-xl" />}>
      <EditResource params={params} />
    </Suspense>
  );
}

async function EditResource({ params }: Pick<PageProps<"/resources/[id]/edit">, "params">) {
  const user = await requireUser();
  if (!isAdmin(user)) {
    return (
      <>
        <PageHeader title="Edit resource" back={{ href: "/resources", label: "Resources" }} />
        <AccessDenied message="Only administrators can edit resources." />
      </>
    );
  }
  const { id } = await params;
  const resource = await orNotFound(getResource(id));

  return (
    <>
      <PageHeader title={`Edit ${resource.name}`} back={{ href: `/resources/${resource.id}`, label: resource.name }} />
      <ResourceForm
        mode="edit"
        resourceId={resource.id}
        initial={{
          name: resource.name,
          type: resource.type,
          location: resource.location,
          capacity: resource.capacity,
          status: resource.status,
          description: resource.description ?? "",
        }}
      />
    </>
  );
}
