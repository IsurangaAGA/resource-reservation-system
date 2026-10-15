import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/auth/access";
import { RoleSelect } from "@/components/auth/role-select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { isAdmin, requireUser } from "@/lib/auth/dal";
import { formatDate } from "@/lib/datetime";
import { listUsersWithStats } from "@/lib/services/users";

export const metadata: Metadata = { title: "People & roles" };

export default function PeoplePage() {
  return (
    <>
      <PageHeader
        title="People & roles"
        description="Administrators can manage resources and act on anyone's reservations. Members manage their own bookings."
      />
      <Suspense
        fallback={
          <Card>
            <ListSkeleton rows={4} />
          </Card>
        }
      >
        <PeopleList />
      </Suspense>
    </>
  );
}

async function PeopleList() {
  const viewer = await requireUser();
  if (!isAdmin(viewer)) return <AccessDenied message="Only administrators can manage people and roles." />;
  const people = await listUsersWithStats();

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-5 py-3">Person</th>
              <th scope="col" className="px-5 py-3">Department</th>
              <th scope="col" className="px-5 py-3">Upcoming bookings</th>
              <th scope="col" className="px-5 py-3">Joined</th>
              <th scope="col" className="px-5 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((person) => (
              <tr key={person.id} className="align-middle">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{person.name}</span>
                    {person.id === viewer.id && <Badge tone="indigo">You</Badge>}
                  </div>
                  <span className="text-xs text-slate-500">{person.email}</span>
                </td>
                <td className="px-5 py-3 text-slate-600">{person.department ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{person.upcomingReservations}</td>
                <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDate(person.createdAt)}</td>
                <td className="px-5 py-3">
                  {person.id === viewer.id ? (
                    <Badge tone="indigo">Administrator</Badge>
                  ) : (
                    <RoleSelect userId={person.id} role={person.role} userName={person.name} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
