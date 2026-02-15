"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import SearchFilters from "@/components/search-filters";
import LeadCard from "@/components/lead-card";
import { calculateLeadScore } from "@/lib/scoring";
import type { PlaceResult, LeadScoreBreakdown } from "@/types/lead";

type ScoredPlace = { place: PlaceResult; score: LeadScoreBreakdown };

export default function SearchPage() {
  const t = useTranslations("lead");
  const tSort = useTranslations("sort");

  const [results, setResults] = useState<ScoredPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState("scoreDesc");

  const handleSearch = useCallback(async (filters: { query: string; location: string }) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
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

      // Default sort: score descending
      scored.sort((a, b) => b.score.total - a.score.total);
      setResults(scored);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      <SearchFilters onSearch={handleSearch} isLoading={isLoading} />

      {/* Results header */}
      {hasSearched && !isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {results.length > 0
              ? `${results.length} tulemust`
              : ""}
          </p>
          {results.length > 0 && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="scoreDesc">{tSort("scoreDesc")}</option>
              <option value="ratingAsc">{tSort("ratingAsc")}</option>
              <option value="reviewsAsc">{tSort("reviewsAsc")}</option>
              <option value="reviewsDesc">{tSort("reviewsDesc")}</option>
            </select>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
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
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && hasSearched && results.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">{t("noResults")}</p>
          <p className="text-slate-400 text-sm mt-1">{t("noResultsHint")}</p>
        </div>
      )}
    </div>
  );
}
