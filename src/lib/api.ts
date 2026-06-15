import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

/** Standard success envelope. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/** Standard error envelope. */
export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, details: details ?? null },
    { status }
  );
}

/**
 * Converts any thrown error into a consistent JSON response.
 * Use inside route handlers' catch blocks.
 */
export function handleError(error: unknown, context: string) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten());
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation.
    if (error.code === "P2002") {
      return fail("This keyword already exists for that location.", 409);
    }
    // Record not found.
    if (error.code === "P2025") {
      return fail("Resource not found.", 404);
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error(`API error: ${context}`, { message });
  return fail("Internal server error", 500);
}
