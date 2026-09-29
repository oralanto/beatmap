import type { Genre, Style } from "@beatmap/shared";

const RULES: Array<[Style, RegExp]> = [
  ["breaking", /\b(b-?boy|b-?girl|bboy|bgirl|breaking|breakdance|breakdancing|break)\b/i],
  ["popping", /\b(popping|poppin|boogaloo)\b/i],
  ["locking", /\b(locking|lockin)\b/i],
  ["waacking", /\b(waack(?:ing)?|whacking|punking)\b/i],
  ["electro", /\b(electro|electric boogie|electro ?style)\b/i],
  ["house", /\bhouse(?: dance)?\b/i],
  ["krump", /\bkrump(?:ing)?\b/i],
  ["dancehall", /\bdancehall\b/i],
  ["afro", /\bafro(?:beats?|dance|house)?\b/i],
  ["hip-hop", /\bhip[\s-]?hop\b|\bnew ?style\b/i],
  ["all-style", /\ball[\s-]?styles?\b|\bopen[\s-]?styles?\b|\bmulti[\s-]?styles?\b|\bfreestyle session\b/i],
];

const HIP_HOP_ROOTS: Style[] = ["breaking", "krump"];

export function classifyStyles(...texts: Array<string | null | undefined>): Style[] {
  const haystack = texts.filter(Boolean).join(" \n ");
  const found = new Set<Style>();
  for (const [style, re] of RULES) if (re.test(haystack)) found.add(style);
  if (HIP_HOP_ROOTS.some((s) => found.has(s))) found.add("hip-hop");
  if (found.size === 0) found.add("hip-hop");
  return [...found];
}

const WORKSHOP_RE = /\b(work\s?shops?|master\s?class(?:es)?|classes|class|atelier|stage|training|cours)\b/i;
const CONFERENCE_RE = /\b(conferences?|conférences?|talks?|panel|symposium|congress|summit|forum)\b/i;

export function classifyGenre(category: string | null | undefined, title: string): Genre {
  if (WORKSHOP_RE.test(title)) return "workshop";
  if (CONFERENCE_RE.test(title)) return "conference";
  const c = (category ?? "").toLowerCase();
  if (/work\s?shop|master\s?class|class/.test(c)) return "workshop";
  if (/conf|talk|panel/.test(c)) return "conference";
  if (/battle/.test(c)) return "battle";
  if (/festival/.test(c)) return "festival";
  if (/comp/.test(c)) return "competition";
  if (/jam/.test(c)) return "jam";
  if (/show|spectacle|performance/.test(c)) return "show";
  if (/camp/.test(c)) return "camp";
  return "other";
}
