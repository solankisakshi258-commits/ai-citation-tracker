import { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/lib/api";
import { collectAllKeywords } from "@/services/collector";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
// Batch collection across many keywords can take a while.
export const maxDuration = 300;

/**
 * GET /api/cron — daily collection for every keyword.
 *
 * Scheduled by Vercel Cron (see vercel.json) at 03:30 UTC = 09:00 IST.
 * Vercel automatically sends `Authorization: Bearer $CRON_SECRET`.
 * The endpoint can also be triggered manually with the same header.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return fail("Unauthorized", 401);
      }
    }

    logger.info("Cron: daily collection triggered");
    const summary = await collectAllKeywords();
    return ok({ ranAt: new Date().toISOString(), ...summary });
  } catch (error) {
    return handleError(error, "GET /api/cron");
  }
}
