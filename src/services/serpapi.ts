import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { extractDomain } from "@/lib/utils";
import type { AiOverviewResult, AiCitationResult } from "@/types";

const SERPAPI_BASE = "https://serpapi.com/search.json";

/**
 * SerpApi can return an AI Overview inline with the main search response, OR
 * it can return a `page_token` that must be redeemed against the dedicated
 * Google AI Overview engine. We handle both shapes.
 *
 * Docs: https://serpapi.com/google-ai-overview-api
 */

interface SerpApiReference {
  link?: string;
  source?: string;
  title?: string;
}

interface SerpApiTextBlock {
  type?: string;
  snippet?: string;
  list?: Array<{ snippet?: string }>;
}

interface SerpApiAiOverview {
  text_blocks?: SerpApiTextBlock[];
  references?: SerpApiReference[];
  page_token?: string;
  error?: string;
}

interface SerpApiResponse {
  ai_overview?: SerpApiAiOverview;
  error?: string;
}

function buildSearchUrl(
  keyword: string,
  country: string,
  language: string
): string {
  const params = new URLSearchParams({
    engine: "google",
    q: keyword,
    gl: country,
    hl: language,
    api_key: env.SERPAPI_API_KEY,
  });
  return `${SERPAPI_BASE}?${params.toString()}`;
}

function buildAiOverviewUrl(pageToken: string): string {
  const params = new URLSearchParams({
    engine: "google_ai_overview",
    page_token: pageToken,
    api_key: env.SERPAPI_API_KEY,
  });
  return `${SERPAPI_BASE}?${params.toString()}`;
}

/** Flattens SerpApi text_blocks into a single readable string. */
function flattenText(blocks: SerpApiTextBlock[] | undefined): string {
  if (!blocks?.length) return "";
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.snippet) parts.push(block.snippet);
    if (block.list?.length) {
      for (const item of block.list) {
        if (item.snippet) parts.push(`• ${item.snippet}`);
      }
    }
  }
  return parts.join("\n").trim();
}

function mapCitations(
  references: SerpApiReference[] | undefined
): AiCitationResult[] {
  if (!references?.length) return [];
  const seen = new Set<string>();
  const citations: AiCitationResult[] = [];
  for (const ref of references) {
    const url = ref.link?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    citations.push({
      url,
      domain: extractDomain(ref.source || url),
    });
  }
  return citations;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    // SerpApi results are time-sensitive; never cache.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `SerpApi request failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`
    );
  }
  return (await res.json()) as T;
}

/**
 * Fetches the Google AI Overview for a keyword and returns normalized data:
 * whether an overview is present, its text, and its citation URLs/domains.
 */
export async function fetchAiOverview(
  keyword: string,
  country = "in",
  language = "en"
): Promise<AiOverviewResult> {
  logger.info("SerpApi: fetching AI overview", { keyword, country, language });

  const initial = await fetchJson<SerpApiResponse>(
    buildSearchUrl(keyword, country, language)
  );

  if (initial.error) {
    throw new Error(`SerpApi error: ${initial.error}`);
  }

  let overview = initial.ai_overview;

  // No AI overview block at all -> not present.
  if (!overview) {
    logger.info("SerpApi: no AI overview present", { keyword });
    return { present: false, overviewText: null, citations: [] };
  }

  // Some responses only carry a page_token that must be redeemed.
  if (overview.page_token && !overview.text_blocks?.length) {
    logger.debug("SerpApi: redeeming AI overview page_token", { keyword });
    const expanded = await fetchJson<SerpApiResponse>(
      buildAiOverviewUrl(overview.page_token)
    );
    if (expanded.error || expanded.ai_overview?.error) {
      throw new Error(
        `SerpApi AI overview error: ${expanded.error ?? expanded.ai_overview?.error}`
      );
    }
    overview = expanded.ai_overview ?? overview;
  }

  const overviewText = flattenText(overview.text_blocks);
  const citations = mapCitations(overview.references);

  logger.info("SerpApi: AI overview fetched", {
    keyword,
    citationCount: citations.length,
    hasText: overviewText.length > 0,
  });

  return {
    present: true,
    overviewText: overviewText || null,
    citations,
  };
}
