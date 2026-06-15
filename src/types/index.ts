import type {
  Keyword,
  AiOverview,
  Citation,
  OrganicRanking,
  Job,
  JobStatus,
} from "@prisma/client";

// Re-export Prisma model types for convenient app-wide use.
export type {
  Keyword,
  AiOverview,
  Citation,
  OrganicRanking,
  Job,
  JobStatus,
};

// ---------------------------------------------------------------------------
// Service-layer DTOs (what the collectors return before persistence)
// ---------------------------------------------------------------------------

/** Normalized result of the SerpApi Google AI Overview fetch. */
export interface AiOverviewResult {
  present: boolean;
  overviewText: string | null;
  citations: AiCitationResult[];
}

export interface AiCitationResult {
  url: string;
  domain: string;
}

/** Normalized result of the DataForSEO organic SERP fetch. */
export interface OrganicResult {
  position: number;
  url: string;
  domain: string;
  title: string;
}

/** Outcome of a full collection run for a single keyword. */
export interface CollectionResult {
  keywordId: string;
  aiOverviewPresent: boolean;
  citationCount: number;
  organicCount: number;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalKeywords: number;
  totalAiOverviews: number;
  totalCitations: number;
  totalCitationDomains: number;
  recentKeywords: Array<
    Pick<Keyword, "id" | "keyword" | "location" | "createdAt">
  >;
  recentCollections: Array<{
    id: string;
    keywordId: string;
    keyword: string;
    status: JobStatus;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }>;
}

/** A row in the keyword-detail comparison table. */
export interface ComparisonRow {
  domain: string;
  organicRank: number | null;
  aiCitation: boolean;
}

export interface KeywordDetail {
  keyword: Keyword;
  aiOverview: AiOverview | null;
  citations: Citation[];
  organicRankings: OrganicRanking[];
  comparison: ComparisonRow[];
  latestJob: Job | null;
}
