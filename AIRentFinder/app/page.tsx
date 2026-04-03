"use client";

import { startTransition, useState } from "react";

import { HOUSING_TYPES, INDIAN_CITIES } from "@/lib/constants";
import type { SearchResponse } from "@/lib/types";

type FormState = {
  city: (typeof INDIAN_CITIES)[number];
  locality: string;
  budget: string;
  housingType: (typeof HOUSING_TYPES)[number];
};

const initialState: FormState = {
  city: "Bengaluru",
  locality: "Whitefield",
  budget: "30000",
  housingType: "Flat",
};

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          budget: Number(form.budget),
        }),
      });

      const payload = (await response.json()) as SearchResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Search failed.");
      }

      startTransition(() => {
        setData(payload);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to fetch rental results.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Multi-agent rental search</span>
        <h1>Find your next rented apartment within budget.</h1>
        <p>
          Search across NoBroker, 99acres, Housing.com, and MagicBricks with one
          query. Each source runs as an agent, then a ranking layer merges the
          strongest leads for your chosen city, locality, budget, and housing type.
        </p>
      </section>

      <section className="search-grid">
        <div className="panel search-panel">
          <form onSubmit={onSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="city">City</label>
                <select
                  id="city"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value as FormState["city"] }))
                  }
                >
                  {INDIAN_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="locality">Locality</label>
                <input
                  id="locality"
                  placeholder="Whitefield"
                  value={form.locality}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, locality: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="budget">Budget (INR / month)</label>
                <input
                  id="budget"
                  type="number"
                  min="1000"
                  step="500"
                  placeholder="30000"
                  value={form.budget}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, budget: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="housingType">Type of Housing</label>
                <select
                  id="housingType"
                  value={form.housingType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      housingType: event.target.value as FormState["housingType"],
                    }))
                  }
                >
                  {HOUSING_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="submit-row">
              <button type="submit" disabled={loading}>
                {loading ? "Searching listings..." : "Find Rentals"}
              </button>
              <span className="note">
                Works best when SerpApi and one LLM provider are configured.
              </span>
            </div>
          </form>
        </div>

        <aside className="panel intel-panel">
          <div className="intel-header">
            <div>
              <h2>Agent workflow</h2>
              <p className="summary">
                Four source agents search in parallel, then a ranking agent combines the best matches.
              </p>
            </div>
            <span className="chip">{data?.usedLlm ? "LLM ranking on" : "Heuristic ranking"}</span>
          </div>

          <div className="agent-list">
            <div className="agent-card">
              <strong>Agent 1: NoBroker scout</strong>
              <div className="agent-status">Searches NoBroker pages indexed for your location and budget.</div>
            </div>
            <div className="agent-card">
              <strong>Agent 2: 99acres scout</strong>
              <div className="agent-status">Looks for indexed rent listings and locality matches from 99acres.</div>
            </div>
            <div className="agent-card">
              <strong>Agent 3: Housing.com scout</strong>
              <div className="agent-status">Collects relevant Housing.com leads for the requested housing type.</div>
            </div>
            <div className="agent-card">
              <strong>Agent 4: MagicBricks scout</strong>
              <div className="agent-status">Brings in MagicBricks leads and visible pricing clues.</div>
            </div>
            <div className="agent-card">
              <strong>Final ranker</strong>
              <div className="agent-status">Sorts and explains results using an optional LLM layer or fallback scoring.</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="results">
        <div className="results-toolbar">
          <div>
            <h2>Ranked results</h2>
            <p className="summary">
              {data?.summary ??
                "Run a search to see ranked apartment, PG, or hostel leads from all configured property sources."}
            </p>
          </div>
          {data ? <span className="chip">{data.results.length} leads</span> : null}
        </div>

        {data?.results.length ? (
          <div className="results-list">
            {data.results.map((listing) => (
              <article key={listing.id} className="listing-card">
                <strong>{listing.title}</strong>
                <div className="listing-meta">
                  <span>{listing.source}</span>
                  <span>Score {Math.round(listing.score)}</span>
                  {listing.priceLabel ? <span>{listing.priceLabel}</span> : null}
                  {listing.locality ? <span>{listing.locality}</span> : null}
                </div>
                <p>{listing.snippet}</p>
                <p>
                  Why it ranked: {listing.reasoning}.
                </p>
                <a href={listing.url} target="_blank" rel="noreferrer">
                  Open listing
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            Ranked results will appear here after you search.
          </div>
        )}

        <div>
          <h2>Source run details</h2>
          <div className="source-list">
            {data?.sourceRuns?.length ? (
              data.sourceRuns.map((run) => (
                <article key={run.source} className="source-card">
                  <strong>{run.source}</strong>
                  <div className="source-meta">
                    <span>Status: {run.status}</span>
                    <span>{run.results.length} results</span>
                  </div>
                  <p>{run.message}</p>
                  <p>
                    Query: <code>{run.query}</code>
                  </p>
                  {run.searchUrl ? (
                    <a href={run.searchUrl} target="_blank" rel="noreferrer">
                      Open search query
                    </a>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="empty-state">
                Source-level agent diagnostics will show here after the first search.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
