import { NextResponse, type NextRequest } from "next/server";
import { parseInput, readJson, route, searchParamsToObject } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/dal";
import { createReservation, listReservations } from "@/lib/services/reservations";
import { reservationCreateSchema, reservationQuerySchema } from "@/lib/validation";

/**
 * GET /api/reservations?scope=upcoming|past|cancelled|all&resourceId=&userId=&from=&to=&limit=&offset=
 * Every signed-in user can see the shared schedule.
 */
export const GET = route(async (request: NextRequest) => {
  await requireApiUser();
  const query = parseInput(reservationQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
  const { items, ...page } = await listReservations(query);
  return NextResponse.json({ data: items, meta: page });
});

/**
 * POST /api/reservations — book a resource for yourself (admins may pass userId).
 * Returns 409 RESERVATION_CONFLICT (with the clashing bookings) if the slot overlaps
 * an existing confirmed reservation, or 409 RESOURCE_UNAVAILABLE if the resource
 * is under maintenance or retired.
 */
export const POST = route(async (request: NextRequest) => {
  const user = await requireApiUser();
  const input = parseInput(reservationCreateSchema, await readJson(request));
  return NextResponse.json({ data: await createReservation(user, input) }, { status: 201 });
});
