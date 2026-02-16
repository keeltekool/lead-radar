# Lead Radar — Stack & Architecture Reference

> **Internal reference only.** Not a README.
>
> Last updated: 2026-02-15

---

## Services

| Service | Purpose | Dashboard | Env Var(s) |
|---------|---------|-----------|------------|
| **Clerk** | Auth (Google + email) | https://dashboard.clerk.com | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` |
| **Neon** | PostgreSQL database | https://console.neon.tech | `DATABASE_URL` |
| **Google Places API (New)** | Business search (Text Search) | https://console.cloud.google.com | `GOOGLE_PLACES_API_KEY` |
| **Google PageSpeed Insights** | Website quality scoring | (uses same Google API key) | `GOOGLE_PLACES_API_KEY` |
| **Anthropic** | Claude Sonnet — AI review analysis + pitch generation | https://console.anthropic.com | `ANTHROPIC_API_KEY` |
| **Vercel** | Hosting + Serverless | https://vercel.com/egertv1s-projects/lead-radar | *(deployment platform)* |
| **GitHub** | Source code | https://github.com/keeltekool/lead-radar | *(no env var)* |

---

## URLs

| Environment | URL |
|-------------|-----|
| **Production** | https://lead-radar-two.vercel.app |
| **Local dev** | http://localhost:3002 |
| **GitHub repo** | https://github.com/keeltekool/lead-radar |
| **Vercel project** | https://vercel.com/egertv1s-projects/lead-radar |

---

## Env Vars

All stored in `.env.local` (local) and Vercel (production).

| Variable | Service | Scope |
|----------|---------|-------|
| `GOOGLE_PLACES_API_KEY` | Google Places + PageSpeed | Server |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Client |
| `CLERK_SECRET_KEY` | Clerk | Server |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk | Client |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk | Client |
| `DATABASE_URL` | Neon PostgreSQL | Server |
| `ANTHROPIC_API_KEY` | Anthropic Claude | Server |

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x |
| Fonts | DM Sans (body) + JetBrains Mono (scores/numbers) | Google Fonts via next/font |
| Auth | Clerk (@clerk/nextjs) | 6.37.4 |
| Database | Neon PostgreSQL (serverless) | — |
| ORM | Drizzle ORM | 0.45.1 |
| AI | Anthropic Claude Sonnet (@anthropic-ai/sdk) | 0.74.0 |
| i18n | next-intl (ET/EN, default: ET) | 4.8.2 |
| Markdown | react-markdown | 10.1.0 |
| Deployment | Vercel | — |
| Branch | master | — |

---

## Architecture

```
Browser → Clerk Auth → Next.js App Router
                           │
                ┌──────────┼──────────────┐
                │          │              │
         /api/search  /api/lead/[id]  /api/leads
              │            │              │
    Google Places API   PageSpeed +    Neon DB
                        Scraping +     (Drizzle)
                        Claude AI
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (fonts, Clerk, metadata)
│   ├── globals.css                       # Tailwind v4 theme (teal palette)
│   ├── [locale]/
│   │   ├── layout.tsx                    # Locale layout (navbar, next-intl)
│   │   ├── page.tsx                      # Search page (home)
│   │   ├── dashboard/page.tsx            # Saved leads table
│   │   ├── lead/[placeId]/page.tsx       # Lead detail + AI analysis
│   │   ├── sign-in/[[...sign-in]]/       # Clerk sign-in
│   │   └── sign-up/[[...sign-up]]/       # Clerk sign-up
│   └── api/
│       ├── search/route.ts               # Google Places Text Search proxy
│       ├── lead/[placeId]/route.ts       # PageSpeed + email scraping
│       ├── lead/[placeId]/analyze/route.ts # Claude AI analysis (SSE)
│       ├── leads/route.ts                # CRUD saved leads
│       ├── leads/export/route.ts         # CSV export
│       └── photo/route.ts               # Google Places photo proxy
├── components/
│   ├── navbar.tsx                        # Top nav with LeadRadarLogo
│   ├── search-filters.tsx                # Industry/city/freetext filters
│   ├── lead-card.tsx                     # Search result card
│   ├── LeadRadarLogo.tsx                 # Brand logo component (SVG)
│   └── language-switcher.tsx             # ET/EN toggle
├── data/
│   └── industries.ts                     # Industry list + Estonian cities
├── db/
│   ├── index.ts                          # Drizzle + Neon connection
│   └── schema.ts                         # DB schema (saved_leads, lead_analyses)
├── i18n/
│   ├── routing.ts                        # next-intl routing config
│   └── request.ts                        # next-intl request handler
├── lib/
│   ├── scoring.ts                        # Lead scoring engine (5 factors, 0-100)
│   ├── scrape-emails.ts                  # Website email extraction
│   └── brand.ts                          # Brand constants (colors, fonts)
├── types/
│   └── lead.ts                           # PlaceResult, LeadScoreBreakdown types
└── middleware.ts                          # next-intl locale middleware
```

---

## DB Schema

### `saved_leads`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | varchar(255) | Clerk user ID |
| place_id | varchar(255) | Google Places ID |
| name | text | Business name |
| primary_type | varchar(100) | Business type |
| formatted_address | text | Full address |
| phone | varchar(50) | Phone number |
| website_url | text | Website URL (nullable) |
| rating | numeric(3,1) | Google rating |
| review_count | integer | Number of reviews |
| lead_score | integer | Computed score 0-100 |
| photos_count | integer | Google profile photos |
| has_hours | boolean | Has opening hours |
| business_status | varchar(50) | OPERATIONAL etc. |
| location_lat/lng | numeric(10,7) | Coordinates |
| raw_places_data | jsonb | Full API response |
| emails | jsonb (string[]) | Scraped emails |
| notes | text | User notes |
| created_at / updated_at | timestamp | Auto timestamps |

**Indexes:** unique(user_id, place_id), user_id, created_at

### `lead_analyses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| place_id | varchar(255) | Google Places ID |
| user_id | varchar(255) | Clerk user ID |
| pagespeed_performance | integer | PageSpeed perf score |
| pagespeed_seo | integer | PageSpeed SEO score |
| pagespeed_accessibility | integer | PageSpeed a11y score |
| emails_found | jsonb | Extracted emails |
| social_links | jsonb | Social media URLs |
| site_copyright_year | integer | Copyright year |
| review_summary | text | AI-generated summary |
| ai_pitch | text | AI-generated outreach pitch |
| raw_pagespeed_data | jsonb | Full PageSpeed response |
| created_at | timestamp | Auto timestamp |

**Indexes:** place_id, user_id

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/search?q=...&location=...` | No | Proxy Google Places Text Search |
| GET | `/api/lead/[placeId]` | No | Fetch PageSpeed + scrape emails |
| POST | `/api/lead/[placeId]/analyze` | Yes | Claude AI review analysis + pitch (SSE stream) |
| GET | `/api/leads` | Yes | List user's saved leads |
| POST | `/api/leads` | Yes | Save a lead |
| DELETE | `/api/leads` | Yes | Delete lead(s) — single `placeId` or bulk `placeIds[]` |
| GET | `/api/leads/export` | Yes | CSV export of saved leads |
| GET | `/api/photo?name=...&maxWidth=...` | No | Google Places photo proxy |

---

## Auth Flow

1. Clerk handles sign-in/sign-up (Google OAuth + email)
2. `@clerk/nextjs` middleware protects locale routes
3. API routes use `auth()` from `@clerk/nextjs/server` to get `userId`
4. Public routes: search, lead detail (read-only)
5. Protected routes: save/delete leads, AI analysis, dashboard, CSV export

---

## Lead Scoring Engine

5-factor scoring model, max 100 points. Client-side calculation in `src/lib/scoring.ts`.

| Factor | Max Pts | Logic |
|--------|---------|-------|
| Website Status | 25 | Has website + poor PageSpeed = high score |
| Google Profile | 25 | Missing photos/hours/phone/summary = higher |
| Review Health | 25 | Rating 3.0-4.2 + few reviews = sweet spot |
| Contactability | 15 | Email found +10, phone +5 |
| Service Fit | 10 | Service area business +5, target vertical +5 |

**Score tiers:** Hot 70+ (teal), Warm 40-69 (amber), Cold 0-39 (slate)

---

## Brand / Design

"Midnight Teal" design system — custom brand kit in `Lead_Radar_Brand/`.

| Token | Value |
|-------|-------|
| Primary dark | `teal-950` (#0F2B2E) |
| Main accent | `teal-500` (#14B8A6) |
| Warm accent | `amber-600` (#D97706) — warm scores only |
| Body font | DM Sans (400-800) |
| Mono font | JetBrains Mono (scores, stats) |
| Card radius | rounded-xl (12px) |
| Button radius | rounded-lg (8px) |
| Card shadow | teal-tinted `shadow-card` |

---

## Gotchas

| Issue | Fix |
|-------|-----|
| Turbopack font bug (DM Sans) | Always use `--webpack` flag: `next dev -p 3002 --webpack` |
| Google Places photo URLs expire | Proxy through `/api/photo` route, don't store URLs |
| PageSpeed API rate limits | Cache results in `lead_analyses` table |
| Score thresholds changed from 60/30 to 70/40 | Updated in scoring.ts, dashboard filters, and brand spec |

---

## Deployment

```bash
# Local dev
npx next dev -p 3002 --webpack

# Production build
npx next build

# Deploy to Vercel
npx vercel --prod

# Database migrations
npx drizzle-kit generate
npx drizzle-kit push
```
