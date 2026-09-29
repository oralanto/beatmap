# 🎧 BeatMap

**Find hip-hop & street dance events — battles, workshops, shows, conferences — as a modern card list or on an interactive map, near you and around the world.**

- 🗂️ **Card list** (home page) with instant filters, each card links to the event page
- 🗺️ **Interactive map** (MapLibre) with clustering, "Around me" geolocation + radius, popup card → event page
- 🔎 **Filters** shared by list and map: **date** (this month / next 3 months / by year), **type** (battle, show, workshop, conference, festival, jam, competition, camp…), **dance style** (hip-hop, all-style, breaking, popping, locking, electro, waacking, house, krump, dancehall, afro), free-text search
- 🌍 **One-click translation**: English (US, default), Français, Deutsch
- 📱 **Responsive**: sidebar filters on desktop, bottom-sheet filters and touch-friendly map on mobile
- 🤖 **Fully automated data**: events are scraped, classified (type + styles) and geocoded automatically — no manual entry
- 📅 Add-to-calendar (`.ics`) on every event, SEO-friendly event pages with JSON-LD

## Tech stack

| Layer | Choice |
| --- | --- |
| Front | Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · next-intl · MapLibre GL JS |
| Back | Node.js · Fastify 5 · zod · cheerio |
| Database | SQLite (`better-sqlite3`) — zero-config; see [Going to production](#going-to-production) for PostgreSQL/PostGIS |
| Geocoding | Nominatim (OpenStreetMap), cached in the DB |
| Map tiles | [OpenFreeMap](https://openfreemap.org) (free, no API key) — any MapLibre style URL works |
| Tooling | npm workspaces · TypeScript · Vitest · ESLint · GitHub Actions |

## Quick start

Requirements: **Node.js ≥ 20.9** (22+ recommended).

```bash
git clone https://github.com/oralanto/beatmap.git
cd beatmap
npm install
cp .env.example .env      # edit NOMINATIM_EMAIL + SCRAPER_USER_AGENT with your contact info
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000 (e.g. `/api/events?genre=battle&style=breaking`)

On first start the API scrapes the sources in the background (about 3–5 minutes including geocoding, ~1 request/second to stay polite). Refresh the page as events come in. You can also run it manually with `npm run scrape`.

### Useful commands

```bash
npm run dev        # API + web with hot reload
npm run build      # production build of both apps
npm start          # run the production build
npm run scrape     # run one scrape now
npm test           # unit tests (classification, parsers)
npm run typecheck
npm run lint
```

## Configuration

Copy `.env.example` to `.env` at the repository root.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `DATABASE_PATH` | `./data/events.db` | SQLite file (relative to `apps/api`) |
| `SCRAPER_ENABLED` | `true` | Set to `false` to disable all scraping (see [legal notice](#data-sources--legal-notice)) |
| `SCRAPE_INTERVAL_HOURS` | `12` | How often the API refreshes data |
| `SCRAPER_USER_AGENT` | BeatMapBot | Identify your bot with real contact info |
| `SCRAPER_DELAY_MS` | `1200` | Delay between requests to a source |
| `NOMINATIM_EMAIL` | – | Contact e-mail sent to Nominatim (their usage policy) |
| `API_URL` | `http://localhost:4000` | Where the Next.js server proxies `/api/*` |
| `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_URL` | `BeatMap` / localhost | Branding & canonical URLs |
| `NEXT_PUBLIC_MAP_STYLE_URL` | OpenFreeMap positron | Any MapLibre-compatible style |

## Architecture

```
apps/
  api/   Fastify REST API + scrapers + SQLite
    src/scrapers/   source scrapers (and8.dance) + orchestration
    src/classify.ts genre/style detection from title & description
    src/geocode.ts  Nominatim geocoder with cache and fallback queries
    src/repo.ts     queries: filters, proximity (haversine), meta
  web/   Next.js front (App Router, i18n routes /, /fr, /de)
    src/components/ EventCard, Filters (URL-driven), MapExplorer, ...
    src/messages/   en.json · fr.json · de.json
packages/
  shared/  types & constants shared by API and web (genres, styles, date ranges)
```

Filters live in the **URL** (`?when=3months&genre=battle&style=breaking,popping`), so every view is shareable and the list and map behave identically.

### API

| Endpoint | Description |
| --- | --- |
| `GET /api/events` | List events. Query: `from`, `to`, `genre` (csv), `style` (csv), `q`, `country`, `lat`+`lng`+`radiusKm`, `hasCoords`, `limit`, `offset` |
| `GET /api/events/:id` | One event |
| `GET /api/events/:id/calendar.ics` | iCalendar file |
| `GET /api/meta` | Facets (counts per genre/style/country, available years) |
| `GET /health` | Health check |

### Adding a language

Copy `apps/web/src/messages/en.json` to `<locale>.json`, then add the locale in `apps/web/src/i18n/routing.ts` and to the `LanguageSwitcher`.

### Adding a source

A scraper is a function that returns normalised events (`title`, dates, venue, address, coordinates, source URL). Look at `apps/api/src/scrapers/and8.ts`, add yours, and call it from `scrapers/run.ts`. Classification and geocoding are shared.

## Data sources & legal notice

Currently implemented source: **[and8.dance](https://and8.dance)** (public event calendar).

> ⚠️ **Read this before deploying publicly.** and8.dance's imprint states that use of its photos and texts, and their inclusion in electronic databases, requires prior written consent from its operator (cc7 GmbH, office@and8.dance). Its `robots.txt` does not disallow crawling, but that does not replace permission.
>
> BeatMap therefore applies these safeguards: polite rate limiting, a descriptive User-Agent, storing **only factual data** (title, dates, venue, address, coordinates), **no images and no descriptions** stored or displayed, and a visible attribution with a link back to the source on every event. The scraper is **enabled by default in this repository** by the maintainer's choice, who accepts the associated risk. **If you deploy your own instance, you are responsible for obtaining the necessary permissions** — or set `SCRAPER_ENABLED=false` and feed the database from sources you are allowed to use (partnerships, organiser submissions, official APIs).

Geocoding uses Nominatim (© OpenStreetMap contributors, ODbL). Map data © OpenStreetMap contributors, tiles by OpenFreeMap / OpenMapTiles.

## Going to production

- **Web**: deploy `apps/web` on Vercel/any Node host (`API_URL` must point to the API).
- **API**: run `npm run build -w @beatmap/api && npm run start -w @beatmap/api` on a small VM/container with a persistent volume for the SQLite file.
- **Scaling**: swap SQLite for **PostgreSQL + PostGIS** (`ST_DWithin` for proximity) — all SQL is isolated in `apps/api/src/repo.ts` and `db.ts`.

## Roadmap

- [ ] More sources (Eventbrite, Facebook/Instagram via official APIs, organiser feeds)
- [ ] Organiser submission form + moderation
- [ ] Deduplication across sources
- [ ] Dark mode, favourites, e-mail/push alerts for a city or style
- [ ] PostgreSQL/PostGIS & Docker Compose
- [ ] PWA / native app (Expo)

## Contributing

Issues and PRs are welcome. Please run `npm run typecheck && npm run lint && npm test` before opening a PR.

## License

[MIT](./LICENSE) — this covers the code only. Event data belongs to its respective sources.
