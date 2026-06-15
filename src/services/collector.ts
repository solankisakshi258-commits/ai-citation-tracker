import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { fetchAiOverview } from "@/services/serpapi";
import { fetchOrganicResults } from "@/services/dataforseo";
import type { CollectionResult } from "@/types";

/**
 * Runs a full data-collection cycle for a single keyword:
 *   1. SerpApi  -> Google AI Overview + citations
 *   2. DataForSEO -> top-20 organic rankings
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
    // Fetch both sources in parallel — they are independent.
    const [aiOverview, organic] = await Promise.all([
      fetchAiOverview(keyword.keyword, keyword.country, keyword.language),
      fetchOrganicResults(keyword.keyword, keyword.country, keyword.language),
    ]);

    // Persist atomically: clear the previous snapshot, write the new one.
    await prisma.$transaction([
      prisma.aiOverview.deleteMany({ where: { keywordId } }),
      prisma.citation.deleteMany({ where: { keywordId } }),
      prisma.organicRanking.deleteMany({ where: { keywordId } }),

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
      }),

      prisma.organicRanking.createMany({
        data: organic.map((o) => ({
          keywordId,
          position: o.position,
          url: o.url,
          domain: o.domain,
          title: o.title,
        })),
      }),
    ]);

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    logger.info("Collector: completed", {
      keywordId,
      jobId: job.id,
      aiOverviewPresent: aiOverview.present,
      citationCount: aiOverview.citations.length,
      organicCount: organic.length,
    });

    return {
      keywordId,
      aiOverviewPresent: aiOverview.present,
      citationCount: aiOverview.citations.length,
      organicCount: organic.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Collector: failed", { keywordId, jobId: job.id, message });

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
