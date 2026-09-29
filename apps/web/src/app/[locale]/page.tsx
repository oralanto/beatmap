import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { EventCard } from "@/components/EventCard";
import { FilterDrawer } from "@/components/FilterDrawer";
import { Filters } from "@/components/Filters";
import { Link } from "@/i18n/navigation";
import { fetchEvents, fetchMeta } from "@/lib/api";
import { parseFilters, toApiParams, type SearchParams } from "@/lib/filters";

const PAGE_SIZE = 24;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("home");

  const filters = parseFilters(sp);
  const rawLimit = Number(Array.isArray(sp.limit) ? sp.limit[0] : sp.limit);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, PAGE_SIZE), 480) : PAGE_SIZE;

  const query = toApiParams(filters);
  query.set("limit", String(limit));
  const [data, meta] = await Promise.all([fetchEvents(query.toString()), fetchMeta()]);

  const moreParams = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v] as [string, string]] : [])),
  );
  moreParams.set("limit", String(limit + PAGE_SIZE));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 text-base text-zinc-600 sm:text-lg">{t("subtitle")}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5">
            <Suspense>
              <Filters meta={meta} />
            </Suspense>
          </div>
        </aside>

        <section aria-live="polite">
          {data === null ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">{t("error")}</p>
          ) : (
            <>
              <p className="mb-4 text-sm font-medium text-zinc-500">{t("results", { count: data.total })}</p>
              {data.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
                  <p className="text-lg font-semibold">{t("emptyTitle")}</p>
                  <p className="mt-1 text-zinc-600">{t("emptyText")}</p>
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {data.items.map((e) => (
                    <li key={e.id}>
                      <EventCard event={e} />
                    </li>
                  ))}
                </ul>
              )}
              {data.total > data.items.length && (
                <div className="mt-8 text-center">
                  <Link
                    href={`/?${moreParams}`}
                    scroll={false}
                    className="inline-block rounded-full border border-zinc-300 bg-white px-6 py-2.5 font-semibold hover:bg-zinc-50"
                  >
                    {t("showMore")}
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        <Suspense>
          <FilterDrawer meta={meta} resultCount={data?.total} />
        </Suspense>
      </div>
    </main>
  );
}
