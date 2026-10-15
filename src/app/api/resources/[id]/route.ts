import { NextResponse, type NextRequest } from "next/server";
import { parseInput, readJson, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/dal";
import { deleteResource, getResource, updateResource } from "@/lib/services/resources";
import { resourceUpdateSchema } from "@/lib/validation";

type Context = RouteContext<"/api/resources/[id]">;

/** GET /api/resources/:id — resource details with its upcoming bookings. */
export const GET = route(async (_request: NextRequest, { params }: Context) => {
  await requireApiUser();
  const { id } = await params;
  return NextResponse.json({ data: await getResource(id) });
});

/** PATCH /api/resources/:id — update any subset of fields (admin). */
export const PATCH = route(async (request: NextRequest, { params }: Context) => {
  await requireApiUser({ admin: true });
  const { id } = await params;
  const input = parseInput(resourceUpdateSchema, await readJson(request));
  return NextResponse.json({ data: await updateResource(id, input) });
});

/** DELETE /api/resources/:id — only for resources that were never booked (admin). */
export const DELETE = route(async (_request: NextRequest, { params }: Context) => {
  await requireApiUser({ admin: true });
  const { id } = await params;
  await deleteResource(id);
  return new NextResponse(null, { status: 204 });
});
