import { rankListings } from "@/lib/llm";
import { SOURCE_CONFIGS } from "@/lib/search/config";
import { runSourceAgent } from "@/lib/search/providers";
import { dedupeListings } from "@/lib/search/utils";
import type { SearchFilters, SearchResponse } from "@/lib/types";

export const runRentalSearch = async (
  filters: SearchFilters,
): Promise<SearchResponse> => {
  const sourceRuns = await Promise.all(
    SOURCE_CONFIGS.map((config) => runSourceAgent(config.source, filters)),
  );

  const mergedResults = dedupeListings(
    sourceRuns.flatMap((run) => run.results).sort((a, b) => b.score - a.score),
  );

  const ranking = await rankListings(filters, mergedResults);

  return {
    summary: ranking.summary,
    results: ranking.rankedResults,
    sourceRuns,
    usedLlm: ranking.usedLlm,
  };
};
