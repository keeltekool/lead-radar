import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { savedLeads, leadAnalyses } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await db
    .select()
    .from(savedLeads)
    .where(eq(savedLeads.userId, userId))
    .orderBy(desc(savedLeads.createdAt));

  // Fetch all analyses for this user's leads
  const analyses = await db
    .select()
    .from(leadAnalyses)
    .where(eq(leadAnalyses.userId, userId));

  // Map placeId -> latest analysis
  const analysisMap = new Map<string, typeof analyses[number]>();
  for (const a of analyses) {
    const existing = analysisMap.get(a.placeId);
    if (!existing || a.createdAt > existing.createdAt) {
      analysisMap.set(a.placeId, a);
    }
  }

  // Build CSV with enriched data
  const headers = [
    "Name", "Email", "Type", "Address", "Phone", "Website",
    "Rating", "Reviews", "Score", "Notes",
    "PageSpeed", "SEO", "Accessibility",
    "Review Summary", "AI Pitch",
    "Saved At",
  ];
  const rows = leads.map((l) => {
    const analysis = analysisMap.get(l.placeId);
    return [
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${((l.emails as string[] | null) || []).join("; ")}"`,
      l.primaryType || "",
      `"${(l.formattedAddress || "").replace(/"/g, '""')}"`,
      l.phone || "",
      l.websiteUrl || "",
      l.rating || "",
      l.reviewCount?.toString() || "0",
      l.leadScore?.toString() || "0",
      `"${(l.notes || "").replace(/"/g, '""')}"`,
      analysis?.pagespeedPerformance?.toString() || "",
      analysis?.pagespeedSeo?.toString() || "",
      analysis?.pagespeedAccessibility?.toString() || "",
      `"${(analysis?.reviewSummary || "").replace(/"/g, '""')}"`,
      `"${(analysis?.aiPitch || "").replace(/"/g, '""')}"`,
      l.createdAt.toISOString().split("T")[0],
    ];
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lead-radar-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
