import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { savedLeads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

  // Build CSV
  const headers = ["Name", "Email", "Type", "Address", "Phone", "Website", "Rating", "Reviews", "Score", "Notes", "Saved At"];
  const rows = leads.map((l) => [
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
    l.createdAt.toISOString().split("T")[0],
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lead-radar-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
