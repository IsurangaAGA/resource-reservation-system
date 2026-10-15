import { Suspense, type ReactNode } from "react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser, isAdmin } from "@/lib/auth/dal";

/** Renders its children only for administrators. Streams in, so it never blocks the page shell. */
export function AdminOnly({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return user && isAdmin(user) ? children : null;
}

export function AccessDenied({ message = "Only administrators can access this page." }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white">
      <EmptyState
        title="You don’t have access to this page"
        description={message}
        action={
          <LinkButton href="/" variant="secondary">
            Back to dashboard
          </LinkButton>
        }
      />
    </div>
  );
}
