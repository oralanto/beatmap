import { List, Map as MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "BeatMap";

export function Header() {
  const t = useTranslations("nav");
  const navClass =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">♪</span>
          <span className="hidden text-lg min-[400px]:inline">{SITE_NAME}</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className={navClass}>
            <List className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("list")}</span>
            <span className="sr-only sm:hidden">{t("list")}</span>
          </Link>
          <Link href="/map" className={navClass}>
            <MapIcon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("map")}</span>
            <span className="sr-only sm:hidden">{t("map")}</span>
          </Link>
        </nav>
        <Suspense>
          <LanguageSwitcher />
        </Suspense>
      </div>
    </header>
  );
}
