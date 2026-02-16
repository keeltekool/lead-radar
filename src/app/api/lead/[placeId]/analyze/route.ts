import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { leadAnalyses } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// GET — return cached analysis if exists
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { placeId } = await params;

  const [analysis] = await db
    .select()
    .from(leadAnalyses)
    .where(and(eq(leadAnalyses.placeId, placeId), eq(leadAnalyses.userId, userId)))
    .orderBy(desc(leadAnalyses.createdAt))
    .limit(1);

  if (!analysis) {
    return NextResponse.json({ cached: false });
  }

  return NextResponse.json({
    cached: true,
    reviewSummary: analysis.reviewSummary,
    aiPitch: analysis.aiPitch,
  });
}

// POST — generate AI analysis and persist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { placeId } = await params;
  const body = await request.json();
  const { place, pageSpeed, websiteScrape } = body;

  if (!place) {
    return NextResponse.json({ error: "Place data required" }, { status: 400 });
  }

  // Build context for Claude
  const reviewTexts = (place.reviews || [])
    .filter((r: { text?: { text: string } }) => r.text?.text)
    .map((r: { rating: number; text: { text: string } }) => `[${r.rating}/5] ${r.text.text}`)
    .slice(0, 10)
    .join("\n");

  const prompt = `You are Lead Radar — an AI assistant that helps AI/automation consultants evaluate local businesses as potential leads.

Analyze this Estonian business and produce:
1. **Review Summary** (2-3 sentences): Key themes from customer reviews — what do customers praise and complain about?
2. **Sales Pitch** (3-5 sentences): A personalized cold outreach pitch for selling AI/automation consulting services to this business. Reference specific pain points visible from their data.

## Business Data
- Name: ${place.displayName?.text}
- Type: ${place.primaryType || "unknown"}
- Address: ${place.formattedAddress}
- Rating: ${place.rating ?? "N/A"} (${place.userRatingCount ?? 0} reviews)
- Website: ${place.websiteUri || "None"}
- Phone: ${place.nationalPhoneNumber || "None"}
- Has opening hours: ${place.regularOpeningHours ? "Yes" : "No"}
- Photos count: ${place.photos?.length ?? 0}

${pageSpeed ? `## Website Performance (PageSpeed)
- Performance: ${pageSpeed.performance}/100
- SEO: ${pageSpeed.seo}/100
- Accessibility: ${pageSpeed.accessibility}/100
- Best Practices: ${pageSpeed.bestPractices}/100` : "## No website performance data available"}

${websiteScrape ? `## Website Scrape
- Emails found: ${websiteScrape.emails?.join(", ") || "None"}
- Social links: ${Object.entries(websiteScrape.socialLinks || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "None"}
- Copyright year: ${websiteScrape.copyrightYear || "Not found"}` : ""}

## Customer Reviews
${reviewTexts || "No reviews available"}

Respond in JSON format:
{
  "reviewSummary": "...",
  "aiPitch": "..."
}

Write the pitch in Estonian. Keep it professional, specific, and actionable. Reference their actual data (e.g., low PageSpeed score, outdated website, few reviews).`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Persist to lead_analyses table
    try {
      await db.insert(leadAnalyses).values({
        placeId,
        userId,
        reviewSummary: analysis.reviewSummary,
        aiPitch: analysis.aiPitch,
        pagespeedPerformance: pageSpeed?.performance ?? null,
        pagespeedSeo: pageSpeed?.seo ?? null,
        pagespeedAccessibility: pageSpeed?.accessibility ?? null,
        emailsFound: websiteScrape?.emails ?? null,
        socialLinks: websiteScrape?.socialLinks ?? null,
        siteCopyrightYear: websiteScrape?.copyrightYear ?? null,
      });
    } catch (dbErr) {
      console.error("Failed to persist analysis:", dbErr);
      // Don't fail the request — still return the analysis
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
