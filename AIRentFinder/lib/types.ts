export type HousingType = "Flat" | "PG" | "Hostel";

export type SearchFilters = {
  city: string;
  locality: string;
  budget: number;
  housingType: HousingType;
};

export type SourceName =
  | "NoBroker"
  | "99acres"
  | "Housing.com"
  | "MagicBricks"
  | "Google Search";

export type Listing = {
  id: string;
  source: SourceName;
  title: string;
  url: string;
  snippet: string;
  priceLabel: string | null;
  locality: string | null;
  score: number;
  reasoning: string;
};

export type SourceRun = {
  source: SourceName;
  status: "success" | "empty" | "error";
  query: string;
  searchUrl?: string;
  message: string;
  results: Listing[];
};

export type SearchResponse = {
  summary: string;
  results: Listing[];
  sourceRuns: SourceRun[];
  usedLlm: boolean;
};
