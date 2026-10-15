import { Suspense } from "react";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, isAdmin } from "@/lib/auth/dal";
import { Logo } from "./logo";
import { ActiveNavLinks, NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Logo compact />
        {/* The active-link highlight depends on the URL, so it streams in after the static shell. */}
        <Suspense fallback={<NavLinks pathname={null} />}>
          <ActiveNavLinks />
        </Suspense>
        <div className="ml-auto flex items-center gap-3">
          <LinkButton href="/reservations/new" size="sm" className="max-md:hidden">
            + New reservation
          </LinkButton>
          <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
            <CurrentUserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function CurrentUserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LinkButton href="/login" variant="secondary" size="sm">
        Sign in
      </LinkButton>
    );
  }
  return <UserMenu name={user.name} email={user.email} isAdmin={isAdmin(user)} />;
}
