import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { savedLeads } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { scrapeEmails } from "@/lib/scrape-emails";

// GET — list saved leads for current user
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

  return NextResponse.json({ leads });
}

// POST — save a lead
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { place, leadScore } = body;

  if (!place?.id) {
    return NextResponse.json({ error: "Place data required" }, { status: 400 });
  }

  try {
    // Scrape emails from website (if exists)
    const emails = place.websiteUri ? await scrapeEmails(place.websiteUri) : [];

    const [lead] = await db
      .insert(savedLeads)
      .values({
        userId,
        placeId: place.id,
        name: place.displayName?.text || "Unknown",
        primaryType: place.primaryType || null,
        formattedAddress: place.formattedAddress || null,
        phone: place.nationalPhoneNumber || null,
        websiteUrl: place.websiteUri || null,
        rating: place.rating?.toString() || null,
        reviewCount: place.userRatingCount ?? 0,
        leadScore: leadScore ?? 0,
        photosCount: place.photos?.length ?? 0,
        hasHours: !!place.regularOpeningHours,
        businessStatus: place.businessStatus || null,
        locationLat: place.location?.latitude?.toString() || null,
        locationLng: place.location?.longitude?.toString() || null,
        rawPlacesData: place,
        emails: emails.length > 0 ? emails : null,
      })
      .onConflictDoNothing()
      .returning();

    if (!lead) {
      return NextResponse.json({ error: "Lead already saved" }, { status: 409 });
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("Save lead error:", error);
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}

// DELETE — unsave one or many leads
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { placeId, placeIds } = body as { placeId?: string; placeIds?: string[] };

  // Bulk delete
  if (placeIds && placeIds.length > 0) {
    await db
      .delete(savedLeads)
      .where(and(eq(savedLeads.userId, userId), inArray(savedLeads.placeId, placeIds)));
    return NextResponse.json({ success: true, deleted: placeIds.length });
  }

  // Single delete
  if (!placeId) {
    return NextResponse.json({ error: "placeId or placeIds required" }, { status: 400 });
  }

  await db
    .delete(savedLeads)
    .where(and(eq(savedLeads.userId, userId), eq(savedLeads.placeId, placeId)));

  return NextResponse.json({ success: true });
}
