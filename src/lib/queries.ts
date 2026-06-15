import { prisma } from "@/lib/prisma";
import type {
  KeywordDetail,
  ComparisonRow,
  DashboardStats,
} from "@/types";

/**
 * Builds the full detail view for one keyword: latest AI overview, its
 * citations, organic rankings, and a domain-by-domain comparison table.
 * Returns null when the keyword does not exist.
 */
export async function getKeywordDetail(
  id: string
): Promise<KeywordDetail | null> {
  const keyword = await prisma.keyword.findUnique({
    where: { id },
    include: {
      aiOverviews: { orderBy: { createdAt: "desc" }, take: 1 },
      citations: { orderBy: { citationDomain: "asc" } },
      organicRankings: { orderBy: { position: "asc" } },
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!keyword) return null;

  const aiOverview = keyword.aiOverviews[0] ?? null;
  const citations = keyword.citations;
  const organicRankings = keyword.organicRankings;
  const latestJob = keyword.jobs[0] ?? null;

  // Build the comparison table keyed by domain.
  const citedDomains = new Set(citations.map((c) => c.citationDomain));
  const rankByDomain = new Map<string, number>();
  for (const r of organicRankings) {
    // Keep the best (lowest) organic position per domain.
    const existing = rankByDomain.get(r.domain);
    if (existing === undefined || r.position < existing) {
      rankByDomain.set(r.domain, r.position);
    }
  }

  const allDomains = new Set<string>([
    ...rankByDomain.keys(),
    ...citedDomains,
  ]);

  const comparison: ComparisonRow[] = Array.from(allDomains).map((domain) => ({
    domain,
    organicRank: rankByDomain.get(domain) ?? null,
    aiCitation: citedDomains.has(domain),
  }));

  // Sort: organic-ranked domains first (by rank), then citation-only domains.
  comparison.sort((a, b) => {
    if (a.organicRank === null && b.organicRank === null) {
      return a.domain.localeCompare(b.domain);
    }
    if (a.organicRank === null) return 1;
    if (b.organicRank === null) return -1;
    return a.organicRank - b.organicRank;
  });

  return {
    keyword,
    aiOverview,
    citations,
    organicRankings,
    comparison,
    latestJob,
  };
}

/** Aggregates the headline numbers and recent activity for the dashboard. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    totalKeywords,
    totalAiOverviews,
    totalCitations,
    citationDomains,
    recentKeywords,
    recentJobs,
  ] = await Promise.all([
    prisma.keyword.count(),
    prisma.aiOverview.count({ where: { aiOverviewPresent: true } }),
    prisma.citation.count(),
    prisma.citation.findMany({
      distinct: ["citationDomain"],
      select: { citationDomain: true },
    }),
    prisma.keyword.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        keyword: true,
        country: true,
        language: true,
        createdAt: true,
      },
    }),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { keyword: { select: { keyword: true } } },
    }),
  ]);

  return {
    totalKeywords,
    totalAiOverviews,
    totalCitations,
    totalCitationDomains: citationDomains.length,
    recentKeywords,
    recentCollections: recentJobs.map((j) => ({
      id: j.id,
      keywordId: j.keywordId,
      keyword: j.keyword.keyword,
      status: j.status,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
    })),
  };
}
