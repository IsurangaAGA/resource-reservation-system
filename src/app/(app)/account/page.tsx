import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm, ProfileForm } from "@/components/auth/account-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/auth/actions";
import { isAdmin, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Account settings" };

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Account settings" description="Manage your profile and password." />
      <Suspense fallback={<Skeleton className="h-96 max-w-3xl rounded-xl" />}>
        <AccountSettings />
      </Suspense>
    </>
  );
}

async function AccountSettings() {
  const user = await requireUser();

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader
          title="Profile"
          description="Your name and department are shown next to your bookings."
          action={<Badge tone={isAdmin(user) ? "indigo" : "slate"}>{isAdmin(user) ? "Administrator" : "Member"}</Badge>}
        />
        <div className="p-5">
          <p className="mb-5 text-sm text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{user.email}</span>
          </p>
          <ProfileForm name={user.name} department={user.department} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Password" description="Changing your password signs you out on all other devices." />
        <div className="p-5">
          <PasswordForm />
        </div>
      </Card>

      <Card>
        <CardHeader title="Session" description="Sign out of ResourceHub on this device." />
        <form action={logout} className="flex justify-end p-5">
          <Button type="submit" variant="secondary" className="text-rose-600">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
