import { NextRequest, NextResponse } from "next/server";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

// Fetch PageSpeed scores for a website
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

// Scrape website for emails, social links, copyright year
async function scrapeWebsite(url: string) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadRadar/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const rawEmails = html.match(emailRegex) || [];
    const emails = [...new Set(rawEmails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg") && !e.includes("wixpress") && !e.includes("sentry")
    ).slice(0, 10);

    // Extract social links
    const socialPatterns: Record<string, RegExp> = {
      facebook: /https?:\/\/(www\.)?facebook\.com\/[^\s"'<>]+/gi,
      instagram: /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>]+/gi,
      linkedin: /https?:\/\/(www\.)?linkedin\.com\/[^\s"'<>]+/gi,
      youtube: /https?:\/\/(www\.)?youtube\.com\/[^\s"'<>]+/gi,
    };
    const socialLinks: Record<string, string> = {};
    for (const [platform, regex] of Object.entries(socialPatterns)) {
      const match = html.match(regex);
      if (match) socialLinks[platform] = match[0];
    }

    // Extract copyright year
    const yearMatch = html.match(/©\s*(\d{4})/);
    const copyrightYear = yearMatch ? parseInt(yearMatch[1]) : undefined;

    return { emails, socialLinks, copyrightYear };
  } catch {
    return null;
  }
}

// Fetch full place details from Google Places API
async function fetchPlaceDetails(placeId: string) {
  const fieldMask = [
    "id", "displayName", "formattedAddress", "shortFormattedAddress",
    "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri",
    "rating", "userRatingCount", "types", "primaryType", "primaryTypeDisplayName",
    "businessStatus", "pureServiceAreaBusiness", "regularOpeningHours",
    "photos", "editorialSummary", "googleMapsUri", "location", "reviews",
  ].join(",");

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": PLACES_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;

  // Fetch place details
  const place = await fetchPlaceDetails(placeId);
  if (!place) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  // Run PageSpeed + website scrape in parallel (if website exists)
  let pageSpeed = null;
  let websiteScrape = null;

  if (place.websiteUri) {
    const [ps, ws] = await Promise.all([
      fetchPageSpeed(place.websiteUri),
      scrapeWebsite(place.websiteUri),
    ]);
    pageSpeed = ps;
    websiteScrape = ws;
  }

  return NextResponse.json({
    place,
    pageSpeed,
    websiteScrape,
  });
}
