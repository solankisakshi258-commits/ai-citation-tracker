import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { extractDomain } from "@/lib/utils";
import type { OrganicResult } from "@/types";

// DataForSEO "live" advanced endpoint returns results synchronously.
// Docs: https://dataforseo.com/apis/serp-api
const DATAFORSEO_ENDPOINT =
  "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";

const TOP_N = 20;

// Results are fetched in English by default. The product treats "location"
// as the single market input (DataForSEO `location_name`).
const DEFAULT_LANGUAGE_CODE = "en";

interface DfsResultItem {
  type?: string;
  rank_absolute?: number;
  rank_group?: number;
  url?: string;
  domain?: string;
  title?: string;
}

interface DfsTaskResult {
  items?: DfsResultItem[];
}

interface DfsTask {
  status_code?: number;
  status_message?: string;
  result?: DfsTaskResult[] | null;
}

interface DfsResponse {
  status_code?: number;
  status_message?: string;
  tasks?: DfsTask[];
}

function authHeader(): string {
  const token = Buffer.from(
    `${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`
  ).toString("base64");
  return `Basic ${token}`;
}

/**
 * Fetches the top organic SERP results for a keyword from DataForSEO and
 * returns them normalized to position / url / domain / title.
 */
export async function fetchOrganicResults(
  keyword: string,
  location = "India"
): Promise<OrganicResult[]> {
  logger.info("DataForSEO: fetching organic SERP", { keyword, location });

  const payload = [
    {
      keyword,
      location_name: location,
      language_code: DEFAULT_LANGUAGE_CODE,
      depth: TOP_N,
      // We only need the organic block.
      group_organic_results: true,
    },
  ];

  const res = await fetch(DATAFORSEO_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `DataForSEO request failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`
    );
  }

  const data = (await res.json()) as DfsResponse;

  // 20000 = "Ok." at the top level.
  if (data.status_code && data.status_code !== 20000) {
    throw new Error(
      `DataForSEO error ${data.status_code}: ${data.status_message}`
    );
  }

  const task = data.tasks?.[0];
  if (task?.status_code && task.status_code !== 20000) {
    throw new Error(
      `DataForSEO task error ${task.status_code}: ${task.status_message}`
    );
  }

  const items = task?.result?.[0]?.items ?? [];

  const organic: OrganicResult[] = [];
  for (const item of items) {
    if (item.type !== "organic") continue;
    if (!item.url) continue;
    const position = item.rank_group ?? item.rank_absolute;
    if (!position) continue;

    organic.push({
      position,
      url: item.url,
      domain: item.domain
        ? item.domain.replace(/^www\./i, "").toLowerCase()
        : extractDomain(item.url),
      title: item.title?.trim() || "(no title)",
    });

    if (organic.length >= TOP_N) break;
  }

  // Stable sort by position for predictable display.
  organic.sort((a, b) => a.position - b.position);

  logger.info("DataForSEO: organic SERP fetched", {
    keyword,
    count: organic.length,
  });

  return organic;
}
