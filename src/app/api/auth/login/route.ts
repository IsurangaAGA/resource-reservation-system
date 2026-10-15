import { NextResponse, type NextRequest } from "next/server";
import { parseInput, readJson, route } from "@/lib/api";
import { authenticate } from "@/lib/auth/authenticate";
import { createSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getPublicUser } from "@/lib/services/users";
import { loginSchema } from "@/lib/validation";

/**
 * POST /api/auth/login { email, password } — starts a cookie session for API
 * clients (the web UI uses the equivalent Server Action).
 */
export const POST = route(async (request: NextRequest) => {
  const { email, password } = parseInput(loginSchema, await readJson(request));
  const result = await authenticate(email, password);
  if (!result.ok) {
    throw new AppError(result.reason === "rate_limited" ? "RATE_LIMITED" : "UNAUTHENTICATED", result.message);
  }
  await createSession(result.userId);
  return NextResponse.json({ data: await getPublicUser(result.userId) });
});
