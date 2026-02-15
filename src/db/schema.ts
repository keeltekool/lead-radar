import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const savedLeads = pgTable(
  "saved_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    placeId: varchar("place_id", { length: 255 }).notNull(),

    // Business info
    name: text("name").notNull(),
    primaryType: varchar("primary_type", { length: 100 }),
    formattedAddress: text("formatted_address"),
    phone: varchar("phone", { length: 50 }),
    websiteUrl: text("website_url"),

    // Scoring inputs
    rating: numeric("rating", { precision: 3, scale: 1 }),
    reviewCount: integer("review_count").default(0),
    leadScore: integer("lead_score").default(0),
    photosCount: integer("photos_count").default(0),
    hasHours: boolean("has_hours").default(false),
    businessStatus: varchar("business_status", { length: 50 }),

    // Location
    locationLat: numeric("location_lat", { precision: 10, scale: 7 }),
    locationLng: numeric("location_lng", { precision: 10, scale: 7 }),

    // Full API response
    rawPlacesData: jsonb("raw_places_data"),

    // User data
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("saved_leads_user_place_idx").on(table.userId, table.placeId),
    index("saved_leads_user_id_idx").on(table.userId),
    index("saved_leads_created_at_idx").on(table.createdAt),
  ]
);

export const leadAnalyses = pgTable(
  "lead_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: varchar("place_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),

    // PageSpeed data
    pagespeedPerformance: integer("pagespeed_performance"),
    pagespeedSeo: integer("pagespeed_seo"),
    pagespeedAccessibility: integer("pagespeed_accessibility"),

    // Website scrape data
    emailsFound: jsonb("emails_found"),
    socialLinks: jsonb("social_links"),
    siteCopyrightYear: integer("site_copyright_year"),

    // AI analysis
    reviewSummary: text("review_summary"),
    aiPitch: text("ai_pitch"),

    // Raw data
    rawPagespeedData: jsonb("raw_pagespeed_data"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("lead_analyses_place_id_idx").on(table.placeId),
    index("lead_analyses_user_id_idx").on(table.userId),
  ]
);

// Type inference
export type SavedLead = typeof savedLeads.$inferSelect;
export type NewSavedLead = typeof savedLeads.$inferInsert;
export type LeadAnalysis = typeof leadAnalyses.$inferSelect;
export type NewLeadAnalysis = typeof leadAnalyses.$inferInsert;
