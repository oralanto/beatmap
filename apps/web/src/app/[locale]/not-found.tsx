import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="mt-2 text-zinc-600">{t("text")}</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white">
        {t("home")}
      </Link>
    </main>
  );
}
