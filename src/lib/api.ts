import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AppError, type ApiErrorBody } from "./errors";

/** Reads a JSON body, turning malformed input into a 400 instead of a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Request body must be valid JSON");
  }
}

/** Validates input against a schema, throwing a 422 with per-field messages on failure. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    fieldErrors[key] ??= issue.message;
  }
  const [first] = result.error.issues;
  const label = first.path.length ? `${first.path.join(".")}: ` : "";
  throw new AppError("VALIDATION_ERROR", `${label}${first.message}`, { fieldErrors });
}

export function searchParamsToObject(params: URLSearchParams) {
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    if (value !== "") out[key] = value;
  });
  return out;
}

function errorResponse(error: AppError) {
  const body: ApiErrorBody = { error: { code: error.code, message: error.message, ...error.extra } };
  return NextResponse.json(body, { status: error.status });
}

function toAppError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025":
        return new AppError("NOT_FOUND", "The requested record does not exist");
      case "P2002":
        return new AppError("DUPLICATE", "A record with the same unique value already exists");
      case "P2003":
        return new AppError("IN_USE", "This record is referenced by other records and cannot be removed");
    }
  }
  return null;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Defence in depth against CSRF on top of the SameSite=Lax session cookie:
 * state-changing requests sent by a browser must come from this origin.
 */
function assertSameOrigin(request: Request) {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return; // Non-browser clients do not send Origin.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // Malformed Origin header: treated as a mismatch below.
  }
  if (originHost !== host) throw new AppError("FORBIDDEN", "Cross-origin requests are not allowed");
}

/** Wraps a route handler so every thrown error becomes a consistent JSON response. */
export function route<Args extends [Request, ...unknown[]]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      assertSameOrigin(args[0]);
      return await handler(...args);
    } catch (error) {
      // Let Next.js internals (e.g. prerender bail-out from connection()) propagate.
      unstable_rethrow(error);
      const appError = toAppError(error);
      if (appError) return errorResponse(appError);
      console.error("[api] Unhandled error", error);
      return errorResponse(new AppError("INTERNAL_ERROR", "Something went wrong. Please try again."));
    }
  };
}
