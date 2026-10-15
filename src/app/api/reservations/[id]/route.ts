import { NextResponse, type NextRequest } from "next/server";
import { parseInput, readJson, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/dal";
import { getReservation, updateReservation } from "@/lib/services/reservations";
import { reservationUpdateSchema } from "@/lib/validation";

type Context = RouteContext<"/api/reservations/[id]">;

/** GET /api/reservations/:id */
export const GET = route(async (_request: NextRequest, { params }: Context) => {
  await requireApiUser();
  const { id } = await params;
  return NextResponse.json({ data: await getReservation(id) });
});

/**
 * PATCH /api/reservations/:id — owner or admin only.
 *   { "status": "CANCELLED" }                         → cancel (kept for history)
 *   { "title"?, "notes"?, "startTime"?, "endTime"? }  → edit / reschedule (conflict-checked)
 */
export const PATCH = route(async (request: NextRequest, { params }: Context) => {
  const user = await requireApiUser();
  const { id } = await params;
  const input = parseInput(reservationUpdateSchema, await readJson(request));
  return NextResponse.json({ data: await updateReservation(user, id, input) });
});
