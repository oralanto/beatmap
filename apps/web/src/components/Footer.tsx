import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-zinc-500 sm:px-6">
        {t("text")}
      </div>
    </footer>
  );
}
