import type { SearchFilters, SourceName } from "@/lib/types";

export type SourceConfig = {
  source: SourceName;
  domain: string;
  buildQuery: (filters: SearchFilters) => string;
};

const formatBudget = (budget: number) => `under Rs ${budget.toLocaleString("en-IN")}`;

export const SOURCE_CONFIGS: SourceConfig[] = [
  {
    source: "NoBroker",
    domain: "nobroker.in",
    buildQuery: ({ city, locality, budget, housingType }) =>
      `${housingType} rent ${locality} ${city} ${formatBudget(budget)} site:nobroker.in`,
  },
  {
    source: "99acres",
    domain: "99acres.com",
    buildQuery: ({ city, locality, budget, housingType }) =>
      `${housingType} for rent ${locality} ${city} ${formatBudget(budget)} site:99acres.com`,
  },
  {
    source: "Housing.com",
    domain: "housing.com",
    buildQuery: ({ city, locality, budget, housingType }) =>
      `${housingType} rent ${locality} ${city} ${formatBudget(budget)} site:housing.com`,
  },
  {
    source: "MagicBricks",
    domain: "magicbricks.com",
    buildQuery: ({ city, locality, budget, housingType }) =>
      `${housingType} rent ${locality} ${city} ${formatBudget(budget)} site:magicbricks.com`,
  },
];

export const buildGoogleSearchUrl = (query: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`;
