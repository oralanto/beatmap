"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { countActive, parseFilters } from "@/lib/filters";
import type { Meta } from "@/lib/api";
import { Filters } from "./Filters";

/** Mobile filter button + bottom sheet. Hidden on large screens where filters are docked. */
export function FilterDrawer({
  meta,
  resultCount,
  buttonClassName = "",
}: {
  meta: Meta | null;
  resultCount?: number;
  buttonClassName?: string;
}) {
  const t = useTranslations("filters");
  const [open, setOpen] = useState(false);
  const active = countActive(parseFilters(useSearchParams()));

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:hidden ${buttonClassName}`}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        {t("open")}
        {active > 0 && (
          <span className="rounded-full bg-violet-500 px-1.5 text-xs">
            {active}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("title")}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="text-lg font-semibold">{t("title")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-2 hover:bg-zinc-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-4">
              <Filters meta={meta} />
            </div>
            <div className="border-t border-zinc-100 p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white"
              >
                {t("showResults")}
                {resultCount !== undefined ? ` (${resultCount})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
