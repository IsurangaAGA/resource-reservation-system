import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/auth/access";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceForm } from "@/components/resources/resource-form";
import { isAdmin, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Add resource" };

export default function NewResourcePage() {
  return (
    <>
      <PageHeader
        title="Add resource"
        description="Register a room, piece of equipment or vehicle so people can book it."
        back={{ href: "/resources", label: "Resources" }}
      />
      <Suspense fallback={<Skeleton className="h-96 max-w-2xl rounded-xl" />}>
        <AdminResourceForm />
      </Suspense>
    </>
  );
}

async function AdminResourceForm() {
  const user = await requireUser();
  if (!isAdmin(user)) return <AccessDenied message="Only administrators can add resources." />;
  return <ResourceForm mode="create" />;
}
