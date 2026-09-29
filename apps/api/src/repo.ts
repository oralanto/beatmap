import type { EventDTO, EventsQuery, Genre, Style } from "@beatmap/shared";
import type { DB } from "./db";

interface Row {
  id: string;
  title: string;
  genre: Genre;
  start_date: string;
  end_date: string;
  start_time: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  source: string;
  source_url: string;
}

export const SOURCE_NAMES: Record<string, string> = { and8: "and8.dance" };

export interface UpsertEvent {
  source: string;
  externalId: string;
  title: string;
  genre: Genre;
  styles: Style[];
  startDate: string;
  endDate: string;
  startTime: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  imageUrl?: string | null;
  sourceUrl: string;
  detailFetched: boolean;
}

export function toRad(d: number) {
  return (d * Math.PI) / 180;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function eventId(source: string, externalId: string) {
  return `${source}-${externalId}`;
}

export class EventsRepo {
  constructor(private db: DB) {}

  upsert(e: UpsertEvent): void {
    const id = eventId(e.source, e.externalId);
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO events (id, source, external_id, title, genre, start_date, end_date, start_time, venue, address, city,
             country, country_code, lat, lng, image_url, source_url, detail_fetched_at, last_seen_at)
           VALUES (@id, @source, @externalId, @title, @genre, @startDate, @endDate, @startTime, @venue, @address, @city,
             @country, @countryCode, @lat, @lng, @imageUrl, @sourceUrl, CASE WHEN @detailFetched THEN datetime('now') END, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title, genre = excluded.genre, start_date = excluded.start_date, end_date = excluded.end_date,
             start_time = excluded.start_time, venue = excluded.venue, address = excluded.address, city = excluded.city,
             country = excluded.country, country_code = excluded.country_code, lat = excluded.lat, lng = excluded.lng,
             image_url = excluded.image_url, source_url = excluded.source_url,
             detail_fetched_at = COALESCE(excluded.detail_fetched_at, events.detail_fetched_at),
             last_seen_at = datetime('now'), updated_at = datetime('now')`,
        )
        .run({ ...e, id, imageUrl: e.imageUrl ?? null, detailFetched: e.detailFetched ? 1 : 0 });
      this.db.prepare("DELETE FROM event_styles WHERE event_id = ?").run(id);
      const ins = this.db.prepare("INSERT OR IGNORE INTO event_styles (event_id, style) VALUES (?, ?)");
      for (const s of e.styles) ins.run(id, s);
    });
    tx();
  }

  touch(source: string, externalId: string): void {
    this.db
      .prepare("UPDATE events SET last_seen_at = datetime('now') WHERE id = ?")
      .run(eventId(source, externalId));
  }

  getScrapeState(source: string, externalId: string): { fetchedAt: string | null; hasCoords: boolean } | null {
    const row = this.db
      .prepare("SELECT detail_fetched_at AS d, lat IS NOT NULL AS c FROM events WHERE id = ?")
      .get(eventId(source, externalId)) as { d: string | null; c: number } | undefined;
    return row ? { fetchedAt: row.d, hasCoords: !!row.c } : null;
  }

  /** Removes future events of a source that vanished from its listing (cancelled / deleted). */
  removeMissing(source: string, seenExternalIds: string[], today: string): number {
    const seen = new Set(seenExternalIds.map((x) => eventId(source, x)));
    const rows = this.db
      .prepare("SELECT id FROM events WHERE source = ? AND end_date >= ?")
      .all(source, today) as { id: string }[];
    const del = this.db.prepare("DELETE FROM events WHERE id = ?");
    let n = 0;
    for (const r of rows) if (!seen.has(r.id)) n += del.run(r.id).changes;
    return n;
  }

  private stylesFor(ids: string[]): Map<string, Style[]> {
    const map = new Map<string, Style[]>();
    if (ids.length === 0) return map;
    const rows = this.db
      .prepare(`SELECT event_id, style FROM event_styles WHERE event_id IN (${ids.map(() => "?").join(",")})`)
      .all(...ids) as { event_id: string; style: Style }[];
    for (const r of rows) {
      const list = map.get(r.event_id) ?? [];
      list.push(r.style);
      map.set(r.event_id, list);
    }
    return map;
  }

  private toDTO(r: Row, styles: Style[]): EventDTO {
    return {
      id: r.id,
      title: r.title,
      genre: r.genre,
      styles,
      startDate: r.start_date,
      endDate: r.end_date,
      startTime: r.start_time,
      venue: r.venue,
      address: r.address,
      city: r.city,
      country: r.country,
      countryCode: r.country_code,
      lat: r.lat,
      lng: r.lng,
      imageUrl: r.image_url,
      sourceName: SOURCE_NAMES[r.source] ?? r.source,
      sourceUrl: r.source_url,
    };
  }

  get(id: string): EventDTO | null {
    const row = this.db.prepare("SELECT * FROM events WHERE id = ?").get(id) as Row | undefined;
    if (!row) return null;
    return this.toDTO(row, this.stylesFor([id]).get(id) ?? []);
  }

  list(q: EventsQuery): { total: number; items: EventDTO[] } {
    const where: string[] = [];
    const args: unknown[] = [];

    if (q.from) {
      where.push("e.end_date >= ?");
      args.push(q.from);
    }
    if (q.to) {
      where.push("e.start_date <= ?");
      args.push(q.to);
    }
    if (q.genres?.length) {
      where.push(`e.genre IN (${q.genres.map(() => "?").join(",")})`);
      args.push(...q.genres);
    }
    if (q.styles?.length) {
      where.push(
        `EXISTS (SELECT 1 FROM event_styles s WHERE s.event_id = e.id AND s.style IN (${q.styles.map(() => "?").join(",")}))`,
      );
      args.push(...q.styles);
    }
    if (q.country) {
      where.push("e.country_code = ?");
      args.push(q.country.toUpperCase());
    }
    if (q.q) {
      const like = `%${q.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push("(e.title LIKE ? ESCAPE '\\' OR e.venue LIKE ? ESCAPE '\\' OR e.city LIKE ? ESCAPE '\\')");
      args.push(like, like, like);
    }

    const nearby = q.lat !== undefined && q.lng !== undefined;
    if (q.hasCoords || nearby) where.push("e.lat IS NOT NULL AND e.lng IS NOT NULL");
    if (nearby && q.radiusKm) {
      const dLat = q.radiusKm / 111;
      const dLng = q.radiusKm / (111 * Math.max(Math.cos(toRad(q.lat!)), 0.01));
      where.push("e.lat BETWEEN ? AND ? AND e.lng BETWEEN ? AND ?");
      args.push(q.lat! - dLat, q.lat! + dLat, q.lng! - dLng, q.lng! + dLng);
    }

    const rows = this.db
      .prepare(
        `SELECT e.* FROM events e ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY e.start_date, e.title`,
      )
      .all(...args) as Row[];

    let entries = rows.map((r) => ({ r, d: nearby ? haversineKm(q.lat!, q.lng!, r.lat!, r.lng!) : undefined }));
    if (nearby) {
      if (q.radiusKm) entries = entries.filter((e) => e.d! <= q.radiusKm!);
      entries.sort((a, b) => a.d! - b.d! || a.r.start_date.localeCompare(b.r.start_date));
    }

    const total = entries.length;
    const offset = q.offset ?? 0;
    const page = entries.slice(offset, offset + (q.limit ?? 24));
    const styles = this.stylesFor(page.map((e) => e.r.id));
    const items = page.map((e) => {
      const dto = this.toDTO(e.r, styles.get(e.r.id) ?? []);
      if (e.d !== undefined) dto.distanceKm = Math.round(e.d * 10) / 10;
      return dto;
    });
    return { total, items };
  }

  meta(today: string) {
    const count = (col: string) =>
      this.db
        .prepare(`SELECT ${col} AS k, COUNT(*) AS n FROM events WHERE end_date >= ? AND ${col} IS NOT NULL GROUP BY ${col} ORDER BY n DESC`)
        .all(today) as { k: string; n: number }[];
    const styles = this.db
      .prepare(
        `SELECT s.style AS k, COUNT(*) AS n FROM event_styles s JOIN events e ON e.id = s.event_id WHERE e.end_date >= ? GROUP BY s.style`,
      )
      .all(today) as { k: string; n: number }[];
    const years = this.db
      .prepare(`SELECT DISTINCT substr(start_date, 1, 4) AS y FROM events WHERE end_date >= ? ORDER BY y`)
      .all(today) as { y: string }[];
    const total = (this.db.prepare("SELECT COUNT(*) AS n FROM events WHERE end_date >= ?").get(today) as { n: number }).n;
    const updated = this.db.prepare("SELECT MAX(updated_at) AS u FROM events").get() as { u: string | null };
    return {
      total,
      genres: Object.fromEntries(count("genre").map((r) => [r.k, r.n])),
      styles: Object.fromEntries(styles.map((r) => [r.k, r.n])),
      countries: count("country_code").map((r) => ({ code: r.k, count: r.n })),
      years: years.map((r) => Number(r.y)),
      updatedAt: updated.u,
    };
  }
}
