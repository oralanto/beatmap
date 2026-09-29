import * as cheerio from "cheerio";
import type { Genre, Style } from "@beatmap/shared";
import { classifyGenre, classifyStyles } from "../classify";

const BASE = "https://and8.dance";
export const AND8_SOURCE = "and8";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export interface ListedEvent {
  externalId: string;
  title: string;
  category: string | null;
  startDate: string;
  endDate: string;
  venue: string | null;
  countryCode: string | null;
  url: string;
}

export interface EventDetail {
  startTime: string | null;
  venue: string | null;
  address: string | null;
  /** Only a city / region is known ("the venue has not yet been announced"). */
  place: string | null;
  countryCode: string | null;
  country: string | null;
  styles: Style[];
  genre: Genre;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * The English listing renders dates as "Oct 2nd - 4th", "Jul 30th - Aug 1st 2027" (the year is only
 * present for events outside the current year). Without a year, pick the first one that puts the
 * date no more than a week in the past.
 */
export function inferDates(text: string, now: Date = new Date()): { startDate: string; endDate: string } | null {
  const tokens = [...text.matchAll(/(?:([A-Za-z]{3})\s+)?(\d{1,2})(?:st|nd|rd|th)\b/g)].map((m) => ({
    day: Number(m[2]),
    month: m[1] ? MONTHS.indexOf(m[1].toLowerCase()) : -1,
  }));
  const first = tokens[0];
  if (!first) return null;
  const last = tokens[1] ?? first;
  const startMonth = first.month >= 0 ? first.month : last.month;
  const endMonth = last.month >= 0 ? last.month : startMonth;
  if (startMonth < 0 || endMonth < 0) return null;

  const explicitYear = /\b(20\d{2})\b/.exec(text)?.[1];
  let startYear: number;
  if (explicitYear) {
    startYear = Number(explicitYear) - (endMonth < startMonth ? 1 : 0);
  } else {
    const cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7);
    startYear = now.getUTCFullYear() - 1;
    while (Date.UTC(startYear, startMonth, first.day) < cutoff) startYear++;
  }
  const endYear = endMonth < startMonth ? startYear + 1 : startYear;
  return { startDate: iso(startYear, startMonth, first.day), endDate: iso(endYear, endMonth, last.day) };
}

export function parseListing(html: string, now: Date = new Date()): ListedEvent[] {
  const $ = cheerio.load(html);
  const out: ListedEvent[] = [];
  $("tr.d_list").each((_, tr) => {
    const tds = $(tr).children("td");
    if (tds.length < 3) return;

    const link = tds.eq(1).find("a").first();
    const href = link.attr("href") ?? "";
    const id = /\/e\/(\d+)/.exec(href)?.[1];
    if (!id) return;

    const dateCell = tds.eq(0).clone();
    dateCell.find("br").replaceWith("\n");
    const dates = inferDates(dateCell.text().split("\n")[0] ?? "", now);
    if (!dates) return;

    const titleCell = tds.eq(1).clone();
    titleCell.find("u").remove();
    const category = /\(([^)]+)\)/.exec(titleCell.text())?.[1]?.trim() ?? null;

    const venueCell = tds.eq(2);
    const flag = venueCell.find("img").first().attr("alt");

    out.push({
      externalId: id,
      title: link.text().trim(),
      category,
      ...dates,
      venue: venueCell.text().replace(/\s+/g, " ").trim() || null,
      countryCode: flag ? flag.toUpperCase() : null,
      url: `${BASE}/en/e/${id}`,
    });
  });
  return out;
}

export function parseDetail(html: string, listed: Pick<ListedEvent, "title" | "category">): EventDetail {
  const $ = cheerio.load(html);

  const startTime = /Event_Start_Time\s*=\s*"(\d{2}:\d{2})/.exec(html)?.[1] ?? null;

  const loc = $(".event_location").first();
  let venue = loc.find("b").first().text().replace(/\s+/g, " ").trim() || null;
  const flag = loc.find("img").first();
  const countryCode = flag.attr("alt")?.toUpperCase() ?? null;
  const country = flag.attr("title") ?? null;

  const addrNode = loc.clone();
  addrNode.find("b, a").remove();
  addrNode.find("br").replaceWith(" ");
  let address =
    addrNode
      .text()
      .replace(/[()]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null;

  let place: string | null = null;
  if (venue && /^note:?$/i.test(venue)) {
    place = address?.replace(/\s*the venue has not yet been announced\.?$/i, "").trim() || null;
    venue = null;
    address = null;
  }

  // Description is only read to infer dance styles, it is never stored or displayed.
  const description = $(".markdown").first().text();
  const subtitle = $("#event_subtitle").first().text();

  return {
    startTime,
    venue,
    address,
    place,
    countryCode,
    country,
    styles: classifyStyles(listed.title, subtitle, description),
    genre: classifyGenre(listed.category, listed.title),
  };
}
