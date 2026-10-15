import { NextResponse, type NextRequest } from "next/server";
import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/dal";

/** GET /api/auth/me — the signed-in user (401 if the session is missing or expired). */
export const GET = route(async (_request: NextRequest) => {
  return NextResponse.json({ data: await requireApiUser() });
});
