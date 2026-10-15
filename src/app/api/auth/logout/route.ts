import { NextResponse, type NextRequest } from "next/server";
import { route } from "@/lib/api";
import { destroySession } from "@/lib/auth/session";

/** POST /api/auth/logout — ends the current session. */
export const POST = route(async (_request: NextRequest) => {
  await destroySession();
  return new NextResponse(null, { status: 204 });
});
