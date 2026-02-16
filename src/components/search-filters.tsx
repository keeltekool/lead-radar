"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { INDUSTRIES, ESTONIAN_CITIES } from "@/data/industries";

export interface SearchParams {
  query: string;
  location: string;
  crossMode?: "all-industries" | "all-locations" | null;
  industryId?: string;
  cityName?: string;
}

interface SearchFiltersProps {
  onSearch: (filters: SearchParams) => void;
  isLoading: boolean;
  initialIndustry?: string;
  initialCity?: string;
  initialFreeText?: string;
  onFilterChange?: (industry: string, city: string, freeText: string) => void;
}

const selectClasses =
  "flex h-10 w-full rounded-lg border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100";

const inputClasses =
  "flex h-10 w-full rounded-lg border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:cursor-not-allowed disabled:opacity-50";

const labelClasses = "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";

export default function SearchFilters({ onSearch, isLoading, initialIndustry = "", initialCity = "", initialFreeText = "", onFilterChange }: SearchFiltersProps) {
  const t = useTranslations("filters");
  const locale = useLocale();

  const [industry, setIndustry] = useState(initialIndustry);
  const [city, setCity] = useState(initialCity);
  const [freeText, setFreeText] = useState(initialFreeText);

  const updateIndustry = (v: string) => {
    setIndustry(v);
    onFilterChange?.(v, city, freeText);
  };
  const updateCity = (v: string) => {
    setCity(v);
    onFilterChange?.(industry, v, freeText);
  };
  const updateFreeText = (v: string) => {
    setFreeText(v);
    onFilterChange?.(industry, city, v);
  };

  const handleSearch = () => {
    const selectedIndustry = INDUSTRIES.find(i => i.id === industry);
    const selectedCity = ESTONIAN_CITIES.find(c => c.id === city);

    // Cross-search: all industries in one city
    if (!industry && city && !freeText.trim()) {
      onSearch({
        query: "",
        location: selectedCity?.name || "",
        crossMode: "all-industries",
        cityName: selectedCity?.name || "",
      });
      return;
    }

    // Cross-search: one industry across all cities
    if (industry && !city && !freeText.trim()) {
      onSearch({
        query: "",
        location: "",
        crossMode: "all-locations",
        industryId: industry,
      });
      return;
    }

    // Normal single search
    let query = "";
    if (freeText.trim()) {
      query = freeText.trim();
    } else if (selectedIndustry) {
      query = locale === "et" ? selectedIndustry.searchTermEt : selectedIndustry.searchTermEn;
    }

    const location = selectedCity?.name || "";

    if (!query && !location) return;

    onSearch({ query, location, crossMode: null });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClasses}>{t("industry")}</label>
            <select
              value={industry}
              onChange={(e) => updateIndustry(e.target.value)}
              className={selectClasses}
            >
              <option value="">{t("industryAll")}</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {locale === "et" ? ind.labelEt : ind.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses}>{t("location")}</label>
            <select
              value={city}
              onChange={(e) => updateCity(e.target.value)}
              className={selectClasses}
            >
              <option value="">{t("locationAll")}</option>
              {ESTONIAN_CITIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses}>{t("freeSearch")}</label>
            <input
              type="text"
              value={freeText}
              onChange={(e) => updateFreeText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("freeSearchPlaceholder")}
              className={inputClasses}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="h-10 w-full rounded-lg bg-teal-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-teal-900 active:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t("searching") : t("search")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
