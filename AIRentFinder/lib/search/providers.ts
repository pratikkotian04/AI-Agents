import { buildGoogleSearchUrl, SOURCE_CONFIGS } from "@/lib/search/config";
import { parsePriceLabel, scoreListing, slugify } from "@/lib/search/utils";
import type { Listing, SearchFilters, SourceRun, SourceName } from "@/lib/types";

type SerpApiOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

type SerpApiResponse = {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
};

const SERP_API_ENDPOINT =
  process.env.SERP_API_URL ?? "https://serpapi.com/search.json";

const serpApiEnabled = () => Boolean(process.env.SERP_API_KEY);

const buildListing = (
  source: SourceName,
  item: SerpApiOrganicResult,
  filters: SearchFilters,
): Listing | null => {
  if (!item.link || !item.title) {
    return null;
  }

  const snippet = item.snippet?.trim() || "Snippet unavailable.";
  const priceLabel = parsePriceLabel(`${item.title} ${snippet}`);
  const locality =
    snippet
      .split(/[,.|-]/)
      .map((part) => part.trim())
      .find((part) =>
        part.toLowerCase().includes(filters.locality.toLowerCase()),
      ) ?? null;

  const base = {
    id: `${slugify(source)}-${slugify(item.link)}`,
    source,
    title: item.title.trim(),
    url: item.link,
    snippet,
    priceLabel,
    locality,
  };

  return {
    ...base,
    ...scoreListing(base, filters),
  };
};

const querySerpApi = async (
  query: string,
  source: SourceName,
  filters: SearchFilters,
): Promise<SourceRun> => {
  const searchUrl = buildGoogleSearchUrl(query);

  if (!serpApiEnabled()) {
    return {
      source,
      status: "error",
      query,
      searchUrl,
      message: "SerpApi is not configured. Add SERP_API_KEY.",
      results: [],
    };
  }

  const url = new URL(SERP_API_ENDPOINT);
  url.searchParams.set("api_key", process.env.SERP_API_KEY!);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("gl", "in");
  url.searchParams.set("google_domain", "google.co.in");
  url.searchParams.set("hl", "en");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    return {
      source,
      status: "error",
      query,
      searchUrl,
      message: `SerpApi search failed with ${response.status}: ${message.slice(0, 160)}`,
      results: [],
    };
  }

  const payload = (await response.json()) as SerpApiResponse;
  if (payload.error) {
    return {
      source,
      status: "error",
      query,
      searchUrl,
      message: payload.error,
      results: [],
    };
  }

  const results =
    payload.organic_results
      ?.map((item) => buildListing(source, item, filters))
      .filter((item): item is Listing => Boolean(item))
      .slice(0, 5) ?? [];

  return {
    source,
    status: results.length ? "success" : "empty",
    query,
    searchUrl,
    message: results.length
      ? `Found ${results.length} candidate listings through SerpApi.`
      : "No indexed listings found for this source via SerpApi.",
    results,
  };
};

export const runSourceAgent = async (
  source: SourceName,
  filters: SearchFilters,
): Promise<SourceRun> => {
  const sourceConfig = SOURCE_CONFIGS.find((config) => config.source === source);

  if (!sourceConfig) {
    throw new Error(`Unknown source: ${source}`);
  }

  const query = sourceConfig.buildQuery(filters);
  return querySerpApi(query, source, filters);
};
