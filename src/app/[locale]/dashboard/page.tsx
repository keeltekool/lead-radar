"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { getScoreColor, getScoreBgColor, getScoreLabel } from "@/lib/scoring";

interface SavedLead {
  id: string;
  placeId: string;
  name: string;
  primaryType: string | null;
  formattedAddress: string | null;
  phone: string | null;
  websiteUrl: string | null;
  rating: string | null;
  reviewCount: number | null;
  leadScore: number | null;
  emails: string[] | null;
  notes: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterScore, setFilterScore] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => setLeads(data.leads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  const handleRemove = useCallback(async (placeId: string) => {
    await fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    setLeads((prev) => prev.filter((l) => l.placeId !== placeId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(placeId);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    const placeIds = Array.from(selectedIds);
    await fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeIds }),
    });
    setLeads((prev) => prev.filter((l) => !selectedIds.has(l.placeId)));
    setSelectedIds(new Set());
    setDeleting(false);
  }, [selectedIds]);

  const filteredLeads = leads.filter((l) => {
    const score = l.leadScore ?? 0;
    if (filterScore === "hot") return score >= 60;
    if (filterScore === "warm") return score >= 30 && score < 60;
    if (filterScore === "cold") return score < 30;
    return true;
  });

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.has(l.placeId));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const l of filteredLeads) next.delete(l.placeId);
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const l of filteredLeads) next.add(l.placeId);
        return next;
      });
    }
  };

  const toggleSelect = (placeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  if (!isSignedIn) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Please sign in to view saved leads.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
        <div className="flex items-center gap-3">
          {/* Score filter */}
          <select
            value={filterScore}
            onChange={(e) => setFilterScore(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">{t("all")} ({leads.length})</option>
            <option value="hot">Hot ({leads.filter((l) => (l.leadScore ?? 0) >= 60).length})</option>
            <option value="warm">Warm ({leads.filter((l) => { const s = l.leadScore ?? 0; return s >= 30 && s < 60; }).length})</option>
            <option value="cold">Cold ({leads.filter((l) => (l.leadScore ?? 0) < 30).length})</option>
          </select>

          {/* CSV export */}
          {leads.length > 0 && (
            <a
              href="/api/leads/export"
              className="rounded-button bg-amber-900 text-white px-4 py-1.5 text-sm font-medium hover:bg-amber-800 transition-colors"
            >
              {t("export")}
            </a>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-sm font-medium text-red-700">
            {t("selected", { count: selectedIds.size })}
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="ml-auto rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? t("deleting") : t("deleteSelected")}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            {t("clearSelection")}
          </button>
        </div>
      )}

      {filteredLeads.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">{t("empty")}</p>
          <p className="text-slate-400 text-sm mt-1">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-3 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Business</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wide">Score</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => {
                const score = lead.leadScore ?? 0;
                const isSelected = selectedIds.has(lead.placeId);
                return (
                  <tr key={lead.id} className={`transition-colors ${isSelected ? "bg-amber-50/50" : "hover:bg-amber-50/30"}`}>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.placeId)}
                        className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{lead.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{lead.formattedAddress}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.emails && lead.emails.length > 0 ? (
                        <div className="space-y-0.5">
                          {lead.emails.map((email) => (
                            <a key={email} href={`mailto:${email}`} className="block text-sm text-amber-600 hover:text-amber-800 font-medium">
                              {email}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-slate-600">{lead.phone || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className={`inline-flex flex-col items-center rounded-lg border px-2.5 py-1 ${getScoreBgColor(score)}`}>
                        <span className={`font-mono text-sm font-bold ${getScoreColor(score)}`}>{score}</span>
                        <span className={`text-[9px] font-medium ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/lead/${lead.placeId}`)}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleRemove(lead.placeId)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
