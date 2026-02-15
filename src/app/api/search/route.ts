import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const location = searchParams.get("location") || "";

  if (!query && !location) {
    return NextResponse.json({ error: "Query or location required" }, { status: 400 });
  }

  const textQuery = [query, location].filter(Boolean).join(" ");

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "et",
        maxResultCount: 20,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Places API error:", error);
      return NextResponse.json(
        { error: "Places API error", details: error.error?.message },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
