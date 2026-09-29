"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, { short: string; name: string }> = {
  en: { short: "EN", name: "English (US)" },
  fr: { short: "FR", name: "Français" },
  de: { short: "DE", name: "Deutsch" },
};

export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const current = useLocale();
  const pathname = usePathname();
  const qs = useSearchParams().toString();

  return (
    <div role="group" aria-label={t("language")} className="flex rounded-full border border-zinc-200 bg-white p-0.5 text-xs font-semibold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={qs ? `${pathname}?${qs}` : pathname}
          locale={l}
          hrefLang={l}
          lang={l}
          title={LABELS[l]?.name}
          aria-current={l === current ? "true" : undefined}
          className={`rounded-full px-2.5 py-1.5 transition ${l === current ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          {LABELS[l]?.short}
        </Link>
      ))}
    </div>
  );
}
