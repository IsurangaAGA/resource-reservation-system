import { NextResponse, type NextRequest } from "next/server";
import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/dal";
import { listUsers } from "@/lib/services/users";

/** GET /api/users — people who can be assigned to a reservation (admin). */
export const GET = route(async (_request: NextRequest) => {
  await requireApiUser({ admin: true });
  return NextResponse.json({ data: await listUsers() });
});
