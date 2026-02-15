# Lead Radar — Product Requirements Document

## Problem

You're learning to market AI/automation consulting services to Estonian service businesses. Finding prospects manually (browsing Google Maps, guessing who needs help) is slow, random, and produces zero data to prioritize outreach. You need a tool that systematically finds businesses with mediocre digital presence — the ones who TRIED but are doing it badly — and scores them as consulting leads.

## Target Customer

**Primary:** You (your own lead generation for AI consulting).
**Secondary:** Other freelance consultants, small marketing agencies, B2B sales teams.

**Target businesses (the leads):** Estonian service companies in the "digital middle" — they have a website and/or Google profile, but it's outdated, slow, poorly reviewed, or incomplete. NOT zero-presence ghosts (won't buy). NOT digitally mature (don't need you).

### Target Verticals

| Category | Estonian search term | AI consulting value prop |
|----------|-------------------|--------------------------|
| Construction / Renovation | ehitusfirma, remonditööd | Automated quoting, project scheduling |
| Cleaning services | puhastusfirma, koristusteenused | Booking automation, scheduling |
| Accounting firms | raamatupidamine | Document processing, invoice automation |
| Auto repair / Service | autoteenindus, autohooldus | Appointment booking, customer follow-up |
| Beauty / Wellness | ilusalong, spa, juuksur | Online booking, reminders |
| Dental / Medical | hambaravi, kliinik | Patient scheduling, intake forms |
| Real estate agencies | kinnisvarabüroo | Listing automation, lead response |
| Legal services | advokaadibüroo, õigusteenused | Document automation, contract analysis |
| Logistics / Transport | logistika, veoteenus | Route optimization, dispatch |
| Property management | kinnisvara haldus | Tenant comms, maintenance ticketing |
| Security services | turvafirma | Scheduling, monitoring, reporting |
| IT services | IT teenused, IT hooldus | Ticket management, monitoring |
| Pet services | loomakliinik | Booking, reminders |
| Printing / Signs | trükikoda, reklaamteenus | Order management |

## Data Sources

All Google APIs — no Estonian Business Registry dependency.

### Google Places API (New) — Primary

Text Search endpoint returns per business:

**Core identity:** `id`, `displayName`, `types[]`, `primaryType`, `businessStatus`, `pureServiceAreaBusiness`
**Contact:** `websiteUri` (null = no website), `nationalPhoneNumber`, `internationalPhoneNumber`
**Address:** `formattedAddress`, `shortFormattedAddress`, `addressComponents[]`, `location` (lat/lng)
**Reviews:** `rating` (1.0–5.0), `userRatingCount` (integer), `reviews[]` (up to 5, each with text, rating, publishTime)
**Profile:** `photos[]` (count), `regularOpeningHours`, `editorialSummary`, `googleMapsUri`

### PageSpeed Insights API — Website Quality (if websiteUri exists)

Returns: Performance score (0-100), SEO score (0-100), Accessibility score (0-100), Best Practices score (0-100), individual audits (HTTPS, viewport, meta description, mobile tap targets).

### Website Scraping — Email & Enrichment (if websiteUri exists)

Extract: email addresses (regex from contact page/footer), social media links, copyright year, technology indicators.

## Lead Scoring Model

Every factor maps to a real API field. Score peaks in the MIDDLE (mediocre presence = hot lead).

### Factor 1: Website Status (25 pts max)
- `websiteUri` exists = in the game (+10)
- `websiteUri` exists + PageSpeed performance < 50 = bad site (+15 bonus)
- `websiteUri` exists + PageSpeed SEO < 50 = invisible site (+10 bonus, cap at 25)
- `websiteUri` is null = skip (0 pts — too cold)

### Factor 2: Google Profile Completeness (25 pts max)
- `photos[]` count 0 = 0 pts (no profile effort)
- `photos[]` count 1-2 = +10 (bare minimum)
- `photos[]` count 3-5 = +5 (decent but room to improve)
- `regularOpeningHours` missing = +5
- `nationalPhoneNumber` missing = +5
- `editorialSummary` null = +5

### Factor 3: Review Health (25 pts max)
- `rating` 3.0-4.2 = +15 (sweet spot — fixable, not hopeless)
- `rating` < 3.0 = +5 (might be lost cause)
- `rating` > 4.5 = 0 (doing fine)
- `userRatingCount` 1-15 = +10 (few reviews — underperforming)
- `userRatingCount` 0 = 0 (ghost — too cold)
- `userRatingCount` > 50 = 0 (well-established)

### Factor 4: Contactability (15 pts max)
- Email found on website = +10
- Phone number on profile = +5
- No email AND no phone = 0 (can't reach them)

### Factor 5: Service Business Fit (10 pts max)
- `pureServiceAreaBusiness` = true → +5
- `primaryType` matches target verticals → +5

**Total: 0-100. Score 60+ = hot lead. Score 30-59 = warm. Score < 30 = skip.**

## MVP Scope

### Pages

1. **Search Page** (home, public)
   - Location dropdown (Estonian cities)
   - Industry dropdown (from verticals list)
   - Free text search option
   - Search button → Google Places API Text Search

2. **Results Page** (public)
   - Card list, 20 results per search
   - Each card: name, type badge, address, phone, rating, review count, website indicator, Lead Score
   - Save button (requires auth)
   - Sort by: Lead Score, Rating, Review Count

3. **Lead Detail Page** (requires auth)
   - All Places API data
   - If website exists: PageSpeed scores + extracted email + social links
   - Reviews listed + Claude AI summary (top complaints, strengths, opportunities)
   - Lead Score breakdown (visual)
   - AI-generated personalized outreach pitch
   - Save / Unsave

4. **Saved Leads Page** (requires auth)
   - Table of saved leads
   - Filter by industry, location, score range
   - CSV export

### NOT in MVP
- Competitive comparison analysis
- Custom Search API ranking check
- Stripe / payments
- Automated email outreach
- Time-series tracking
- Multi-user / team features
- Map view

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 16, React 19 | Same as Prop-Radar |
| Styling | Tailwind CSS 4 | Amber palette (not forest green, not blue) |
| Auth | Clerk | Same as Prop-Radar |
| DB | Neon PostgreSQL + Drizzle ORM | Same as Prop-Radar |
| AI | Anthropic Claude Sonnet | Review analysis + pitch generation |
| APIs | Google Places API (New), PageSpeed Insights API | User has free credits |
| Hosting | Vercel | Same as Prop-Radar |
| i18n | next-intl (ET/EN) | Same as Prop-Radar |
| Fonts | Inter + JetBrains Mono | Same as Prop-Radar |

## DB Schema

```
saved_leads
  - id (uuid, PK)
  - user_id (varchar)
  - place_id (varchar, unique per user)
  - name (text)
  - primary_type (varchar)
  - formatted_address (text)
  - phone (varchar)
  - website_url (text, nullable)
  - rating (numeric, nullable)
  - review_count (integer)
  - lead_score (integer)
  - photos_count (integer)
  - has_hours (boolean)
  - business_status (varchar)
  - location_lat (numeric)
  - location_lng (numeric)
  - raw_places_data (jsonb)
  - notes (text, nullable)
  - created_at (timestamp)
  - updated_at (timestamp)

lead_analyses
  - id (uuid, PK)
  - lead_id (uuid, FK → saved_leads)
  - place_id (varchar)
  - pagespeed_performance (integer, nullable)
  - pagespeed_seo (integer, nullable)
  - pagespeed_accessibility (integer, nullable)
  - emails_found (text[], nullable)
  - social_links (jsonb, nullable)
  - site_copyright_year (integer, nullable)
  - review_summary (text, nullable)
  - ai_pitch (text, nullable)
  - raw_pagespeed_data (jsonb, nullable)
  - created_at (timestamp)
```

## API Routes

```
GET  /api/search?q=...&location=...&type=...  → proxy Google Places Text Search
GET  /api/lead/[placeId]                       → fetch PageSpeed + scrape website
POST /api/lead/[placeId]/analyze               → Claude AI review analysis + pitch
GET  /api/leads                                → list saved leads
POST /api/leads                                → save a lead
DELETE /api/leads/[id]                          → unsave a lead
GET  /api/leads/export                         → CSV download
```

## Design

Identical layout/component patterns as Prop-Radar, swapped to amber/warm palette:

- **Primary:** Amber (#F59E0B family) — accents, buttons, badges
- **Dark:** Slate-900 with amber tints — navbar, primary buttons
- **Background:** Slate-50
- **Cards:** White with subtle amber-tinted shadows
- Same border-radius tokens (card: 12px, badge: 6px, button: 8px)
- Same font stack (Inter + JetBrains Mono)
- Same shadow patterns

## Milestones

1. Project setup + search working with real Google API data
2. Lead scoring + results display
3. Lead detail page with PageSpeed + email extraction
4. AI analysis (review summary + pitch generation)
5. Saved leads + CSV export
6. Deploy to Vercel
