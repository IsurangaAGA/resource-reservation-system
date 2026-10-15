import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { listResources } from "./resources";
import { reservationInclude } from "./reservations";

/** Memoised per request so several components on the page can share one set of queries. */
export const getDashboardData = cache(async (userId: string) => {
  await connection();
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);

  const [resources, activeAndUpcoming, upcomingThisWeek, myUpcoming, history] = await Promise.all([
    listResources(),
    prisma.reservation.findMany({
      where: { status: "CONFIRMED", endTime: { gt: now } },
      include: reservationInclude,
      orderBy: { startTime: "asc" },
      take: 8,
    }),
    prisma.reservation.count({
      where: { status: "CONFIRMED", endTime: { gt: now }, startTime: { lt: weekAhead } },
    }),
    prisma.reservation.count({ where: { userId, status: "CONFIRMED", endTime: { gt: now } } }),
    prisma.reservation.findMany({
      where: { OR: [{ status: { not: "CONFIRMED" } }, { endTime: { lte: now } }] },
      include: reservationInclude,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  return {
    now,
    resources,
    activeAndUpcoming,
    history,
    stats: {
      totalResources: resources.filter((r) => r.status !== "RETIRED").length,
      availableNow: resources.filter((r) => r.isAvailableNow).length,
      inUseNow: resources.filter((r) => r.currentReservation).length,
      underMaintenance: resources.filter((r) => r.status === "MAINTENANCE").length,
      upcomingThisWeek,
      myUpcoming,
    },
  };
});
