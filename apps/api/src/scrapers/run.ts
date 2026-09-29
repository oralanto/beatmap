import { toISODate } from "@beatmap/shared";
import { config } from "../config";
import type { DB } from "../db";
import { geocodeVenue } from "../geocode";
import { fetchText, sleep } from "../http";
import { EventsRepo } from "../repo";
import { AND8_SOURCE, parseDetail, parseListing } from "./and8";

const LIST_URL = "https://and8.dance/en/events";
const DETAIL_TTL_MS = 24 * 3600 * 1000;

export interface ScrapeStats {
  listed: number;
  detailed: number;
  geocoded: number;
  removed: number;
}

/** SQLite `datetime('now')` is UTC without a timezone marker. */
const parseSqlDate = (s: string) => new Date(s.replace(" ", "T") + "Z").getTime();

export async function scrapeAnd8(db: DB, log: (msg: string) => void = console.log): Promise<ScrapeStats> {
  const repo = new EventsRepo(db);
  const stats: ScrapeStats = { listed: 0, detailed: 0, geocoded: 0, removed: 0 };

  const listed = parseListing(await fetchText(LIST_URL));
  stats.listed = listed.length;
  log(`[and8] ${listed.length} events in listing`);
  if (listed.length === 0) throw new Error("Listing parsed to 0 events, the site markup probably changed");

  for (const ev of listed) {
    const state = repo.getScrapeState(AND8_SOURCE, ev.externalId);
    // Events without coordinates are retried each run (failed geocodes are cached, so this is cheap).
    const stale =
      !state?.fetchedAt || !state.hasCoords || Date.now() - parseSqlDate(state.fetchedAt) > DETAIL_TTL_MS;

    if (!stale) {
      repo.touch(AND8_SOURCE, ev.externalId);
      continue;
    }

    try {
      await sleep(config.requestDelayMs);
      const detail = parseDetail(await fetchText(ev.url), ev);
      stats.detailed++;

      const countryCode = detail.countryCode ?? ev.countryCode;
      const geo = await geocodeVenue(
        db,
        { venue: detail.venue, address: detail.address, place: detail.place, country: detail.country },
        countryCode,
      );
      if (geo) stats.geocoded++;

      repo.upsert({
        source: AND8_SOURCE,
        externalId: ev.externalId,
        title: ev.title,
        genre: detail.genre,
        styles: detail.styles,
        startDate: ev.startDate,
        endDate: ev.endDate,
        startTime: detail.startTime,
        venue: detail.venue ?? ev.venue,
        address: detail.address,
        city: geo?.city ?? detail.place,
        country: detail.country,
        countryCode,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        sourceUrl: ev.url,
        detailFetched: true,
      });
      log(`[and8] ${ev.externalId} ${ev.title} ${geo ? "📍" : "(no coords)"}`);
    } catch (err) {
      log(`[and8] failed ${ev.externalId}: ${(err as Error).message}`);
    }
  }

  stats.removed = repo.removeMissing(AND8_SOURCE, listed.map((l) => l.externalId), toISODate(new Date()));
  log(`[and8] done: ${JSON.stringify(stats)}`);
  return stats;
}
