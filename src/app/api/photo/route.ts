import { NextRequest, NextResponse } from "next/server";

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Photo name required" }, { status: 400 });
  }

  const maxWidth = request.nextUrl.searchParams.get("maxWidth") || "400";

  try {
    const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidth}&key=${PLACES_API_KEY}`;
    const response = await fetch(url, { redirect: "follow" });

    if (!response.ok) {
      return NextResponse.json({ error: "Photo fetch failed" }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo proxy error" }, { status: 500 });
  }
}
