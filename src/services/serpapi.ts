import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { extractDomain } from "@/lib/utils";
import type {
  AiOverviewResult,
  AiCitationResult,
  OrganicResult,
} from "@/types";

const SERPAPI_BASE = "https://serpapi.com/search.json";

// Number of organic results to request/keep.
const TOP_N = 20;

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

interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  source?: string;
  displayed_link?: string;
}

interface SerpApiResponse {
  ai_overview?: SerpApiAiOverview;
  organic_results?: SerpApiOrganicResult[];
  error?: string;
}

// Results are fetched in English by default; "location" is the single market
// input (SerpApi canonical location name, e.g. "India").
const DEFAULT_HL = "en";

function buildSearchUrl(keyword: string, location: string): string {
  const params = new URLSearchParams({
    engine: "google",
    q: keyword,
    location,
    hl: DEFAULT_HL,
    num: String(TOP_N),
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
    // Derive the domain from the actual link; `source` is a publisher
    // display name (e.g. "Team-BHP"), not a hostname.
    const domain = extractDomain(url) || extractDomain(ref.source || "");
    citations.push({ url, domain });
  }
  return citations;
}

/** Normalizes SerpApi organic_results into our OrganicResult shape. */
function mapOrganic(
  results: SerpApiOrganicResult[] | undefined
): OrganicResult[] {
  if (!results?.length) return [];
  const organic: OrganicResult[] = [];
  for (const item of results) {
    if (!item.link || !item.position) continue;
    organic.push({
      position: item.position,
      url: item.link,
      domain: extractDomain(item.link) || extractDomain(item.source || ""),
      title: item.title?.trim() || "(no title)",
    });
    if (organic.length >= TOP_N) break;
  }
  organic.sort((a, b) => a.position - b.position);
  return organic;
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

/** Parses the ai_overview block (redeeming a page_token when required). */
async function parseAiOverview(
  initial: SerpApiResponse,
  keyword: string
): Promise<AiOverviewResult> {
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

  return {
    present: true,
    overviewText: overviewText || null,
    citations,
  };
}

/**
 * Fetches a Google SERP via SerpApi ONCE and returns both the normalized AI
 * Overview (present/text/citations) and the organic rankings. Using a single
 * call keeps SerpApi credit usage low.
 */
export async function fetchSerp(
  keyword: string,
  location = "India"
): Promise<{ aiOverview: AiOverviewResult; organic: OrganicResult[] }> {
  logger.info("SerpApi: fetching SERP", { keyword, location });

  const initial = await fetchJson<SerpApiResponse>(
    buildSearchUrl(keyword, location)
  );

  if (initial.error) {
    throw new Error(`SerpApi error: ${initial.error}`);
  }

  const aiOverview = await parseAiOverview(initial, keyword);
  const organic = mapOrganic(initial.organic_results);

  logger.info("SerpApi: SERP fetched", {
    keyword,
    aiOverviewPresent: aiOverview.present,
    citationCount: aiOverview.citations.length,
    organicCount: organic.length,
  });

  return { aiOverview, organic };
}

/**
 * Convenience wrapper that returns only the AI Overview portion of a SERP.
 */
export async function fetchAiOverview(
  keyword: string,
  location = "India"
): Promise<AiOverviewResult> {
  const { aiOverview } = await fetchSerp(keyword, location);
  return aiOverview;
}
