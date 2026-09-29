export const GENRES = [
  "battle",
  "show",
  "workshop",
  "conference",
  "festival",
  "jam",
  "competition",
  "camp",
  "other",
] as const;
export type Genre = (typeof GENRES)[number];

export const STYLES = [
  "hip-hop",
  "all-style",
  "breaking",
  "popping",
  "locking",
  "electro",
  "waacking",
  "house",
  "krump",
  "dancehall",
  "afro",
] as const;
export type Style = (typeof STYLES)[number];

export const DATE_PRESETS = ["all", "month", "3months", "year"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export interface EventDTO {
  id: string;
  title: string;
  genre: Genre;
  styles: Style[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string | null; // HH:mm
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null; // ISO 3166-1 alpha-2, upper-case
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  sourceName: string;
  sourceUrl: string;
  distanceKm?: number;
}

export interface EventsResponse {
  total: number;
  items: EventDTO[];
}

export interface EventsQuery {
  from?: string;
  to?: string;
  genres?: Genre[];
  styles?: Style[];
  q?: string;
  country?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  hasCoords?: boolean;
  limit?: number;
  offset?: number;
}

export function isGenre(v: string): v is Genre {
  return (GENRES as readonly string[]).includes(v);
}
export function isStyle(v: string): v is Style {
  return (STYLES as readonly string[]).includes(v);
}

const pad = (n: number) => String(n).padStart(2, "0");
export function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Resolves a UI date preset into an inclusive [from, to] ISO date range (UTC based). */
export function resolveDateRange(
  preset: DatePreset,
  year?: number,
  now: Date = new Date(),
): { from?: string; to?: string } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (preset === "month") {
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
    return { from: toISODate(today), to: toISODate(end) };
  }
  if (preset === "3months") {
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 3, today.getUTCDate()));
    return { from: toISODate(today), to: toISODate(end) };
  }
  if (preset === "year" && year) {
    const from = year === today.getUTCFullYear() ? toISODate(today) : `${year}-01-01`;
    return { from, to: `${year}-12-31` };
  }
  return { from: toISODate(today) };
}
