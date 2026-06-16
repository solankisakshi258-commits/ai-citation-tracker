import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { fetchSerp } from "@/services/serpapi";
import { fetchOrganicResults } from "@/services/dataforseo";
import type {
  CollectionResult,
  AiOverviewResult,
  OrganicResult,
} from "@/types";

/**
 * Runs a full data-collection cycle for a single keyword:
 *   1. SerpApi  -> Google AI Overview + citations (+ organic by default)
 *   2. Organic rankings -> SerpApi (default) or DataForSEO (ORGANIC_SOURCE)
 *   3. Persist everything in PostgreSQL (replacing the previous snapshot)
 *
 * A `Job` row tracks the lifecycle (PENDING -> RUNNING -> COMPLETED/FAILED)
 * so the dashboard can show recent collection runs and surface failures.
 *
 * Snapshot semantics: each run replaces the keyword's prior AI overview,
 * citations and organic rankings so the detail page always reflects the
 * latest collection. Run history is preserved in the `jobs` table.
 */
export async function collectKeyword(
  keywordId: string
): Promise<CollectionResult> {
  const keyword = await prisma.keyword.findUnique({
    where: { id: keywordId },
  });

  if (!keyword) {
    throw new Error(`Keyword not found: ${keywordId}`);
  }

  const job = await prisma.job.create({
    data: {
      keywordId,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  logger.info("Collector: started", {
    keywordId,
    keyword: keyword.keyword,
    jobId: job.id,
  });

  try {
    const organicSource = env.ORGANIC_SOURCE;

    // SerpApi returns the AI Overview and (by default) the organic rankings in
    // a single call. When ORGANIC_SOURCE=dataforseo, organic comes from
    // DataForSEO instead. Sources are fetched independently and we persist
    // whatever succeeds, so one failing source never discards the other.
    const [serpSettled, dfsSettled] = await Promise.allSettled([
      fetchSerp(keyword.keyword, keyword.location),
      organicSource === "dataforseo"
        ? fetchOrganicResults(keyword.keyword, keyword.location)
        : Promise.resolve(null),
    ]);

    const errors: string[] = [];

    let aiOverview: AiOverviewResult | null = null;
    let serpOrganic: OrganicResult[] | null = null;
    if (serpSettled.status === "fulfilled") {
      aiOverview = serpSettled.value.aiOverview;
      serpOrganic = serpSettled.value.organic;
    } else {
      errors.push(`SerpApi: ${errText(serpSettled.reason)}`);
    }

    let organic: OrganicResult[] | null = null;
    if (organicSource === "dataforseo") {
      if (dfsSettled.status === "fulfilled") {
        organic = dfsSettled.value as OrganicResult[];
      } else {
        errors.push(`Organic (DataForSEO): ${errText(dfsSettled.reason)}`);
      }
    } else {
      organic = serpOrganic;
    }

    // Both sources failed — nothing to save; record the failure.
    if (!aiOverview && !organic) {
      const message = errors.join(" | ");
      logger.error("Collector: failed", { keywordId, jobId: job.id, message });
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: message.slice(0, 1000),
        },
      });
      throw new Error(message);
    }

    // Persist atomically: clear the prior snapshot for whichever source(s)
    // we have fresh data for, then write the new rows.
    const ops = [];
    if (aiOverview) {
      ops.push(
        prisma.aiOverview.deleteMany({ where: { keywordId } }),
        prisma.citation.deleteMany({ where: { keywordId } }),
        prisma.aiOverview.create({
          data: {
            keywordId,
            aiOverviewPresent: aiOverview.present,
            overviewText: aiOverview.overviewText,
          },
        }),
        prisma.citation.createMany({
          data: aiOverview.citations.map((c) => ({
            keywordId,
            citationUrl: c.url,
            citationDomain: c.domain,
          })),
        })
      );
    }
    if (organic) {
      ops.push(
        prisma.organicRanking.deleteMany({ where: { keywordId } }),
        prisma.organicRanking.createMany({
          data: organic.map((o) => ({
            keywordId,
            position: o.position,
            url: o.url,
            domain: o.domain,
            title: o.title,
          })),
        })
      );
    }
    await prisma.$transaction(ops);

    // Completed (possibly partially). Record any source error for visibility.
    const partialError = errors.length ? errors.join(" | ").slice(0, 1000) : null;
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        error: partialError,
      },
    });

    logger.info("Collector: completed", {
      keywordId,
      jobId: job.id,
      partial: errors.length > 0,
      aiOverviewPresent: aiOverview?.present ?? false,
      citationCount: aiOverview?.citations.length ?? 0,
      organicCount: organic?.length ?? 0,
    });

    return {
      keywordId,
      aiOverviewPresent: aiOverview?.present ?? false,
      citationCount: aiOverview?.citations.length ?? 0,
      organicCount: organic?.length ?? 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Collector: unexpected failure", {
      keywordId,
      jobId: job.id,
      message,
    });

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: message.slice(0, 1000),
      },
    });

    throw error;
  }
}

/** Extracts a readable message from an unknown rejection reason. */
function errText(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * Collects every keyword sequentially. Used by the daily cron job.
 * Failures on one keyword do not abort the rest.
 */
export async function collectAllKeywords(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
}> {
  const keywords = await prisma.keyword.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  logger.info("Collector: batch run starting", { total: keywords.length });

  let succeeded = 0;
  let failed = 0;

  for (const { id } of keywords) {
    try {
      await collectKeyword(id);
      succeeded += 1;
    } catch {
      // Error already logged inside collectKeyword.
      failed += 1;
    }
  }

  logger.info("Collector: batch run finished", {
    total: keywords.length,
    succeeded,
    failed,
  });

  return { total: keywords.length, succeeded, failed };
}
