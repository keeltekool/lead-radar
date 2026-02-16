"use client";

import type { PlaceResult, LeadScoreBreakdown } from "@/types/lead";
import { useTranslations } from "next-intl";
import { getScoreColor, getScoreBgColor, getScoreLabel } from "@/lib/scoring";

interface EnrichmentData {
  pageSpeed?: { performance: number; seo: number; accessibility: number; bestPractices: number } | null;
  emails?: string[];
}

interface LeadCardProps {
  place: PlaceResult;
  score: LeadScoreBreakdown;
  isSaved?: boolean;
  onToggleSave?: (place: PlaceResult) => void;
  onViewDetails?: (place: PlaceResult) => void;
  savingId?: string | null;
  enrichment?: EnrichmentData;
}

const TYPE_LABELS: Record<string, string> = {
  general_contractor: "Ehitus",
  electrician: "Elektrik",
  plumber: "Torumees",
  car_repair: "Autoteenindus",
  beauty_salon: "Ilusalong",
  hair_care: "Juuksur",
  dentist: "Hambaravi",
  accounting: "Raamatupidamine",
  lawyer: "Advokaat",
  real_estate_agency: "Kinnisvara",
  veterinary_care: "Veterinaaria",
  cleaning_service: "Koristus",
  moving_company: "Kolimine",
  locksmith: "Lukksepp",
  spa: "Spa",
};

export default function LeadCard({
  place,
  score,
  isSaved = false,
  onToggleSave,
  onViewDetails,
  savingId,
  enrichment,
}: LeadCardProps) {
  const t = useTranslations("lead");
  const isSaving = savingId === place.id;
  const typeBadge = TYPE_LABELS[place.primaryType || ""] || place.primaryTypeDisplayName?.text || place.primaryType || "";
  const initial = (place.displayName?.text || "?")[0].toUpperCase();
  let faviconUrl: string | null = null;
  if (place.websiteUri) {
    try {
      const host = new URL(place.websiteUri).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    } catch { /* malformed URL — skip favicon */ }
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden transition-all duration-200 hover:border-teal-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className="p-4 space-y-3">
        {/* Header: Favicon/Initial + Name + Score */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="h-8 w-8 rounded-md bg-slate-100 shrink-0 mt-0.5"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }}
              />
            ) : null}
            <div className={`h-8 w-8 rounded-md bg-teal-100 shrink-0 mt-0.5 flex items-center justify-center text-sm font-bold text-teal-800 ${faviconUrl ? "hidden" : ""}`}>
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-teal-950 text-[15px] truncate">
                {place.displayName?.text}
              </h3>
            {typeBadge && (
              <span className="inline-flex items-center rounded-badge bg-teal-100 px-2.5 py-0.5 text-[11px] font-medium text-teal-800 mt-1">
                {typeBadge}
              </span>
            )}
            </div>
          </div>
          {/* Score badge */}
          <div className={`flex flex-col items-center rounded-lg border px-3 py-1.5 ${getScoreBgColor(score.total)}`}>
            <span className={`font-mono text-lg font-bold leading-none ${getScoreColor(score.total)}`}>
              {score.total}
            </span>
            <span className={`font-mono text-[10px] font-medium ${getScoreColor(score.total)}`}>
              {getScoreLabel(score.total)}
            </span>
          </div>
        </div>

        {/* Address */}
        <p className="text-[13px] text-slate-500 truncate" title={place.formattedAddress}>
          {place.shortFormattedAddress || place.formattedAddress}
        </p>

        {/* Metrics row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          {place.rating != null && (
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium">{place.rating}</span>
              <span className="text-slate-400">({place.userRatingCount ?? 0})</span>
            </span>
          )}
          {place.photos && (
            <span className="text-slate-400">{t("photos", { count: place.photos.length })}</span>
          )}
          {place.regularOpeningHours ? (
            <span className="text-green-600 text-xs">{t("hasHours")}</span>
          ) : (
            <span className="text-red-400 text-xs">{t("noHours")}</span>
          )}
        </div>

        {/* Contact row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          {place.nationalPhoneNumber && (
            <span className="text-slate-600">{place.nationalPhoneNumber}</span>
          )}
          {place.websiteUri ? (
            <a
              href={place.websiteUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-500 hover:text-teal-700 truncate max-w-[180px]"
              onClick={(e) => e.stopPropagation()}
            >
              {place.websiteUri.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          ) : (
            <span className="text-red-400 text-xs">{t("noWebsite")}</span>
          )}
        </div>

        {/* Enrichment data */}
        {enrichment && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {enrichment.pageSpeed && (
              <span className="text-slate-500">
                PageSpeed: <span className={`font-mono font-semibold ${enrichment.pageSpeed.performance >= 50 ? "text-green-600" : "text-red-500"}`}>{enrichment.pageSpeed.performance}</span>
              </span>
            )}
            {enrichment.emails && enrichment.emails.length > 0 && (
              <span className="text-teal-600 font-medium truncate max-w-[200px]">
                {enrichment.emails[0]}
              </span>
            )}
            {enrichment.emails && enrichment.emails.length === 0 && (
              <span className="text-slate-300">No email</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(place)}
              className="flex-1 rounded-button bg-teal-100 text-teal-800 px-3 py-2 text-xs font-semibold hover:bg-teal-200 transition-colors"
            >
              {t("viewDetails")}
            </button>
          )}
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(place);
              }}
              disabled={isSaving}
              className={`rounded-button px-3 py-2 text-xs font-semibold transition-colors ${
                isSaved
                  ? "bg-teal-100 text-teal-800 border border-teal-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  : "bg-teal-950 text-white hover:bg-teal-900"
              } disabled:opacity-50`}
            >
              {isSaved ? t("saved") : t("save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
