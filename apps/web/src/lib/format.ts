import type { Genre } from "@beatmap/shared";

export const INTL_LOCALE: Record<string, string> = { en: "en-US", fr: "fr-FR", de: "de-DE" };

const utc = (d: string) => new Date(`${d}T00:00:00Z`);

export function formatDateRange(start: string, end: string, locale: string): string {
  const loc = INTL_LOCALE[locale] ?? "en-US";
  const showYear = utc(start).getUTCFullYear() !== new Date().getUTCFullYear();
  const base: Intl.DateTimeFormatOptions = { timeZone: "UTC", day: "numeric", month: "short" };
  if (showYear) base.year = "numeric";
  if (start === end) {
    return new Intl.DateTimeFormat(loc, { ...base, weekday: "short" }).format(utc(start));
  }
  return new Intl.DateTimeFormat(loc, base).formatRange(utc(start), utc(end));
}

export function formatLongDate(start: string, end: string, locale: string): string {
  const loc = INTL_LOCALE[locale] ?? "en-US";
  const o: Intl.DateTimeFormatOptions = { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const f = new Intl.DateTimeFormat(loc, o);
  return start === end ? f.format(utc(start)) : f.formatRange(utc(start), utc(end));
}

export function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const GENRE_GRADIENT: Record<Genre, string> = {
  battle: "from-rose-500 to-orange-500",
  show: "from-violet-600 to-fuchsia-500",
  workshop: "from-emerald-500 to-teal-500",
  conference: "from-sky-500 to-indigo-500",
  festival: "from-amber-500 to-pink-500",
  jam: "from-lime-500 to-emerald-500",
  competition: "from-yellow-500 to-orange-600",
  camp: "from-cyan-500 to-blue-500",
  other: "from-slate-500 to-slate-700",
};

export const GENRE_COLOR: Record<Genre, string> = {
  battle: "#f43f5e",
  show: "#8b5cf6",
  workshop: "#10b981",
  conference: "#0ea5e9",
  festival: "#f59e0b",
  jam: "#84cc16",
  competition: "#eab308",
  camp: "#06b6d4",
  other: "#64748b",
};

export function isHappeningNow(start: string, end: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return start <= today && today <= end;
}
