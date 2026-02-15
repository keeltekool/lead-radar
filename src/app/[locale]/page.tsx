"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import SearchFilters from "@/components/search-filters";
import LeadCard from "@/components/lead-card";
import { calculateLeadScore } from "@/lib/scoring";
import type { PlaceResult, LeadScoreBreakdown } from "@/types/lead";

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
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const cached = useRef(loadState());

  const [results, setResults] = useState<ScoredPlace[]>(cached.current?.results ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!cached.current?.results.length);
  const [sortBy, setSortBy] = useState(cached.current?.sortBy ?? "scoreDesc");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

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

      scored.sort((a, b) => b.score.total - a.score.total);
      setResults(scored);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      {/* Results header */}
      {hasSearched && !isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {results.length > 0 ? `${results.length} tulemust` : ""}
          </p>
          {results.length > 0 && (
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
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
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
            />
          ))}
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
