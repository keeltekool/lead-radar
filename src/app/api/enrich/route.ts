import { NextRequest, NextResponse } from "next/server";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

async function fetchPageSpeed(url: string) {
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PLACES_API_KEY}&category=performance&category=seo&category=accessibility&category=best-practices&strategy=mobile`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const data = await res.json();
    const cats = data.lighthouseResult?.categories;
    if (!cats) return null;
    return {
      performance: Math.round((cats.performance?.score ?? 0) * 100),
      seo: Math.round((cats.seo?.score ?? 0) * 100),
      accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((cats["best-practices"]?.score ?? 0) * 100),
    };
  } catch {
    return null;
  }
}

async function scrapeEmails(url: string) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadRadar/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return [];
    let html = await res.text();
    try { html = decodeURIComponent(html); } catch { /* keep raw */ }
    const emailRegex = /[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const rawEmails = html.match(emailRegex) || [];
    return [...new Set(rawEmails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg") && !e.includes("wixpress") && !e.includes("sentry")
    ).slice(0, 5);
  } catch {
    return [];
  }
}

interface EnrichRequest {
  placeId: string;
  websiteUri: string;
}

// POST — bulk enrich: fetch PageSpeed + emails for multiple places
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { places } = body as { places: EnrichRequest[] };

  if (!places || !Array.isArray(places) || places.length === 0) {
    return NextResponse.json({ error: "places array required" }, { status: 400 });
  }

  // Limit to 10 at a time to avoid timeout
  const batch = places.filter((p) => p.websiteUri).slice(0, 10);

  const results = await Promise.allSettled(
    batch.map(async (p) => {
      const [pageSpeed, emails] = await Promise.all([
        fetchPageSpeed(p.websiteUri),
        scrapeEmails(p.websiteUri),
      ]);
      return {
        placeId: p.placeId,
        pageSpeed,
        emails,
      };
    })
  );

  const enriched = results
    .filter((r): r is PromiseFulfilledResult<{ placeId: string; pageSpeed: ReturnType<typeof fetchPageSpeed> extends Promise<infer T> ? T : never; emails: string[] }> => r.status === "fulfilled")
    .map((r) => r.value);

  return NextResponse.json({ enriched });
}
