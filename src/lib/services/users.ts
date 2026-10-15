import "server-only";
import { connection } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import type { SessionUser } from "@/lib/auth/session";

const publicUser = { id: true, name: true, email: true, department: true, role: true } as const;

export async function listUsers() {
  await connection();
  return prisma.user.findMany({ orderBy: { name: "asc" }, select: publicUser });
}

/** Users with booking counts, for the admin "People" page. */
export async function listUsersWithStats() {
  await connection();
  const now = new Date();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      ...publicUser,
      createdAt: true,
      _count: {
        select: {
          reservations: { where: { status: "CONFIRMED", endTime: { gt: now } } },
          sessions: { where: { expiresAt: { gt: now } } },
        },
      },
    },
  });
  return users.map(({ _count, ...user }) => ({
    ...user,
    upcomingReservations: _count.reservations,
    activeSessions: _count.sessions,
  }));
}

export async function getPublicUser(id: string) {
  return prisma.user.findUniqueOrThrow({ where: { id }, select: publicUser });
}

export async function findUserForLogin(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
}

/**
 * Registers a member account. The very first account on an empty system becomes
 * an administrator so a fresh installation can be managed without seeding.
 */
export async function registerUser(input: { name: string; email: string; department: string | null; password: string }) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.$transaction(async (tx) => {
      const isFirstUser = (await tx.user.count()) === 0;
      return tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          department: input.department,
          passwordHash,
          role: isFirstUser ? "ADMIN" : "MEMBER",
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("DUPLICATE", "An account with this email already exists", {
        fieldErrors: { email: "An account with this email already exists" },
      });
    }
    throw error;
  }
}

export async function updateProfile(userId: string, input: { name: string; department: string | null }) {
  return prisma.user.update({ where: { id: userId }, data: input, select: publicUser });
}

export async function getPasswordHash(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return user?.passwordHash ?? null;
}

export async function setPassword(userId: string, password: string) {
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
}

/** Changes another user's role. Admins cannot change their own role, which also prevents locking everyone out. */
export async function updateUserRole(actor: SessionUser, userId: string, role: "ADMIN" | "MEMBER") {
  if (actor.id === userId) {
    throw new AppError("INVALID_STATE", "You cannot change your own role. Ask another administrator.");
  }
  try {
    const user = await prisma.user.update({ where: { id: userId }, data: { role }, select: publicUser });
    // Role is read from the database on every request, so the change applies immediately.
    return user;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new AppError("NOT_FOUND", "User not found");
    }
    throw error;
  }
}
