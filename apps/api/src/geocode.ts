import type { DB } from "./db";
import { config } from "./config";
import { fetchText, sleep } from "./http";

export interface GeoResult {
  lat: number;
  lng: number;
  city: string | null;
  countryCode: string | null;
}

interface NominatimHit {
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

let lastCall = 0;

async function nominatim(query: string, countryCode?: string | null): Promise<GeoResult | null> {
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
    "accept-language": "en",
  });
  if (countryCode) params.set("countrycodes", countryCode.toLowerCase());
  if (config.nominatimEmail) params.set("email", config.nominatimEmail);

  const body = await fetchText(`https://nominatim.openstreetmap.org/search?${params}`);
  const hits = JSON.parse(body) as NominatimHit[];
  const hit = hits[0];
  if (!hit) return null;
  const a = hit.address ?? {};
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null,
    countryCode: a.country_code ? a.country_code.toUpperCase() : null,
  };
}

/** Geocodes with a persistent cache (negative results included) so Nominatim is hit at most once per query. */
export async function geocode(db: DB, query: string, countryCode?: string | null): Promise<GeoResult | null> {
  const key = `${countryCode ?? ""}|${query.toLowerCase().trim()}`;
  const cached = db
    .prepare("SELECT lat, lng, city, country_code FROM geocode_cache WHERE query_key = ?")
    .get(key) as { lat: number | null; lng: number | null; city: string | null; country_code: string | null } | undefined;
  if (cached) {
    return cached.lat === null || cached.lng === null
      ? null
      : { lat: cached.lat, lng: cached.lng, city: cached.city, countryCode: cached.country_code };
  }

  let result: GeoResult | null = null;
  try {
    result = await nominatim(query, countryCode);
  } catch (err) {
    console.warn(`[geocode] failed for "${query}":`, (err as Error).message);
    return null;
  }
  db.prepare(
    "INSERT OR REPLACE INTO geocode_cache (query_key, lat, lng, city, country_code) VALUES (?, ?, ?, ?, ?)",
  ).run(key, result?.lat ?? null, result?.lng ?? null, result?.city ?? null, result?.countryCode ?? null);
  return result;
}

/** Tries progressively looser queries until one resolves. */
export async function geocodeVenue(
  db: DB,
  parts: { venue?: string | null; address?: string | null; place?: string | null; country?: string | null },
  countryCode?: string | null,
): Promise<GeoResult | null> {
  const withCountry = (s: string | null | undefined) => [s, parts.country].filter(Boolean).join(", ");
  // Drop parenthesised (often non-latin) names: "Aichi Sky Expo (愛知県国際展示場)".
  const cleanVenue = parts.venue?.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim() || null;
  const postalCity = parts.address
    ? /\b(\d{4,5})\s+([\p{L}][\p{L}' -]*?)(?=\s+\d|,|$)/u.exec(parts.address)
    : null;

  const queries = [
    parts.place ? withCountry(parts.place) : "",
    [parts.venue, parts.address].filter(Boolean).join(", "),
    parts.address ?? "",
    withCountry(cleanVenue),
    withCountry(cleanVenue?.split(",")[0]?.trim()),
    postalCity ? withCountry(`${postalCity[1]} ${postalCity[2]}`) : "",
  ].filter((q, i, all) => q && all.indexOf(q) === i);

  for (const q of queries) {
    const r = await geocode(db, q, countryCode);
    if (r) return r;
  }
  return null;
}
