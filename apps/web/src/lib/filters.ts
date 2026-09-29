import {
  isGenre,
  isStyle,
  resolveDateRange,
  type Genre,
  type Style,
} from "@beatmap/shared";

export type SearchParams = Record<string, string | string[] | undefined>;

export interface Filters {
  when: string; // "all" | "month" | "3months" | "YYYY"
  genres: Genre[];
  styles: Style[];
  q: string;
}

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;
const csv = (v: string | string[] | undefined) =>
  (first(v) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function parseFilters(sp: SearchParams | URLSearchParams): Filters {
  const get = (k: string) =>
    sp instanceof URLSearchParams ? (sp.get(k) ?? undefined) : sp[k];
  const when = first(get("when")) ?? "all";
  return {
    when: /^(all|month|3months|\d{4})$/.test(when) ? when : "all",
    genres: csv(get("genre")).filter(isGenre),
    styles: csv(get("style")).filter(isStyle),
    q: (first(get("q")) ?? "").slice(0, 100),
  };
}

export function toApiParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.when === "month" || f.when === "3months") {
    const { from, to } = resolveDateRange(f.when);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
  } else if (/^\d{4}$/.test(f.when)) {
    const { from, to } = resolveDateRange("year", Number(f.when));
    if (from) p.set("from", from);
    if (to) p.set("to", to);
  }
  if (f.genres.length) p.set("genre", f.genres.join(","));
  if (f.styles.length) p.set("style", f.styles.join(","));
  if (f.q) p.set("q", f.q);
  return p;
}

export function countActive(f: Filters): number {
  return (
    (f.when !== "all" ? 1 : 0) +
    f.genres.length +
    f.styles.length +
    (f.q ? 1 : 0)
  );
}
