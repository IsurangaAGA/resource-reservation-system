import { NextResponse, type NextRequest } from "next/server";
import { parseInput, readJson, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/dal";
import { updateUserRole } from "@/lib/services/users";
import { userRoleUpdateSchema } from "@/lib/validation";

/** PATCH /api/users/:id — change a user's role (admin, not for yourself). */
export const PATCH = route(async (request: NextRequest, { params }: RouteContext<"/api/users/[id]">) => {
  const actor = await requireApiUser({ admin: true });
  const { id } = await params;
  const { role } = parseInput(userRoleUpdateSchema, await readJson(request));
  return NextResponse.json({ data: await updateUserRole(actor, id, role) });
});
