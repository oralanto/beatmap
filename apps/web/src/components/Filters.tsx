"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { GENRES, STYLES } from "@beatmap/shared";
import { usePathname, useRouter } from "@/i18n/navigation";
import { countActive, parseFilters } from "@/lib/filters";
import type { Meta } from "@/lib/api";

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-violet-600 ${
    active
      ? "border-violet-600 bg-violet-600 text-white"
      : "border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:bg-violet-50"
  }`;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function Filters({
  meta,
  className = "",
}: {
  meta: Meta | null;
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const filters = parseFilters(searchParams);
  const [q, setQ] = useState(filters.q);
  const [urlQ, setUrlQ] = useState(filters.q);
  if (urlQ !== filters.q) {
    setUrlQ(filters.q);
    setQ(filters.q);
  }

  function update(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(searchParams.toString());
    mutate(p);
    p.delete("limit");
    const qs = p.toString();
    startTransition(() =>
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  useEffect(() => {
    if (q === filters.q) return;
    const id = setTimeout(
      () => update((p) => (q ? p.set("q", q) : p.delete("q"))),
      350,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggle = (key: "genre" | "style", value: string) =>
    update((p) => {
      const cur = new Set((p.get(key) ?? "").split(",").filter(Boolean));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      if (cur.size) p.set(key, [...cur].join(","));
      else p.delete(key);
    });

  const setWhen = (when: string) =>
    update((p) => (when === "all" ? p.delete("when") : p.set("when", when)));

  const whenOptions = [
    { value: "all", label: t("filters.whenOptions.all") },
    { value: "month", label: t("filters.whenOptions.month") },
    { value: "3months", label: t("filters.whenOptions.3months") },
    ...(meta?.years ?? []).map((y) => ({ value: String(y), label: String(y) })),
  ];

  const active = countActive(filters);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("filters.search")}
          aria-label={t("filters.search")}
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      <Section title={t("filters.when")}>
        {whenOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={filters.when === o.value}
            className={chip(filters.when === o.value)}
            onClick={() => setWhen(o.value)}
          >
            {o.label}
          </button>
        ))}
      </Section>

      <Section title={t("filters.genre")}>
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={filters.genres.includes(g)}
            className={chip(filters.genres.includes(g))}
            onClick={() => toggle("genre", g)}
          >
            {t(`genres.${g}`)}
            {meta?.genres[g] ? (
              <span className="ml-1.5 opacity-60">{meta.genres[g]}</span>
            ) : null}
          </button>
        ))}
      </Section>

      <Section title={t("filters.style")}>
        {STYLES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filters.styles.includes(s)}
            className={chip(filters.styles.includes(s))}
            onClick={() => toggle("style", s)}
          >
            {t(`styles.${s}`)}
            {meta?.styles[s] ? (
              <span className="ml-1.5 opacity-60">{meta.styles[s]}</span>
            ) : null}
          </button>
        ))}
      </Section>

      {active > 0 && (
        <button
          type="button"
          onClick={() =>
            update((p) =>
              ["when", "genre", "style", "q"].forEach((k) => p.delete(k)),
            )
          }
          className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:underline"
        >
          <X className="size-4" aria-hidden /> {t("filters.clear")}
        </button>
      )}
    </div>
  );
}
