"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { calculateLeadScore, getScoreColor, getScoreBgColor } from "@/lib/scoring";
import type { PlaceResult, LeadScoreBreakdown } from "@/types/lead";

interface PageSpeedData {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
}

interface WebsiteScrapeData {
  emails: string[];
  socialLinks: Record<string, string>;
  copyrightYear?: number;
}

interface AiAnalysis {
  reviewSummary: string;
  aiPitch: string;
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-mono font-semibold text-slate-900">{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PageSpeedGauge({ label, score }: { label: string; score: number }) {
  const color = score >= 90 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  const bgColor = score >= 90 ? "bg-green-50 border-green-200" : score >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  return (
    <div className={`flex flex-col items-center rounded-xl border p-4 ${bgColor}`}>
      <span className={`text-2xl font-bold font-mono ${color}`}>{score}</span>
      <span className="text-xs text-slate-500 mt-1">{label}</span>
    </div>
  );
}

export default function LeadDetailPage() {
  const t = useTranslations("detail");
  const { placeId } = useParams<{ placeId: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [score, setScore] = useState<LeadScoreBreakdown | null>(null);
  const [pageSpeed, setPageSpeed] = useState<PageSpeedData | null>(null);
  const [websiteScrape, setWebsiteScrape] = useState<WebsiteScrapeData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Save/unsave state
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notes state
  const [notes, setNotes] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Fetch place details
  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/lead/${placeId}`);
        const data = await res.json();
        if (data.place) {
          setPlace(data.place);
          setScore(calculateLeadScore(data.place));
          setPageSpeed(data.pageSpeed);
          setWebsiteScrape(data.websiteScrape);
        }
      } catch (err) {
        console.error("Failed to fetch lead details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [placeId]);

  // Check saved status + cached analysis (when signed in)
  useEffect(() => {
    if (!isSignedIn || loading) return;

    // Check if this lead is saved
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        const saved = (data.leads || []).find(
          (l: { placeId: string; notes: string | null }) => l.placeId === placeId
        );
        if (saved) {
          setIsSaved(true);
          setNotes(saved.notes || "");
          setNotesInput(saved.notes || "");
        }
      })
      .catch(() => {});

    // Check for cached AI analysis
    fetch(`/api/lead/${placeId}/analyze`)
      .then((r) => r.json())
      .then((data) => {
        if (data.cached && data.reviewSummary) {
          setAiAnalysis({ reviewSummary: data.reviewSummary, aiPitch: data.aiPitch });
        }
      })
      .catch(() => {});
  }, [isSignedIn, loading, placeId]);

  const handleSave = useCallback(async () => {
    if (!place || !score) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place, leadScore: score.total }),
      });
      if (res.ok || res.status === 409) {
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [place, score]);

  const handleUnsave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      setIsSaved(false);
      setNotes("");
      setNotesInput("");
    } catch (err) {
      console.error("Unsave failed:", err);
    } finally {
      setSaving(false);
    }
  }, [placeId]);

  const handleSaveNotes = useCallback(async () => {
    setSavingNotes(true);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, notes: notesInput || null }),
      });
      if (res.ok) {
        setNotes(notesInput);
        setEditingNotes(false);
      }
    } catch (err) {
      console.error("Save notes failed:", err);
    } finally {
      setSavingNotes(false);
    }
  }, [placeId, notesInput]);

  const runAnalysis = useCallback(async () => {
    if (!place) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/lead/${placeId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place, pageSpeed, websiteScrape }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch (err) {
      console.error("AI analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  }, [place, placeId, pageSpeed, websiteScrape]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!place || !score) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Lead not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-teal-500 hover:text-teal-700 text-sm font-medium">
          &larr; Back to search
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button onClick={() => router.back()} className="text-teal-500 hover:text-teal-700 text-sm font-medium">
        &larr; {t("backToSearch")}
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-teal-950">{place.displayName?.text}</h1>
            {place.primaryTypeDisplayName?.text && (
              <span className="inline-flex items-center rounded-badge bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800 mt-2">
                {place.primaryTypeDisplayName.text}
              </span>
            )}
            <p className="text-slate-500 mt-2">{place.formattedAddress}</p>
          </div>
          <div className="flex items-start gap-3">
            {/* Save/Unsave button */}
            {isSignedIn && (
              <button
                onClick={isSaved ? handleUnsave : handleSave}
                disabled={saving}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isSaved
                    ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                }`}
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  </svg>
                )}
                {saving ? t("saving") : isSaved ? t("unsaveLead") : t("saveLead")}
              </button>
            )}
            {/* Score badge */}
            <div className={`flex flex-col items-center rounded-xl border px-5 py-3 ${getScoreBgColor(score.total)}`}>
              <span className={`font-mono text-4xl font-bold ${getScoreColor(score.total)}`}>{score.total}</span>
              <span className={`font-mono text-xs font-medium ${getScoreColor(score.total)}`}>/100</span>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          {place.nationalPhoneNumber && (
            <a href={`tel:${place.nationalPhoneNumber}`} className="flex items-center gap-1.5 text-slate-600 hover:text-teal-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              {place.nationalPhoneNumber}
            </a>
          )}
          {place.websiteUri && (
            <a href={place.websiteUri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-teal-500 hover:text-teal-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              {place.websiteUri.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          )}
          {place.googleMapsUri && (
            <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-slate-500 hover:text-teal-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              Google Maps
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Score Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-teal-950 uppercase tracking-wide">{t("scoreBreakdown")}</h2>
          <ScoreBar label={t("webPresence")} value={score.webPresence} max={25} />
          <ScoreBar label={t("profileCompleteness")} value={score.profileCompleteness} max={25} />
          <ScoreBar label={t("reviewHealth")} value={score.reviewHealth} max={25} />
          <ScoreBar label={t("contactability")} value={score.contactability} max={15} />
          <ScoreBar label={t("serviceFit")} value={score.serviceFit} max={10} />
        </div>

        {/* PageSpeed */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-teal-950 uppercase tracking-wide">{t("websitePerformance")}</h2>
          {pageSpeed ? (
            <div className="grid grid-cols-2 gap-3">
              <PageSpeedGauge label="Performance" score={pageSpeed.performance} />
              <PageSpeedGauge label="SEO" score={pageSpeed.seo} />
              <PageSpeedGauge label="Accessibility" score={pageSpeed.accessibility} />
              <PageSpeedGauge label="Best Practices" score={pageSpeed.bestPractices} />
            </div>
          ) : (
            <p className="text-sm text-slate-400">{place.websiteUri ? t("pagespeedLoading") : t("noWebsite")}</p>
          )}
        </div>

        {/* Contact & Social */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-teal-950 uppercase tracking-wide">{t("contactInfo")}</h2>

          {/* Emails */}
          {websiteScrape?.emails && websiteScrape.emails.length > 0 ? (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("emailsFound")}</p>
              <div className="space-y-1">
                {websiteScrape.emails.map((email) => (
                  <a key={email} href={`mailto:${email}`} className="block text-sm text-teal-500 hover:text-teal-700">
                    {email}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t("noEmails")}</p>
          )}

          {/* Social links */}
          {websiteScrape?.socialLinks && Object.keys(websiteScrape.socialLinks).length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t("socialLinks")}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(websiteScrape.socialLinks).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-teal-100 hover:text-teal-800 transition-colors capitalize"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Copyright year */}
          {websiteScrape?.copyrightYear && (
            <p className="text-sm text-slate-500">
              {t("copyrightYear")}: <span className="font-mono font-medium text-slate-700">{websiteScrape.copyrightYear}</span>
            </p>
          )}
        </div>

        {/* Reviews */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-teal-950 uppercase tracking-wide">{t("reviews")}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
            {place.rating != null && (
              <>
                <svg className="h-5 w-5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-semibold">{place.rating}</span>
                <span className="text-slate-400">({place.userRatingCount ?? 0} {t("reviewCount")})</span>
              </>
            )}
          </div>
          {place.reviews && place.reviews.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {place.reviews.slice(0, 5).map((review, i) => (
                <div key={i} className="border-l-2 border-teal-200 pl-3 py-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span className="font-medium text-slate-600">{review.authorAttribution?.displayName}</span>
                    <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-3">{review.text?.text || review.originalText?.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t("noReviews")}</p>
          )}
        </div>
      </div>

      {/* Notes Section (only when saved) */}
      {isSignedIn && isSaved && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-teal-950 uppercase tracking-wide">{t("notes")}</h2>
            {!editingNotes && (
              <button
                onClick={() => { setNotesInput(notes); setEditingNotes(true); }}
                className="text-xs text-teal-500 hover:text-teal-700 font-medium"
              >
                {notes ? "Edit" : "Add notes"}
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setNotesInput(notes); setEditingNotes(false); }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="rounded-lg bg-teal-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 transition-colors disabled:opacity-50"
                >
                  {savingNotes ? t("savingNotes") : t("saveNotes")}
                </button>
              </div>
            </div>
          ) : notes ? (
            <p className="text-sm text-slate-600 whitespace-pre-line">{notes}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">{t("notesPlaceholder")}</p>
          )}
        </div>
      )}

      {/* AI Analysis Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-teal-950 uppercase tracking-wide">{t("aiAnalysis")}</h2>
          {!aiAnalysis && isSignedIn && (
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="rounded-button bg-teal-950 text-white px-5 py-2.5 text-sm font-semibold hover:bg-teal-900 transition-colors disabled:opacity-50"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t("analyzing")}
                </span>
              ) : (
                t("generateAnalysis")
              )}
            </button>
          )}
        </div>

        {aiAnalysis ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-teal-950 uppercase tracking-wide mb-2">{t("reviewSummary")}</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{aiAnalysis.reviewSummary}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-teal-950 uppercase tracking-wide mb-2">{t("salesPitch")}</h3>
              <div className="rounded-xl bg-teal-50 border border-teal-200 p-5">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiAnalysis.aiPitch}</p>
              </div>
              {/* One-click email with pitch */}
              {websiteScrape?.emails && websiteScrape.emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {websiteScrape.emails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}?subject=${encodeURIComponent(place.displayName?.text || "")}&body=${encodeURIComponent(aiAnalysis.aiPitch)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-950 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                      {t("sendPitch")} → {email}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : !analyzing ? (
          <p className="text-sm text-slate-400">
            {isSignedIn ? t("aiHint") : "Sign in to generate AI analysis"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
