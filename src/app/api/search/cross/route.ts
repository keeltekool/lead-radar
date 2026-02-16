import { NextRequest, NextResponse } from "next/server";
import { INDUSTRIES, ESTONIAN_CITIES } from "@/data/industries";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  "places.pureServiceAreaBusiness",
  "places.regularOpeningHours",
  "places.photos",
  "places.editorialSummary",
  "places.googleMapsUri",
  "places.location",
  "places.reviews",
].join(",");

interface PlaceResult {
  id: string;
  [key: string]: unknown;
}

async function searchPlaces(textQuery: string): Promise<PlaceResult[]> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, languageCode: "et", pageSize: 20 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.places || [];
  } catch {
    return [];
  }
}

// GET /api/search/cross?mode=all-industries&city=Tallinn
// GET /api/search/cross?mode=all-locations&industry=construction
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("mode");
  const city = searchParams.get("city") || "";
  const industryId = searchParams.get("industry") || "";

  if (mode === "all-industries" && city) {
    // Search every industry in this city — run in parallel batches
    const queries = INDUSTRIES.map((ind) => `${ind.searchTermEt} ${city}`);
    const results = await Promise.allSettled(queries.map(searchPlaces));

    const seen = new Set<string>();
    const merged: PlaceResult[] = [];
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const place of r.value) {
        if (!seen.has(place.id)) {
          seen.add(place.id);
          merged.push(place);
        }
      }
    }

    return NextResponse.json({ places: merged });
  }

  if (mode === "all-locations" && industryId) {
    const industry = INDUSTRIES.find((i) => i.id === industryId);
    if (!industry) {
      return NextResponse.json({ error: "Unknown industry" }, { status: 400 });
    }

    // Search this industry in every city — run in parallel batches
    const queries = ESTONIAN_CITIES.map((c) => `${industry.searchTermEt} ${c.name}`);
    const results = await Promise.allSettled(queries.map(searchPlaces));

    const seen = new Set<string>();
    const merged: PlaceResult[] = [];
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const place of r.value) {
        if (!seen.has(place.id)) {
          seen.add(place.id);
          merged.push(place);
        }
      }
    }

    return NextResponse.json({ places: merged });
  }

  return NextResponse.json({ error: "mode must be all-industries or all-locations" }, { status: 400 });
}
