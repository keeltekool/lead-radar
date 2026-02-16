"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import SearchFilters from "@/components/search-filters";
import type { SearchParams } from "@/components/search-filters";
import LeadCard from "@/components/lead-card";
import { calculateLeadScore } from "@/lib/scoring";
import type { PlaceResult, LeadScoreBreakdown } from "@/types/lead";

type EnrichmentData = {
  pageSpeed?: { performance: number; seo: number; accessibility: number; bestPractices: number } | null;
  emails?: string[];
};
type ScoredPlace = { place: PlaceResult; score: LeadScoreBreakdown };

const STORAGE_KEY = "lr-search-state";

interface PersistedState {
  results: ScoredPlace[];
  sortBy: string;
  industry: string;
  city: string;
  freeText: string;
}

function loadState(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: PersistedState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable
  }
}

export default function SearchPage() {
  const t = useTranslations("lead");
  const tSort = useTranslations("sort");
  const tFilters = useTranslations("filters");
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const cached = useRef(loadState());

  const [results, setResults] = useState<ScoredPlace[]>(cached.current?.results ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!cached.current?.results.length);
  const [sortBy, setSortBy] = useState(cached.current?.sortBy ?? "scoreDesc");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const lastSearchParams = useRef<{ query: string; location: string } | null>(null);
  const [enrichmentData, setEnrichmentData] = useState<Record<string, EnrichmentData>>({});
  const [enriching, setEnriching] = useState(false);
  const [crossSearchLabel, setCrossSearchLabel] = useState<string | null>(null);

  const [filterIndustry, setFilterIndustry] = useState(cached.current?.industry ?? "");
  const [filterCity, setFilterCity] = useState(cached.current?.city ?? "");
  const [filterFreeText, setFilterFreeText] = useState(cached.current?.freeText ?? "");

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        if (data.leads) {
          setSavedIds(new Set(data.leads.map((l: { placeId: string }) => l.placeId)));
        }
      })
      .catch(() => {});
  }, [isSignedIn]);

  useEffect(() => {
    if (results.length > 0) {
      saveState({
        results,
        sortBy,
        industry: filterIndustry,
        city: filterCity,
        freeText: filterFreeText,
      });
    }
  }, [results, sortBy, filterIndustry, filterCity, filterFreeText]);

  const handleSearch = useCallback(async (filters: SearchParams) => {
    setIsLoading(true);
    setHasSearched(true);
    setNextPageToken(null);
    setCrossSearchLabel(null);

    try {
      // Cross-search mode: all industries in one city, or one industry across all cities
      if (filters.crossMode) {
        const params = new URLSearchParams();
        params.set("mode", filters.crossMode);

        if (filters.crossMode === "all-industries" && filters.cityName) {
          params.set("city", filters.cityName);
          setCrossSearchLabel(tFilters("crossAllIndustries", { city: filters.cityName }));
        } else if (filters.crossMode === "all-locations" && filters.industryId) {
          params.set("industry", filters.industryId);
          setCrossSearchLabel(tFilters("crossAllLocations"));
        }

        const res = await fetch(`/api/search/cross?${params.toString()}`);
        const data = await res.json();

        if (data.error) {
          console.error("Cross-search error:", data.error);
          setResults([]);
          return;
        }

        const places: PlaceResult[] = data.places || [];
        const scored = places.map((place) => ({
          place,
          score: calculateLeadScore(place),
        }));
        scored.sort((a, b) => b.score.total - a.score.total);
        setResults(scored);
        lastSearchParams.current = null; // no pagination for cross-search
        return;
      }

      // Normal single search
      lastSearchParams.current = { query: filters.query, location: filters.location };
      const params = new URLSearchParams();
      if (filters.query) params.set("q", filters.query);
      if (filters.location) params.set("location", filters.location);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        console.error("Search error:", data.error);
        setResults([]);
        return;
      }

      const places: PlaceResult[] = data.places || [];
      const scored = places.map((place) => ({
        place,
        score: calculateLeadScore(place),
      }));

      scored.sort((a, b) => b.score.total - a.score.total);
      setResults(scored);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [tFilters]);

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken || !lastSearchParams.current) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (lastSearchParams.current.query) params.set("q", lastSearchParams.current.query);
      if (lastSearchParams.current.location) params.set("location", lastSearchParams.current.location);
      params.set("pageToken", nextPageToken);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        console.error("Load more error:", data.error);
        return;
      }

      const places: PlaceResult[] = data.places || [];
      const scored = places.map((place) => ({
        place,
        score: calculateLeadScore(place),
      }));

      setResults((prev) => [...prev, ...scored]);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error("Load more failed:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageToken]);

  const handleEnrichAll = useCallback(async () => {
    const unenriched = results
      .filter(({ place }) => place.websiteUri && !enrichmentData[place.id])
      .map(({ place }) => ({ placeId: place.id, websiteUri: place.websiteUri! }));
    if (unenriched.length === 0) return;
    setEnriching(true);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places: unenriched }),
      });
      const data = await res.json();
      if (data.enriched) {
        setEnrichmentData((prev) => {
          const next = { ...prev };
          for (const item of data.enriched) {
            next[item.placeId] = { pageSpeed: item.pageSpeed, emails: item.emails };
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Enrich failed:", err);
    } finally {
      setEnriching(false);
    }
  }, [results, enrichmentData]);

  const handleToggleSave = useCallback(async (place: PlaceResult) => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setSavingId(place.id);
    const isSaved = savedIds.has(place.id);

    try {
      if (isSaved) {
        await fetch("/api/leads", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId: place.id }),
        });
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(place.id);
          return next;
        });
      } else {
        const score = calculateLeadScore(place);
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place, leadScore: score.total }),
        });
        setSavedIds((prev) => new Set(prev).add(place.id));
      }
    } catch (err) {
      console.error("Save/unsave failed:", err);
    } finally {
      setSavingId(null);
    }
  }, [isSignedIn, savedIds, router]);

  const handleViewDetails = useCallback((place: PlaceResult) => {
    router.push(`/lead/${place.id}`);
  }, [router]);

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "scoreDesc": return b.score.total - a.score.total;
      case "ratingAsc": return (a.place.rating ?? 5) - (b.place.rating ?? 5);
      case "reviewsAsc": return (a.place.userRatingCount ?? 0) - (b.place.userRatingCount ?? 0);
      case "reviewsDesc": return (b.place.userRatingCount ?? 0) - (a.place.userRatingCount ?? 0);
      default: return 0;
    }
  });

  return (
    <div className="space-y-6">
      <SearchFilters
        onSearch={handleSearch}
        isLoading={isLoading}
        initialIndustry={filterIndustry}
        initialCity={filterCity}
        initialFreeText={filterFreeText}
        onFilterChange={(industry, city, freeText) => {
          setFilterIndustry(industry);
          setFilterCity(city);
          setFilterFreeText(freeText);
        }}
      />

      {/* Cross-search banner */}
      {crossSearchLabel && !isLoading && results.length > 0 && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-800">
          <span className="font-semibold">{crossSearchLabel}</span>
          <span className="text-teal-600 ml-1">— {results.length} {tFilters("crossResults")}</span>
        </div>
      )}

      {/* Results header */}
      {hasSearched && !isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {results.length > 0 ? `${results.length} tulemust` : ""}
          </p>
          {results.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleEnrichAll}
                disabled={enriching || results.every(({ place }) => !place.websiteUri || enrichmentData[place.id])}
                className="text-sm rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 font-medium text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
              >
                {enriching ? (
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                    Enriching...
                  </span>
                ) : (
                  "Enrich All"
                )}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:border-teal-500 focus:outline-none"
              >
                <option value="scoreDesc">{tSort("scoreDesc")}</option>
                <option value="ratingAsc">{tSort("ratingAsc")}</option>
                <option value="reviewsAsc">{tSort("reviewsAsc")}</option>
                <option value="reviewsDesc">{tSort("reviewsDesc")}</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          {crossSearchLabel && (
            <p className="text-sm text-slate-500">{tFilters("crossSearching")}</p>
          )}
        </div>
      )}

      {/* Results grid */}
      {!isLoading && sortedResults.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedResults.map(({ place, score }) => (
            <LeadCard
              key={place.id}
              place={place}
              score={score}
              isSaved={savedIds.has(place.id)}
              onToggleSave={handleToggleSave}
              onViewDetails={handleViewDetails}
              savingId={savingId}
              enrichment={enrichmentData[place.id]}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {!isLoading && nextPageToken && results.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-button bg-teal-950 text-white px-8 py-2.5 text-sm font-semibold hover:bg-teal-900 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Loading...
              </span>
            ) : (
              `Load more results`
            )}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="text-teal-300 mb-4">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-slate-800 mb-2">{t("noResults")}</p>
          <p className="text-sm text-slate-500 text-center max-w-md">{t("noResultsHint")}</p>
        </div>
      )}
    </div>
  );
}
