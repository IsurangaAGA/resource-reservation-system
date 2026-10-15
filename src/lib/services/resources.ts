import "server-only";
import { connection } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { ResourceCreateInput, ResourceUpdateInput } from "@/lib/validation";
import type { ResourceStatus, ResourceType } from "@/lib/constants";

const bookingSummary = {
  select: {
    id: true,
    title: true,
    startTime: true,
    endTime: true,
    user: { select: { id: true, name: true } },
  },
} as const;

/**
 * Lists resources with their current-or-next confirmed booking, which is what
 * the UI needs to show live availability ("In use until 14:00").
 */
export async function listResources(filters: { type?: ResourceType; status?: ResourceStatus; q?: string } = {}) {
  await connection();
  const now = new Date();

  const where: Prisma.ResourceWhereInput = {
    type: filters.type,
    status: filters.status,
  };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { location: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const resources = await prisma.resource.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      reservations: {
        ...bookingSummary,
        where: { status: "CONFIRMED", endTime: { gt: now } },
        orderBy: { startTime: "asc" },
        take: 1,
      },
    },
  });

  return resources.map(({ reservations, ...resource }) => {
    const next = reservations[0] ?? null;
    const inUse = next !== null && next.startTime <= now;
    return {
      ...resource,
      currentReservation: inUse ? next : null,
      nextReservation: inUse ? null : next,
      isAvailableNow: resource.status === "AVAILABLE" && !inUse,
    };
  });
}

export type ResourceListItem = Awaited<ReturnType<typeof listResources>>[number];

export async function getResource(id: string) {
  await connection();
  const now = new Date();

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      reservations: {
        ...bookingSummary,
        where: { status: "CONFIRMED", endTime: { gt: now } },
        orderBy: { startTime: "asc" },
        take: 25,
      },
      _count: { select: { reservations: true } },
    },
  });
  if (!resource) throw new AppError("NOT_FOUND", "Resource not found");

  const { reservations, _count, ...rest } = resource;
  return { ...rest, upcomingReservations: reservations, totalReservations: _count.reservations };
}

export async function getResourceSummary(id: string) {
  return prisma.resource.findUnique({ where: { id }, select: { id: true, name: true } });
}

function duplicateName(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new AppError("DUPLICATE", "A resource with this name already exists", {
      fieldErrors: { name: "A resource with this name already exists" },
    });
  }
  return error;
}

export async function createResource(input: ResourceCreateInput) {
  try {
    return await prisma.resource.create({ data: input });
  } catch (error) {
    throw duplicateName(error);
  }
}

export async function updateResource(id: string, input: ResourceUpdateInput) {
  try {
    return await prisma.resource.update({ where: { id }, data: input });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new AppError("NOT_FOUND", "Resource not found");
    }
    throw duplicateName(error);
  }
}

/**
 * Hard-deletes a resource only if it has never been booked. Resources with
 * booking history should be retired instead so that history stays intact.
 */
export async function deleteResource(id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { _count: { select: { reservations: true } } },
  });
  if (!resource) throw new AppError("NOT_FOUND", "Resource not found");
  if (resource._count.reservations > 0) {
    throw new AppError(
      "IN_USE",
      `This resource has ${resource._count.reservations} reservation(s) on record. Set its status to "Retired" instead of deleting it.`,
    );
  }
  await prisma.resource.delete({ where: { id } });
}
