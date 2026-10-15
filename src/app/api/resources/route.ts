import { NextResponse, type NextRequest } from "next/server";
import { parseInput, readJson, route, searchParamsToObject } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/dal";
import { createResource, listResources } from "@/lib/services/resources";
import { resourceCreateSchema, resourceQuerySchema } from "@/lib/validation";

/** GET /api/resources?type=&status=&q= — list resources with live availability. */
export const GET = route(async (request: NextRequest) => {
  await requireApiUser();
  const filters = parseInput(resourceQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
  return NextResponse.json({ data: await listResources(filters) });
});

/** POST /api/resources — create a resource (admin). */
export const POST = route(async (request: NextRequest) => {
  await requireApiUser({ admin: true });
  const input = parseInput(resourceCreateSchema, await readJson(request));
  return NextResponse.json({ data: await createResource(input) }, { status: 201 });
});
