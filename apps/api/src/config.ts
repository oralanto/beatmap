import path from "node:path";

try {
  process.loadEnvFile(path.resolve(process.cwd(), "../../.env"));
} catch {
  /* no .env file, rely on process environment */
}

const bool = (v: string | undefined, fallback: boolean) =>
  v === undefined ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase());

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "./data/events.db"),
  scraperEnabled: bool(process.env.SCRAPER_ENABLED, true),
  scrapeIntervalHours: Number(process.env.SCRAPE_INTERVAL_HOURS ?? 12),
  userAgent:
    process.env.SCRAPER_USER_AGENT ??
    "BeatMapBot/0.1 (+https://github.com/oralanto/beatmap; open source event aggregator)",
  nominatimEmail: process.env.NOMINATIM_EMAIL,
  requestDelayMs: Number(process.env.SCRAPER_DELAY_MS ?? 1200),
};
