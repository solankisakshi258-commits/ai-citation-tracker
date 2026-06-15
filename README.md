# AI Citation Tracker — Module 1

Track **Google AI Overview citations** for keywords and compare them against
**organic search rankings**.

> For a given keyword: *which websites are cited by Google AI Overview, and how
> does that compare with the normal organic search results?*

This repository contains **Module 1 only** — data collection and storage. No
content analysis, competitor analysis, AI scoring, recommendations, or
optimization features are included by design.

---

## What it does

For every keyword:

1. Collect Google **AI Overview** data via [SerpApi](https://serpapi.com/google-ai-overview-api)
   (present/absent, overview text, citation URLs + domains).
2. Collect the top-20 **organic SERP** results via [DataForSEO](https://dataforseo.com/apis/serp-api)
   (position, URL, domain, title).
3. Store everything in **PostgreSQL** (via Prisma).
4. Show a **dashboard** with headline stats and recent activity.
5. Show a **keyword detail page** with a domain-by-domain comparison table.
6. Run a **daily cron** that re-collects every keyword.

---

## Tech stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Frontend   | Next.js 15 (App Router), React 19, TS   |
| Styling    | Tailwind CSS + shadcn/ui                |
| Backend    | Next.js API Routes (TypeScript)         |
| Database   | PostgreSQL                              |
| ORM        | Prisma                                  |
| Scheduling | Vercel Cron                             |
| Deployment | GitHub + Vercel                         |

---

## Project structure

```
ai-citation-tracker/
├─ prisma/
│  └─ schema.prisma            # keywords, ai_overviews, citations, organic_rankings, jobs
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx            # shell + nav
│  │  ├─ page.tsx              # redirects to /dashboard
│  │  ├─ globals.css
│  │  ├─ dashboard/page.tsx    # stats + recent activity
│  │  ├─ keywords/page.tsx     # add + manage keywords
│  │  ├─ keyword/[id]/page.tsx # detail + comparison table
│  │  └─ api/
│  │     ├─ keywords/route.ts          # GET list, POST create
│  │     ├─ keywords/bulk/route.ts     # POST bulk create
│  │     ├─ keyword/[id]/route.ts      # GET detail, DELETE
│  │     ├─ collect/[id]/route.ts      # POST run collection
│  │     ├─ dashboard/route.ts         # GET stats
│  │     └─ cron/route.ts              # GET daily batch (secured)
│  ├─ components/
│  │  ├─ ui/                   # shadcn primitives (button, card, table, …)
│  │  ├─ keyword-form.tsx      # single / bulk / CSV add (client)
│  │  ├─ keyword-list.tsx      # table with collect + delete (client)
│  │  ├─ comparison-table.tsx  # organic rank vs AI citation
│  │  ├─ collect-button.tsx
│  │  ├─ job-status-badge.tsx
│  │  └─ market-select.tsx
│  ├─ lib/
│  │  ├─ prisma.ts             # singleton client
│  │  ├─ env.ts                # validated env access
│  │  ├─ logger.ts             # structured logging
│  │  ├─ api.ts                # response envelopes + error handler
│  │  ├─ validation.ts         # zod schemas
│  │  ├─ queries.ts            # dashboard + detail read models
│  │  └─ utils.ts              # cn(), extractDomain(), formatDate()
│  ├─ services/
│  │  ├─ serpapi.ts            # AI Overview fetch + normalize
│  │  ├─ dataforseo.ts         # organic SERP fetch + normalize
│  │  └─ collector.ts          # orchestrates + persists + job tracking
│  └─ types/index.ts
├─ .env.example
├─ vercel.json                 # daily cron at 03:30 UTC (09:00 IST)
└─ package.json
```

---

## Database schema

| Table              | Key columns                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `keywords`         | id, keyword, country, language, created_at                                  |
| `ai_overviews`     | id, keyword_id, ai_overview_present, overview_text, created_at              |
| `citations`        | id, keyword_id, citation_url, citation_domain, created_at                   |
| `organic_rankings` | id, keyword_id, position, url, domain, title, created_at                    |
| `jobs`             | id, keyword_id, status, error, started_at, completed_at, created_at         |

**Snapshot semantics:** each collection run replaces a keyword's previous AI
overview, citations and organic rankings, so the detail page always reflects the
latest data. The `jobs` table preserves run history.

---

## Local setup

### 0. Prerequisites

- **Node.js 18.18+** (Node 20 LTS recommended) — https://nodejs.org
- **PostgreSQL 14+** running locally, or a hosted instance
  (Neon / Supabase / Vercel Postgres).

### 1. Install dependencies

```bash
cd ai-citation-tracker
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_citation_tracker?schema=public"
SERPAPI_API_KEY="your-serpapi-key"
DATAFORSEO_LOGIN="your-dataforseo-login"
DATAFORSEO_PASSWORD="your-dataforseo-password"
CRON_SECRET="any-long-random-string"
```

- SerpApi key: https://serpapi.com/manage-api-key
- DataForSEO credentials: https://app.dataforseo.com/api-access

### 3. Create the database schema

```bash
npm run db:migrate    # creates tables via a dev migration
# or, without migration history:
npm run db:push
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000 → redirects to `/dashboard`.

---

## Usage

1. Go to **/keywords**.
2. Add a keyword (single), paste a list (bulk), or upload a CSV.
3. Click **Collect** on a row to fetch AI Overview + organic data.
4. Open the keyword to see the **comparison table**:

   | Domain        | Organic Rank | AI Citation |
   | ------------- | ------------ | ----------- |
   | cardekho.com  | 1            | Yes         |
   | carwale.com   | 2            | Yes         |
   | carlelo.com   | 3            | No          |

---

## API reference

All responses use the envelope `{ "success": boolean, "data"?: T, "error"?: string }`.

| Method | Endpoint               | Description                          |
| ------ | ---------------------- | ------------------------------------ |
| GET    | `/api/keywords`        | List keywords + collection counts    |
| POST   | `/api/keywords`        | Create one keyword                   |
| POST   | `/api/keywords/bulk`   | Create many keywords (skip dupes)    |
| GET    | `/api/keyword/:id`     | Full detail + comparison table       |
| DELETE | `/api/keyword/:id`     | Delete a keyword and its data        |
| POST   | `/api/collect/:id`     | Run a collection for one keyword     |
| GET    | `/api/dashboard`       | Headline stats + recent activity     |
| GET    | `/api/cron`            | Daily batch collection (secured)     |

### Examples

```bash
# Create a keyword
curl -X POST http://localhost:3000/api/keywords \
  -H "Content-Type: application/json" \
  -d '{"keyword":"best suv under 15 lakh","country":"in","language":"en"}'

# Bulk add
curl -X POST http://localhost:3000/api/keywords/bulk \
  -H "Content-Type: application/json" \
  -d '{"keywords":["brezza review","hyundai creta price"],"country":"in","language":"en"}'

# Run collection
curl -X POST http://localhost:3000/api/collect/<keyword-id>

# Trigger cron manually
curl http://localhost:3000/api/cron -H "Authorization: Bearer <CRON_SECRET>"
```

---

## Cron / daily collection

Configured in [`vercel.json`](./vercel.json):

```json
{ "crons": [{ "path": "/api/cron", "schedule": "30 3 * * *" }] }
```

`30 3 * * *` UTC = **09:00 IST**. Vercel automatically attaches
`Authorization: Bearer $CRON_SECRET`; the endpoint rejects requests without it.

> Vercel Cron is available on Hobby (1 cron, daily) and Pro plans. For
> sub-daily schedules use a Pro plan or an external scheduler hitting
> `/api/cron` with the bearer token.

---

## GitHub setup

```bash
cd ai-citation-tracker
git init
git add .
git commit -m "Module 1: AI Citation Tracker data collection & storage"
git branch -M main
git remote add origin https://github.com/<you>/ai-citation-tracker.git
git push -u origin main
```

`.env` is git-ignored — never commit secrets.

---

## Vercel deployment

1. Push to GitHub (above).
2. In Vercel → **Add New → Project** → import the repo.
3. **Environment Variables** — add all of:
   - `DATABASE_URL` (use a pooled connection string for serverless, e.g. Neon
     pooler / Supabase pgBouncer / Vercel Postgres)
   - `SERPAPI_API_KEY`
   - `DATAFORSEO_LOGIN`
   - `DATAFORSEO_PASSWORD`
   - `CRON_SECRET`
4. The build command is `prisma generate && next build` (already set in
   `package.json`).
5. Run the migration against the production database once:
   ```bash
   # locally, with prod DATABASE_URL exported
   npx prisma migrate deploy
   ```
6. Deploy. Vercel registers the cron from `vercel.json` automatically.

### Notes for serverless Postgres

- Always use a **connection-pooled** `DATABASE_URL` on Vercel to avoid
  exhausting connections. With Prisma + Neon/Supabase, append
  `?pgbouncer=true&connection_limit=1` (or use the provider's pooled host).
- For migrations, use the **direct** (non-pooled) URL; you can add a
  `directUrl` to `schema.prisma` if your provider requires it.

---

## Scripts

| Script             | Action                              |
| ------------------ | ----------------------------------- |
| `npm run dev`      | Start dev server                    |
| `npm run build`    | `prisma generate` + `next build`    |
| `npm start`        | Start production server             |
| `npm run db:migrate` | Create/apply dev migration        |
| `npm run db:deploy`  | Apply migrations (production)      |
| `npm run db:push`    | Push schema without migrations     |
| `npm run db:studio`  | Open Prisma Studio                 |

---

## Scope boundary (intentional)

Module 1 stops at **data collection and storage**. The following are explicitly
**not** built: content analysis, competitor analysis, AI scoring,
recommendations, AI optimization, content-gap analysis, EEAT analysis, schema
analysis.
