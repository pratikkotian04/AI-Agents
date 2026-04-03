import type { Listing, SearchFilters } from "@/lib/types";

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const parsePriceLabel = (text: string) => {
  const match = text.match(
    /(₹|rs\.?|inr)\s?(\d{1,2}(?:,\d{2})*(?:,\d{3})+|\d{4,6})/i,
  );

  if (!match) {
    return null;
  }

  return `${match[1].toUpperCase()} ${match[2]}`;
};

export const scoreListing = (
  listing: Omit<Listing, "score" | "reasoning">,
  filters: SearchFilters,
) => {
  let score = 45;
  const haystack = `${listing.title} ${listing.snippet}`.toLowerCase();

  if (haystack.includes(filters.locality.toLowerCase())) {
    score += 24;
  }

  if (haystack.includes(filters.city.toLowerCase())) {
    score += 12;
  }

  if (haystack.includes(filters.housingType.toLowerCase())) {
    score += 18;
  }

  if (listing.priceLabel) {
    score += 10;
  }

  if (/owner|verified|semi-furnished|furnished|ready to move/i.test(haystack)) {
    score += 6;
  }

  const reasoningBits = [
    haystack.includes(filters.locality.toLowerCase())
      ? "matches locality"
      : "locality inferred from snippet",
    haystack.includes(filters.housingType.toLowerCase())
      ? "housing type mentioned"
      : "housing type approximated",
    listing.priceLabel ? "price clue found" : "price not explicitly visible",
  ];

  return {
    score,
    reasoning: reasoningBits.join(", "),
  };
};

export const dedupeListings = (listings: Listing[]) => {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    const key = listing.url;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
