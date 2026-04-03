import type { Listing, SearchFilters } from "@/lib/types";

type RankingOutcome = {
  summary: string;
  rankedResults: Listing[];
  usedLlm: boolean;
};

type Provider = "openrouter" | "groq" | "mistral" | "gemini";

const provider = (process.env.LLM_PROVIDER ?? "openrouter") as Provider;

const normalizeEnvValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getDefaultOpenAiCompatibleBaseUrl = () =>
  provider === "groq"
    ? "https://api.groq.com/openai/v1"
    : provider === "mistral"
      ? "https://api.mistral.ai/v1"
      : "https://openrouter.ai/api/v1";

const getHeuristicSummary = (filters: SearchFilters, results: Listing[]) => {
  if (!results.length) {
    return `No strong matches were found for ${filters.housingType.toLowerCase()} rentals in ${filters.locality}, ${filters.city} within Rs ${filters.budget.toLocaleString("en-IN")}. Try broadening the locality or increasing the budget.`;
  }

  const best = results[0];
  return `Found ${results.length} ranked leads for ${filters.housingType.toLowerCase()} rentals in ${filters.locality}, ${filters.city}. The strongest lead right now is from ${best.source}${best.priceLabel ? ` around ${best.priceLabel}` : ""}, and the shortlist is ordered by locality match, housing type relevance, and visible pricing clues.`;
};

const parseJsonResponse = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]) as {
      summary?: string;
      recommendations?: Array<{ id?: string; reasoning?: string; score?: number }>;
    };
  } catch {
    return null;
  }
};

const rankWithOpenAiCompatible = async (
  filters: SearchFilters,
  results: Listing[],
): Promise<RankingOutcome | null> => {
  const apiKey = normalizeEnvValue(process.env.LLM_API_KEY);
  const model = normalizeEnvValue(process.env.LLM_MODEL);

  if (!apiKey || !model) {
    return null;
  }

  const configuredBaseUrl = normalizeEnvValue(process.env.LLM_BASE_URL);
  const baseUrl = stripTrailingSlash(
    configuredBaseUrl ?? getDefaultOpenAiCompatibleBaseUrl(),
  );

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You rank Indian rental leads. Return strict JSON with summary and recommendations. Keep recommendations tied to provided listing ids only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            filters,
            results: results.map((result) => ({
              id: result.id,
              source: result.source,
              title: result.title,
              snippet: result.snippet,
              priceLabel: result.priceLabel,
              locality: result.locality,
              score: result.score,
            })),
          }),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonResponse(text);
  if (!parsed) {
    return null;
  }

  const recommendationMap = new Map(
    (parsed.recommendations ?? [])
      .filter((item) => item.id)
      .map((item) => [item.id!, item]),
  );

  const rankedResults = [...results]
    .map((result) => {
      const recommendation = recommendationMap.get(result.id);
      return recommendation
        ? {
            ...result,
            score: recommendation.score ?? result.score,
            reasoning: recommendation.reasoning ?? result.reasoning,
          }
        : result;
    })
    .sort((a, b) => b.score - a.score);

  return {
    summary: parsed.summary ?? getHeuristicSummary(filters, rankedResults),
    rankedResults,
    usedLlm: true,
  };
};

const rankWithGemini = async (
  filters: SearchFilters,
  results: Listing[],
): Promise<RankingOutcome | null> => {
  const apiKey = normalizeEnvValue(process.env.LLM_API_KEY);
  const model = normalizeEnvValue(process.env.LLM_MODEL);

  if (!apiKey || !model) {
    return null;
  }

  const configuredBaseUrl = normalizeEnvValue(process.env.LLM_BASE_URL);
  const endpoint =
    configuredBaseUrl ??
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Rank these Indian rental leads and return strict JSON with summary and recommendations.",
            },
            {
              text: JSON.stringify({ filters, results }),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") ??
    "";
  const parsed = parseJsonResponse(text);
  if (!parsed) {
    return null;
  }

  const recommendationMap = new Map(
    (parsed.recommendations ?? [])
      .filter((item) => item.id)
      .map((item) => [item.id!, item]),
  );

  const rankedResults = [...results]
    .map((result) => {
      const recommendation = recommendationMap.get(result.id);
      return recommendation
        ? {
            ...result,
            score: recommendation.score ?? result.score,
            reasoning: recommendation.reasoning ?? result.reasoning,
          }
        : result;
    })
    .sort((a, b) => b.score - a.score);

  return {
    summary: parsed.summary ?? getHeuristicSummary(filters, rankedResults),
    rankedResults,
    usedLlm: true,
  };
};

export const rankListings = async (
  filters: SearchFilters,
  results: Listing[],
): Promise<RankingOutcome> => {
  if (!results.length) {
    return {
      summary: getHeuristicSummary(filters, results),
      rankedResults: [],
      usedLlm: false,
    };
  }

  const llmResult =
    provider === "gemini"
      ? await rankWithGemini(filters, results)
      : await rankWithOpenAiCompatible(filters, results);

  if (llmResult) {
    return llmResult;
  }

  const rankedResults = [...results].sort((a, b) => b.score - a.score);
  return {
    summary: getHeuristicSummary(filters, rankedResults),
    rankedResults,
    usedLlm: false,
  };
};
